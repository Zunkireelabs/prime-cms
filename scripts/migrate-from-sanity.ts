/**
 * Migrate all data from Sanity CMS → PostgreSQL (zunkiree-cms)
 * Run with: npx tsx scripts/migrate-from-sanity.ts
 * Uses SSH tunnel: ssh -f -N -L 5433:127.0.0.1:5432 primeceramics@27.111.18.110
 */

import { PrismaClient } from "@prisma/client";

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

// ─── Counters ───────────────────────────────────────────────────────────────

let totalInserted = 0;
let totalSkipped = 0;

function log(msg: string) {
  console.log(`  ${msg}`);
}

// ─── 1. TileCatalog ─────────────────────────────────────────────────────────

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
        coverImage: row.image ?? null,
        catalogPdf: row.pdf ?? null,
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
        coverImage: row.image ?? null,
        catalogPdf: row.pdf ?? null,
        featured: row.featured ?? false,
        sortOrder: row.sortOrder ?? 50,
      },
    });
    log(`✓ ${row.name} (${row.catalogId})`);
    totalInserted++;
  }
}

// ─── 2. TileProduct + GalleryImage ──────────────────────────────────────────

async function migrateProducts() {
  console.log("\n🧱 Migrating products...");

  // Build catalogId → DB id map
  const catalogs = await db.tileCatalog.findMany({ select: { id: true, catalogId: true } });
  const catalogMap = new Map(catalogs.map((c) => [c.catalogId, c.id]));

  const rows = await sanityQuery<{
    name: string;
    slug: string;
    catalog: string; // catalogId string from GROQ
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

    const galleryItems = (row.gallery ?? []).filter((g) => g.url);

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
        image: row.image ?? null,
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
        image: row.image ?? null,
        imageAlt: row.imageAlt ?? null,
        imageRotation: row.imageRotation ?? 0,
        hasGallery: row.hasGallery ?? false,
        showFirst: row.showFirst ?? "product",
        sortOrder: row.sortOrder ?? 100,
        hidden: row.hidden ?? false,
      },
    });

    // Sync gallery images: delete existing, re-insert
    if (galleryItems.length > 0) {
      await db.galleryImage.deleteMany({ where: { productId: product.id } });
      await db.galleryImage.createMany({
        data: galleryItems.map((g, i) => ({
          productId: product.id,
          image: g.url!,
          label: g.label ?? "mockup",
          caption: g.caption ?? null,
          sortOrder: i,
        })),
      });
    }

    log(`✓ ${row.name} (${row.slug})${galleryItems.length > 0 ? ` +${galleryItems.length} gallery` : ""}`);
    totalInserted++;
  }
}

// ─── 3. HeroBanner ──────────────────────────────────────────────────────────

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

  // Clear and re-insert (no unique key other than title)
  await db.heroBanner.deleteMany();

  for (const row of rows) {
    if (!row.image) {
      log(`⚠ Skipping banner without image: ${row.title}`);
      totalSkipped++;
      continue;
    }
    await db.heroBanner.create({
      data: {
        title: row.title,
        tagline: row.tagline ?? null,
        image: row.image,
        collection: row.collection ?? null,
        cta: row.cta ?? "Discover More",
        sortOrder: row.sortOrder ?? 100,
        active: row.active ?? true,
      },
    });
    log(`✓ ${row.title}`);
    totalInserted++;
  }
}

// ─── 4. NewsArticle ─────────────────────────────────────────────────────────

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
    await db.newsArticle.create({
      data: {
        title: row.title,
        source: row.source,
        date: new Date(row.date),
        url: row.url,
        summary: row.summary,
        image: row.image ?? null,
        imageFit: row.imageFit ?? "cover",
        imagePosition: row.imagePosition ?? null,
        featured: row.featured ?? false,
      },
    });
    log(`✓ ${row.title}`);
    totalInserted++;
  }
}

// ─── 5. Dealers ─────────────────────────────────────────────────────────────

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

// ─── 6. JobOpenings ─────────────────────────────────────────────────────────

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

// ─── 7. ProjectHighlights ───────────────────────────────────────────────────

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
    if (!row.image) {
      log(`⚠ Skipping project without image: ${row.title}`);
      totalSkipped++;
      continue;
    }
    await db.projectHighlight.create({
      data: {
        title: row.title,
        location: row.location ?? null,
        type: row.type ?? null,
        tile: row.tile ?? null,
        size: row.size ?? null,
        area: row.area ?? null,
        image: row.image,
        sortOrder: row.sortOrder ?? 100,
      },
    });
    log(`✓ ${row.title}`);
    totalInserted++;
  }
}

// ─── 8. Testimonials ────────────────────────────────────────────────────────

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
    await db.testimonial.create({
      data: {
        quote: row.quote,
        author: row.author,
        role: row.role ?? null,
        project: row.project ?? null,
        image: row.image ?? null,
      },
    });
    log(`✓ ${row.author}`);
    totalInserted++;
  }
}

// ─── 9. RoomMockups ─────────────────────────────────────────────────────────

async function migrateRoomMockups() {
  console.log("\n🛋  Migrating room mockups...");

  // Build slug → DB id map for products
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
    featuredProducts?: string[]; // slugs
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

    const productIds = (row.featuredProducts ?? [])
      .map((slug) => productSlugMap.get(slug))
      .filter(Boolean) as string[];

    await db.roomMockup.create({
      data: {
        title: row.title,
        slug: row.slug,
        roomType: row.roomType ?? null,
        image: row.image,
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

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Starting Sanity → PostgreSQL migration");
  console.log(`   Sanity project: ${PROJECT_ID} / ${DATASET}`);
  console.log(`   Database: ${process.env.DATABASE_URL?.split("@")[1] ?? "unknown"}`);

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

    console.log("\n✅ Migration complete!");
    console.log(`   Inserted/updated: ${totalInserted}`);
    console.log(`   Skipped:          ${totalSkipped}`);
  } catch (err) {
    console.error("\n❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
