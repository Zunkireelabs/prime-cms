# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Headless CMS for Prime Ceramics, built with Next.js 15 (App Router), React 19, Prisma 6, and PostgreSQL. It serves two audiences: an authenticated `/admin` dashboard for content editors, and a JSON REST API under `/api/*` that an external storefront consumes via API key. Styling is Tailwind CSS v4 (via `@tailwindcss/postcss`) plus inline styles using CSS custom properties (`var(--color-*)`).

## Commands

```bash
npm run dev          # Next dev server with Turbopack
npm run build        # Production build
npm run start        # Serve production build
npm run lint         # ESLint (next/core-web-vitals + next/typescript)

npm run db:push      # Push schema to DB without a migration (dev iteration)
npm run db:migrate   # Create + apply a dev migration
npm run db:studio    # Prisma Studio GUI
npm run db:seed      # Seed admin user (tsx prisma/seed.ts)
```

No test framework is configured. There is no single-test command.

After editing `prisma/schema.prisma`, regenerate the client with `npx prisma generate` (or run `db:push`/`db:migrate`, which generate as a side effect).

## Environment

Requires `.env` with: `DATABASE_URL` (PostgreSQL), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `CMS_API_KEY`. See `.env.example`. Note `prisma/migrations` is gitignored, so migrations are not version-controlled here.

## Auth architecture (two parallel mechanisms)

There are two distinct auth paths — know which applies before editing an endpoint:

1. **Session auth (NextAuth v5 / Auth.js, JWT strategy)** — defined in `src/auth.ts` with a Credentials provider (email + bcrypt). The `role` claim is threaded through the `jwt` and `session` callbacks. `src/middleware.ts` guards `/admin/*` and redirects unauthenticated users to `/login`. Admin server components also call `auth()` directly (e.g. `src/app/admin/layout.tsx`).
2. **API auth** — `src/lib/api-auth.ts` `requireApiAuth(req)` accepts **either** a `Bearer <CMS_API_KEY>` header **or** a valid admin session. It returns `null` when authorized or a 401 `NextResponse` when not. The dual path lets the external storefront use the API key while the admin UI reuses its session.

Every `/api/*` data route must start with:
```ts
const denied = await requireApiAuth(req);
if (denied) return denied;
```
Exception: `src/app/api/upload/route.ts` requires a full session (`auth()`), not the API key.

## API route conventions

- Routes live in `src/app/api/<resource>/route.ts` (collection: GET list / POST create) and `src/app/api/<resource>/[id]/route.ts` (GET one / PUT / DELETE). `[id]` params are a `Promise` and must be awaited: `const { id } = await params;`.
- Handlers map `body.field` explicitly into Prisma `data` (no blind spread), normalizing empties to `null`/defaults and arrays to `[]`. Mirror this in both POST and PUT when adding a field.
- **Nested relations are replaced, not patched.** PUT on a product `deleteMany` the existing `GalleryImage` rows then recreates them from the payload. Follow this delete-then-recreate pattern for relation edits.
- Public list endpoints filter soft-hidden rows (`where: { hidden: false }`); the admin pages show all rows including hidden.
- Errors: `console.error(err)` then `NextResponse.json({ error: ... }, { status: 500 })`.

## Admin UI conventions

- Admin pages are **async Server Components** that query Prisma directly (`db.*`) for reads and set `export const dynamic = "force-dynamic"`. They do not fetch the REST API.
- Mutations happen in client form components (e.g. `src/components/admin/ProductForm.tsx`) that `fetch` the `/api/*` routes.
- Shared admin primitives: `PageHeader`, `Table` (and its `Thead/Th/Tbody/Tr/Td/Badge/EmptyState` exports), `Sidebar`, `Header` in `src/components/admin/`.

## Data model

Schema in `prisma/schema.prisma`. Content types: `TileCatalog` → `TileProduct` (with `GalleryImage` children and many-to-many `RoomMockup`), plus standalone `HeroBanner`, `NewsArticle`, `Dealer`, `JobOpening`, `ProjectHighlight`, `Testimonial`. Common conventions across models: `slug`/`catalogId` unique keys, `sortOrder` Int for manual ordering, `hidden`/`active`/`featured` boolean flags. `User.role` defaults to `"editor"` (`"admin"` for the seeded user).

## Uploads

`POST /api/upload` writes files to `public/uploads/<uuid><ext>` and returns `{ url: "/uploads/<file>" }`. The directory is gitignored except `.gitkeep`. Production images are also served from the remote host configured in `next.config.mjs` (`cms-primeceramics.com.np`), which must be listed in `images.remotePatterns` for `next/image`.

## Data migration

`scripts/migrate-from-sanity.ts` is a one-off importer from the legacy Sanity CMS into PostgreSQL (`npx tsx scripts/migrate-from-sanity.ts`). It expects an SSH tunnel to the production DB (see the header comment in the file). Not part of normal development.
