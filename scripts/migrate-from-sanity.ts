/**
 * Migrate all data from Sanity CMS → PostgreSQL (zunkiree-cms)
 * Run with: npx tsx scripts/migrate-from-sanity.ts
 *
 * Downloads all referenced image/PDF assets from Sanity's CDN into public/uploads/
 * and stores relative /uploads/<file> paths in the DB so Sanity can be decommissioned.
 */

import { PrismaClient } from "@prisma/client";
import { writeFile, mkdir, access } from "fs/promises";
import { join, extname } from "path";

const PROJECT_ID = "3jv6o4t6";
const DATASET = "production";
const SANITY_API = `https://${PROJECT_ID}.api.sanity.io/v2021-06-07/data/query/${DATASET}`;

async function sanityQuery<T>(query: string): Promise<T[]> {
  const url = `${SANITY_API}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status} ${res.statusText}`);
  const json = (await res.json()) as { result: T[] };
  return json.result ?? [];
}

const db = new PrismaClient();

const UPLOADS_DIR = join(process.cwd(), "public", "uploads");

// ─── Asset localizer ─────────────────────────────────────────────────────────

// In-memory dedupe within a run
const assetCache = new Map<string, string>();

async function localizeAsset(cdnUrl: string | null | undefined): Promise<string | null> {
  if (!cdnUrl) return null;
  if (assetCache.has(cdnUrl)) return assetCache.get(cdnUrl)!;

  // Derive a deterministic filename from the URL so re-runs skip already-downloaded files.
  // Sanity image CDN URLs end with <hash>-<dims>.<ext>; file URLs end with <hash>.<ext>.
  const urlPath = new URL(cdnUrl).pathname;
  const rawName = urlPath.split("/").pop() ?? "asset";
  // Prefix with "sanity-" to namespace away from in-app uploads.
  const filename = `sanity-${rawName}`;
  const localPath = `/uploads/${filename}`;
  const diskPath = join(UPLOADS_DIR, filename);

  try {
    await access(diskPath); // already exists — skip download
  } catch {
    const res = await fetch(cdnUrl);
    if (!res.ok) {
      console.warn(`  ⚠ Failed to download asset: ${cdnUrl} (${res.status})`);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(diskPath, buffer);
  }

  assetCache.set(cdnUrl, localPath);
  return localPath;
}

// ─── Counters ────────────────────────────────────────────────────────────────

let totalInserted = 0;
let totalSkipped = 0;

function log(msg: string) {
  console.log(`  ${msg}`);
}

// ─── 1. TileCatalog ──────────────────────────────────────────────────────────

async function migrateCatalogs() {
  console.log("\n📦 Migrating catalogs...");

  const rows = await sanityQuery<{
    name: string;
    slug: string;
    catalogId: string;
    size?: string;
    filterValue?: string;
    count?: string;
    types?: string;
    description?: string;
    image?: string;
    pdf?: string;
    featured?: boolean;
    sortOrder?: number;
  }>(`
    *[_type == "tileCatalog"] | order(sortOrder asc, name asc) {
      name,
      "slug": slug.current,
      catalogId,
      size,
      filterValue,
      count,
      types,
      description,
      "image": coverImage.asset->url,
      "pdf": catalogPdf.asset->url,
      featured,
      sortOrder
    }
  `);

  log(`Fetched ${rows.length} catalogs from Sanity`);

  for (const row of rows) {
    if (!row.catalogId || !row.slug) {
      log(`⚠ Skipping catalog without catalogId/slug: ${row.name}`);
      totalSkipped++;
      continue;
    }

    const coverImage = await localizeAsset(row.image);
    const catalogPdf = await localizeAsset(row.pdf);

    await db.tileCatalog.upsert({
      where: { catalogId: row.catalogId },
      update: {
        name: row.name,
        slug: row.slug,
        size: row.size ?? null,
        filterValue: row.filterValue ?? null,
        count: row.count ?? null,
        types: row.types ?? null,
        description: row.description ?? null,
        coverImage,
        catalogPdf,
        featured: row.featured ?? false,
        sortOrder: row.sortOrder ?? 50,
      },
      create: {
        name: row.name,
        slug: row.slug,
        catalogId: row.catalogId,
        size: row.size ?? null,
        filterValue: row.filterValue ?? null,
        count: row.count ?? null,
        types: row.types ?? null,
        description: row.description ?? null,
        coverImage,
        catalogPdf,
        featured: row.featured ?? false,
        sortOrder: row.sortOrder ?? 50,
      },
    });
    log(`✓ ${row.name} (${row.catalogId})`);
    totalInserted++;
  }
}

// ─── 2. TileProduct + GalleryImage ───────────────────────────────────────────

async function migrateProducts() {
  console.log("\n🧱 Migrating products...");

  const catalogs = await db.tileCatalog.findMany({ select: { id: true, catalogId: true } });
  const catalogMap = new Map(catalogs.map((c) => [c.catalogId, c.id]));

  const rows = await sanityQuery<{
    name: string;
    slug: string;
    catalog: string;
    category: string;
    series: string;
    collection?: string;
    size: string;
    finish: string;
    application: string;
    panelLayout?: { cols?: number; rows?: number; orientation?: string } | null;
    spaces?: string[];
    hasMatchingFloor?: string;
    variants?: string[];
    image?: string;
    imageAlt?: string;
    imageRotation?: number;
    hasGallery?: boolean;
    gallery?: { url?: string; label?: string; caption?: string }[];
    showFirst?: string;
    sortOrder?: number;
    hidden?: boolean;
  }>(`
    *[_type == "tileProduct"] | order(sortOrder asc, name asc) {
      name,
      "slug": slug.current,
      "catalog": catalog->catalogId,
      category,
      series,
      collection,
      size,
      finish,
      application,
      panelLayout,
      spaces,
      hasMatchingFloor,
      variants,
      "image": image.asset->url,
      "imageAlt": image.alt,
      imageRotation,
      hasGallery,
      "gallery": gallery[]{ "url": image.asset->url, label, caption },
      showFirst,
      sortOrder,
      hidden
    }
  `);

  log(`Fetched ${rows.length} products from Sanity`);

  for (const row of rows) {
    if (!row.slug) {
      log(`⚠ Skipping product without slug: ${row.name}`);
      totalSkipped++;
      continue;
    }

    const catalogDbId = catalogMap.get(row.catalog);
    if (!catalogDbId) {
      log(`⚠ Skipping ${row.name} — catalog "${row.catalog}" not found in DB`);
      totalSkipped++;
      continue;
    }

    const image = await localizeAsset(row.image);
    const galleryItems = (row.gallery ?? []).filter((g) => g.url);
    const galleryLocal = await Promise.all(
      galleryItems.map(async (g) => ({ ...g, localUrl: await localizeAsset(g.url) }))
    );

    const product = await db.tileProduct.upsert({
      where: { slug: row.slug },
      update: {
        name: row.name,
        catalogId: catalogDbId,
        category: row.category,
        series: row.series,
        collection: row.collection ?? null,
        size: row.size,
        finish: row.finish,
        application: row.application,
        panelLayout: row.panelLayout ?? undefined,
        spaces: row.spaces ?? [],
        hasMatchingFloor: row.hasMatchingFloor ?? null,
        variants: row.variants ?? [],
        image,
        imageAlt: row.imageAlt ?? null,
        imageRotation: row.imageRotation ?? 0,
        hasGallery: row.hasGallery ?? false,
        showFirst: row.showFirst ?? "product",
        sortOrder: row.sortOrder ?? 100,
        hidden: row.hidden ?? false,
      },
      create: {
        name: row.name,
        slug: row.slug,
        catalogId: catalogDbId,
        category: row.category,
        series: row.series,
        collection: row.collection ?? null,
        size: row.size,
        finish: row.finish,
        application: row.application,
        panelLayout: row.panelLayout ?? undefined,
        spaces: row.spaces ?? [],
        hasMatchingFloor: row.hasMatchingFloor ?? null,
        variants: row.variants ?? [],
        image,
        imageAlt: row.imageAlt ?? null,
        imageRotation: row.imageRotation ?? 0,
        hasGallery: row.hasGallery ?? false,
        showFirst: row.showFirst ?? "product",
        sortOrder: row.sortOrder ?? 100,
        hidden: row.hidden ?? false,
      },
    });

    if (galleryLocal.length > 0) {
      await db.galleryImage.deleteMany({ where: { productId: product.id } });
      await db.galleryImage.createMany({
        data: galleryLocal
          .filter((g) => g.localUrl)
          .map((g, i) => ({
            productId: product.id,
            image: g.localUrl!,
            label: g.label ?? "mockup",
            caption: g.caption ?? null,
            sortOrder: i,
          })),
      });
    }

    log(`✓ ${row.name} (${row.slug})`);
    totalInserted++;
  }
}

// ─── 3. HeroBanner ───────────────────────────────────────────────────────────

async function migrateHeroBanners() {
  console.log("\n🖼  Migrating hero banners...");

  const rows = await sanityQuery<{
    title: string;
    tagline?: string;
    image?: string;
    collection?: string;
    cta?: string;
    sortOrder?: number;
    active?: boolean;
  }>(`
    *[_type == "heroBanner"] | order(sortOrder asc) {
      title,
      tagline,
      "image": image.asset->url,
      collection,
      cta,
      sortOrder,
      active
    }
  `);

  log(`Fetched ${rows.length} hero banners from Sanity`);

  await db.heroBanner.deleteMany();

  for (const row of rows) {
    const image = await localizeAsset(row.image);
    await db.heroBanner.create({
      data: {
        title: row.title,
        tagline: row.tagline ?? null,
        image,
        collection: row.collection ?? null,
        cta: row.cta ?? "Discover More",
        sortOrder: row.sortOrder ?? 100,
        active: row.active ?? true,
      },
    });
    log(`✓ ${row.title}${!image ? " (no image)" : ""}`);
    totalInserted++;
  }
}

// ─── 4. NewsArticle ──────────────────────────────────────────────────────────

async function migrateNews() {
  console.log("\n📰 Migrating news articles...");

  const rows = await sanityQuery<{
    title: string;
    source: string;
    date: string;
    url: string;
    summary: string;
    image?: string;
    imageFit?: string;
    imagePosition?: string;
    featured?: boolean;
  }>(`
    *[_type == "newsArticle"] | order(date desc) {
      title,
      source,
      date,
      url,
      summary,
      "image": image.asset->url,
      imageFit,
      imagePosition,
      featured
    }
  `);

  log(`Fetched ${rows.length} news articles from Sanity`);

  await db.newsArticle.deleteMany();

  for (const row of rows) {
    const image = await localizeAsset(row.image);
    await db.newsArticle.create({
      data: {
        title: row.title,
        source: row.source,
        date: new Date(row.date),
        url: row.url,
        summary: row.summary,
        image,
        imageFit: row.imageFit ?? "cover",
        imagePosition: row.imagePosition ?? null,
        featured: row.featured ?? false,
      },
    });
    log(`✓ ${row.title}`);
    totalInserted++;
  }
}

// ─── 5. Dealers ──────────────────────────────────────────────────────────────

async function migrateDealers() {
  console.log("\n🏪 Migrating dealers...");

  const rows = await sanityQuery<{
    name: string;
    city: string;
    province: string;
    address?: string;
    phone?: string;
    contactPerson?: string;
  }>(`
    *[_type == "dealer"] | order(province asc, name asc) {
      name,
      city,
      province,
      address,
      phone,
      contactPerson
    }
  `);

  log(`Fetched ${rows.length} dealers from Sanity`);

  await db.dealer.deleteMany();

  for (const row of rows) {
    await db.dealer.create({
      data: {
        name: row.name,
        city: row.city,
        province: row.province,
        address: row.address ?? null,
        phone: row.phone ?? null,
        contactPerson: row.contactPerson ?? null,
      },
    });
    totalInserted++;
  }
  log(`✓ ${rows.length} dealers inserted`);
}

// ─── 6. JobOpenings ──────────────────────────────────────────────────────────

async function migrateJobs() {
  console.log("\n💼 Migrating job openings...");

  const rows = await sanityQuery<{
    title: string;
    team: string;
    location: string;
    type: string;
    summary: string;
    applyUrl?: string;
    active?: boolean;
  }>(`
    *[_type == "jobOpening"] | order(title asc) {
      title,
      team,
      location,
      type,
      summary,
      applyUrl,
      active
    }
  `);

  log(`Fetched ${rows.length} job openings from Sanity`);

  await db.jobOpening.deleteMany();

  for (const row of rows) {
    await db.jobOpening.create({
      data: {
        title: row.title,
        team: row.team,
        location: row.location,
        type: row.type,
        summary: row.summary,
        applyUrl: row.applyUrl ?? null,
        active: row.active ?? true,
      },
    });
    log(`✓ ${row.title}`);
    totalInserted++;
  }
}

// ─── 7. ProjectHighlights ────────────────────────────────────────────────────

async function migrateProjects() {
  console.log("\n🏗  Migrating project highlights...");

  const rows = await sanityQuery<{
    title: string;
    location?: string;
    type?: string;
    tile?: string;
    size?: string;
    area?: string;
    image?: string;
    sortOrder?: number;
  }>(`
    *[_type == "projectHighlight"] | order(sortOrder asc) {
      title,
      location,
      type,
      tile,
      size,
      area,
      "image": image.asset->url,
      sortOrder
    }
  `);

  log(`Fetched ${rows.length} project highlights from Sanity`);

  await db.projectHighlight.deleteMany();

  for (const row of rows) {
    const image = await localizeAsset(row.image);
    await db.projectHighlight.create({
      data: {
        title: row.title,
        location: row.location ?? null,
        type: row.type ?? null,
        tile: row.tile ?? null,
        size: row.size ?? null,
        area: row.area ?? null,
        image,
        sortOrder: row.sortOrder ?? 100,
      },
    });
    log(`✓ ${row.title}${!image ? " (no image)" : ""}`);
    totalInserted++;
  }
}

// ─── 8. Testimonials ─────────────────────────────────────────────────────────

async function migrateTestimonials() {
  console.log("\n💬 Migrating testimonials...");

  const rows = await sanityQuery<{
    quote: string;
    author: string;
    role?: string;
    project?: string;
    image?: string;
  }>(`
    *[_type == "testimonial"] {
      quote,
      author,
      role,
      project,
      "image": image.asset->url
    }
  `);

  log(`Fetched ${rows.length} testimonials from Sanity`);

  await db.testimonial.deleteMany();

  for (const row of rows) {
    const image = await localizeAsset(row.image);
    await db.testimonial.create({
      data: {
        quote: row.quote,
        author: row.author,
        role: row.role ?? null,
        project: row.project ?? null,
        image,
      },
    });
    log(`✓ ${row.author}`);
    totalInserted++;
  }
}

// ─── 9. RoomMockups ──────────────────────────────────────────────────────────

async function migrateRoomMockups() {
  console.log("\n🛋  Migrating room mockups...");

  const products = await db.tileProduct.findMany({ select: { id: true, slug: true } });
  const productSlugMap = new Map(products.map((p) => [p.slug, p.id]));

  const rows = await sanityQuery<{
    title: string;
    slug: string;
    roomType?: string;
    image?: string;
    imageAlt?: string;
    description?: string;
    sortOrder?: number;
    hidden?: boolean;
    featuredProducts?: string[];
  }>(`
    *[_type == "roomMockup"] | order(sortOrder asc) {
      title,
      "slug": slug.current,
      roomType,
      "image": image.asset->url,
      "imageAlt": image.alt,
      description,
      sortOrder,
      hidden,
      "featuredProducts": featuredProducts[]->slug.current
    }
  `);

  log(`Fetched ${rows.length} room mockups from Sanity`);

  await db.roomMockup.deleteMany();

  for (const row of rows) {
    if (!row.slug || !row.image) {
      log(`⚠ Skipping room mockup without slug/image: ${row.title}`);
      totalSkipped++;
      continue;
    }

    const image = await localizeAsset(row.image);
    if (!image) {
      log(`⚠ Skipping room mockup — failed to download image: ${row.title}`);
      totalSkipped++;
      continue;
    }

    const productIds = (row.featuredProducts ?? [])
      .map((slug) => productSlugMap.get(slug))
      .filter(Boolean) as string[];

    await db.roomMockup.create({
      data: {
        title: row.title,
        slug: row.slug,
        roomType: row.roomType ?? null,
        image,
        imageAlt: row.imageAlt ?? null,
        description: row.description ?? null,
        sortOrder: row.sortOrder ?? 100,
        hidden: row.hidden ?? false,
        featuredProducts: productIds.length > 0
          ? { connect: productIds.map((id) => ({ id })) }
          : undefined,
      },
    });
    log(`✓ ${row.title}${productIds.length > 0 ? ` (${productIds.length} products linked)` : ""}`);
    totalInserted++;
  }
}

// ─── 10. ProjectTestimonials ─────────────────────────────────────────────────

async function migrateProjectTestimonials() {
  console.log("\n🏆 Migrating project testimonials...");

  const rows = await sanityQuery<{
    project: string;
    location?: string;
    type?: string;
    tile?: string;
    size?: string;
    area?: string;
    sortOrder?: number;
  }>(`
    *[_type == "projectTestimonial"] | order(sortOrder asc, project asc) {
      project,
      location,
      type,
      tile,
      size,
      area,
      sortOrder
    }
  `);

  log(`Fetched ${rows.length} project testimonials from Sanity`);

  await db.projectTestimonial.deleteMany();

  for (const row of rows) {
    await db.projectTestimonial.create({
      data: {
        project: row.project,
        location: row.location ?? null,
        type: row.type ?? null,
        tile: row.tile ?? null,
        size: row.size ?? null,
        area: row.area ?? null,
        sortOrder: row.sortOrder ?? 100,
      },
    });
    log(`✓ ${row.project}`);
    totalInserted++;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Starting Sanity → PostgreSQL migration (with asset localization)");
  console.log(`   Sanity project: ${PROJECT_ID} / ${DATASET}`);
  console.log(`   Database: ${process.env.DATABASE_URL?.split("@")[1] ?? "unknown"}`);
  console.log(`   Assets: ${UPLOADS_DIR}`);

  await mkdir(UPLOADS_DIR, { recursive: true });

  try {
    await migrateCatalogs();
    await migrateProducts();
    await migrateHeroBanners();
    await migrateNews();
    await migrateDealers();
    await migrateJobs();
    await migrateProjects();
    await migrateTestimonials();
    await migrateRoomMockups();
    await migrateProjectTestimonials();

    console.log("\n✅ Migration complete!");
    console.log(`   Inserted/updated: ${totalInserted}`);
    console.log(`   Skipped:          ${totalSkipped}`);
    console.log(`   Assets cached:    ${assetCache.size}`);
  } catch (err) {
    console.error("\n❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
