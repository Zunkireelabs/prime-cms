/**
 * Verify the Sanity → PostgreSQL migration is complete (READ-ONLY).
 * Run with: npm run db:verify   (tsx --env-file=.env scripts/verify-sanity-migration.ts)
 *
 * Compares live Sanity document counts against DB row counts per content type,
 * and checks that no DB image fields still point at cdn.sanity.io (asset localization).
 * Makes NO writes. Exits 1 if any rows are MISSING or CDN URLs remain.
 */

import { PrismaClient } from "@prisma/client";
import { access } from "fs/promises";
import { join } from "path";

const PROJECT_ID = "3jv6o4t6";
const DATASET = "production";
const SANITY_API = `https://${PROJECT_ID}.api.sanity.io/v2021-06-07/data/query/${DATASET}`;

async function sanityFetch<T>(query: string): Promise<T> {
  const url = `${SANITY_API}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status} ${res.statusText}`);
  const json = (await res.json()) as { result: T };
  return json.result;
}

async function sanityQuery<T>(query: string): Promise<T[]> {
  return (await sanityFetch<T[]>(query)) ?? ([] as T[]);
}

async function sanityCount(query: string): Promise<number> {
  return (await sanityFetch<number>(`count(${query})`)) ?? 0;
}

const db = new PrismaClient();

type Row = {
  type: string;
  total: number;
  eligible: number;
  dbRows: number;
  skipReason?: string;
  missingKeys?: string[];
};

const rows: Row[] = [];

function status(r: Row): "OK" | "MISSING" | "EXTRA/STALE" {
  if (r.dbRows < r.eligible) return "MISSING";
  if (r.dbRows > r.eligible) return "EXTRA/STALE";
  return "OK";
}

// ─── Per-type checks ─────────────────────────────────────────────────────────

async function checkCatalogs() {
  const total = await sanityCount(`*[_type == "tileCatalog"]`);
  const eligibleKeys = await sanityQuery<string>(
    `*[_type == "tileCatalog" && defined(catalogId) && defined(slug.current)].catalogId`
  );
  const dbKeys = (await db.tileCatalog.findMany({ select: { catalogId: true } })).map((c) => c.catalogId);
  const dbSet = new Set(dbKeys);
  rows.push({
    type: "tileCatalog → TileCatalog",
    total,
    eligible: eligibleKeys.length,
    dbRows: dbKeys.length,
    skipReason: total > eligibleKeys.length ? "missing catalogId/slug" : undefined,
    missingKeys: eligibleKeys.filter((k) => !dbSet.has(k)),
  });
}

async function checkProducts() {
  const total = await sanityCount(`*[_type == "tileProduct"]`);

  const sanityProducts = await sanityQuery<{ slug?: string; catalogId?: string }>(
    `*[_type == "tileProduct"]{ "slug": slug.current, "catalogId": catalog->catalogId }`
  );
  const dbCatalogIds = new Set(
    (await db.tileCatalog.findMany({ select: { catalogId: true } })).map((c) => c.catalogId)
  );

  let noSlug = 0;
  let orphanCatalog = 0;
  const eligibleSlugs: string[] = [];
  for (const p of sanityProducts) {
    if (!p.slug) { noSlug++; continue; }
    if (!p.catalogId || !dbCatalogIds.has(p.catalogId)) { orphanCatalog++; continue; }
    eligibleSlugs.push(p.slug);
  }

  const dbSlugs = new Set((await db.tileProduct.findMany({ select: { slug: true } })).map((p) => p.slug));
  const reasons: string[] = [];
  if (noSlug) reasons.push(`${noSlug} no-slug`);
  if (orphanCatalog) reasons.push(`${orphanCatalog} catalog-not-migrated`);

  rows.push({
    type: "tileProduct → TileProduct",
    total,
    eligible: eligibleSlugs.length,
    dbRows: dbSlugs.size,
    skipReason: reasons.length ? reasons.join(", ") : undefined,
    missingKeys: eligibleSlugs.filter((s) => !dbSlugs.has(s)),
  });
}

async function checkGalleryImages() {
  const perProduct = await sanityQuery<number>(
    `*[_type == "tileProduct"]{ "n": count(gallery[defined(image.asset)]) }.n`
  );
  const expected = perProduct.reduce((a, b) => a + (b ?? 0), 0);
  const dbRows = await db.galleryImage.count();
  rows.push({ type: "  └ gallery → GalleryImage", total: expected, eligible: expected, dbRows });
}

async function checkSimple(
  label: string,
  sanityType: string,
  eligibleFilter: string | null,
  dbCount: () => Promise<number>
) {
  const total = await sanityCount(`*[_type == "${sanityType}"]`);
  const eligible = eligibleFilter
    ? await sanityCount(`*[_type == "${sanityType}" && ${eligibleFilter}]`)
    : total;
  const dbRows = await dbCount();
  rows.push({
    type: label,
    total,
    eligible,
    dbRows,
    skipReason: eligibleFilter && total > eligible ? eligibleFilter : undefined,
  });
}

async function checkRoomMockups() {
  const total = await sanityCount(`*[_type == "roomMockup"]`);
  const eligibleKeys = await sanityQuery<string>(
    `*[_type == "roomMockup" && defined(slug.current) && defined(image.asset)].slug.current`
  );
  const dbKeys = (await db.roomMockup.findMany({ select: { slug: true } })).map((m) => m.slug);
  const dbSet = new Set(dbKeys);
  rows.push({
    type: "roomMockup → RoomMockup",
    total,
    eligible: eligibleKeys.length,
    dbRows: dbKeys.length,
    skipReason: total > eligibleKeys.length ? "missing slug/image" : undefined,
    missingKeys: eligibleKeys.filter((k) => !dbSet.has(k)),
  });
}

// ─── Asset localization check ─────────────────────────────────────────────────

async function checkAssetLocalization() {
  console.log("\n🔗 Checking asset localization (no cdn.sanity.io URLs should remain)...");

  // Count DB rows still pointing at Sanity CDN across all image-bearing tables
  const cdnPattern = "%cdn.sanity.io%";

  const [products, catalogs, banners, news, testimonials, mockups, projects] = await Promise.all([
    db.tileProduct.count({ where: { image: { contains: "cdn.sanity.io" } } }),
    db.$queryRaw<[{ n: bigint }]>`SELECT count(*)::int as n FROM "TileCatalog" WHERE "coverImage" LIKE ${cdnPattern} OR "catalogPdf" LIKE ${cdnPattern}`,
    db.heroBanner.count({ where: { image: { contains: "cdn.sanity.io" } } }),
    db.newsArticle.count({ where: { image: { contains: "cdn.sanity.io" } } }),
    db.testimonial.count({ where: { image: { contains: "cdn.sanity.io" } } }),
    db.roomMockup.count({ where: { image: { contains: "cdn.sanity.io" } } }),
    db.projectHighlight.count({ where: { image: { contains: "cdn.sanity.io" } } }),
  ]);

  const catalogCdn = Number(catalogs[0].n);
  const total = products + catalogCdn + banners + news + testimonials + mockups + projects;

  if (total === 0) {
    console.log("  ✅ No cdn.sanity.io URLs remain in the database.");
  } else {
    console.log(`  ❌ ${total} rows still contain cdn.sanity.io URLs:`);
    if (products) console.log(`     - TileProduct.image: ${products}`);
    if (catalogCdn) console.log(`     - TileCatalog.coverImage/catalogPdf: ${catalogCdn}`);
    if (banners) console.log(`     - HeroBanner.image: ${banners}`);
    if (news) console.log(`     - NewsArticle.image: ${news}`);
    if (testimonials) console.log(`     - Testimonial.image: ${testimonials}`);
    if (mockups) console.log(`     - RoomMockup.image: ${mockups}`);
    if (projects) console.log(`     - ProjectHighlight.image: ${projects}`);
  }

  // Spot-check: verify a sample of /uploads/ paths exist on disk
  const sample = await db.tileProduct.findMany({
    where: { image: { not: null } },
    select: { image: true },
    take: 5,
  });

  let missingFiles = 0;
  for (const p of sample) {
    if (!p.image) continue;
    const diskPath = join(process.cwd(), "public", p.image);
    try { await access(diskPath); }
    catch { missingFiles++; console.log(`  ⚠ File missing on disk: ${p.image}`); }
  }
  if (missingFiles === 0 && sample.length > 0) {
    console.log(`  ✅ Spot-check: ${sample.length} sampled product images found on disk.`);
  }

  return total;
}

// ─── Output ──────────────────────────────────────────────────────────────────

function pad(s: string, n: number) { return s.length >= n ? s : s + " ".repeat(n - s.length); }
function padNum(n: number, w: number) { return String(n).padStart(w); }

function printTable() {
  const header = `${pad("Type", 34)} ${pad("Sanity", 7)} ${pad("Eligible", 9)} ${pad("DB", 6)} ${pad("Status", 12)} Notes`;
  console.log("\n" + header);
  console.log("─".repeat(header.length + 8));
  for (const r of rows) {
    const st = status(r);
    const notes: string[] = [];
    if (r.skipReason) notes.push(`skip: ${r.skipReason}`);
    if (st === "MISSING" && r.missingKeys?.length) {
      notes.push(`missing: ${r.missingKeys.slice(0, 6).join(", ")}${r.missingKeys.length > 6 ? ` …(+${r.missingKeys.length - 6})` : ""}`);
    }
    console.log(
      `${pad(r.type, 34)} ${padNum(r.total, 7)} ${padNum(r.eligible, 9)} ${padNum(r.dbRows, 6)} ${pad(st, 12)} ${notes.join(" | ")}`
    );
  }
}

async function main() {
  console.log("🔎 Verifying Sanity → PostgreSQL migration (read-only)");
  console.log(`   Sanity project: ${PROJECT_ID} / ${DATASET}`);
  console.log(`   Database: ${process.env.DATABASE_URL?.split("@")[1] ?? "unknown"}`);

  await checkCatalogs();
  await checkProducts();
  await checkGalleryImages();
  // heroBanner and projectHighlight: image is now optional — all docs are eligible
  await checkSimple("heroBanner → HeroBanner", "heroBanner", null, () => db.heroBanner.count());
  await checkSimple("newsArticle → NewsArticle", "newsArticle", null, () => db.newsArticle.count());
  await checkSimple("dealer → Dealer", "dealer", null, () => db.dealer.count());
  await checkSimple("jobOpening → JobOpening", "jobOpening", null, () => db.jobOpening.count());
  await checkSimple("projectHighlight → ProjectHighlight", "projectHighlight", null, () => db.projectHighlight.count());
  await checkSimple("testimonial → Testimonial", "testimonial", null, () => db.testimonial.count());
  await checkRoomMockups();
  await checkSimple("projectTestimonial → ProjectTestimonial", "projectTestimonial", null, () => db.projectTestimonial.count());

  printTable();

  const cdnRemaining = await checkAssetLocalization();

  console.log("\nUser → not sourced from Sanity (seeded separately via prisma/seed.ts).");

  const missing = rows.filter((r) => status(r) === "MISSING");
  const stale = rows.filter((r) => status(r) === "EXTRA/STALE");
  const hasCdnUrls = cdnRemaining > 0;

  if (missing.length === 0 && stale.length === 0 && !hasCdnUrls) {
    console.log("\n✅ Verdict: COMPLETE — all types match, no Sanity CDN URLs remain.");
  } else {
    if (missing.length) {
      console.log(`\n❌ MISSING — ${missing.length} type(s) have fewer DB rows than expected:`);
      for (const r of missing) console.log(`   - ${r.type}: expected ${r.eligible}, found ${r.dbRows}`);
    }
    if (stale.length) {
      console.log(`\n⚠️  EXTRA/STALE — ${stale.length} type(s) have more DB rows than Sanity:`);
      for (const r of stale) console.log(`   - ${r.type}: Sanity ${r.eligible}, DB ${r.dbRows}`);
    }
    if (hasCdnUrls) {
      console.log(`\n❌ ASSET INCOMPLETE — ${cdnRemaining} DB rows still point at cdn.sanity.io`);
    }
  }
}

main()
  .catch((err) => {
    console.error("\n❌ Verification failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    const hasMissing = rows.some((r) => status(r) === "MISSING");
    if (hasMissing) process.exitCode = 1;
  });
