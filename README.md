# Personal Shopper Management System

Order, sourcing and fulfillment management for a Bangkok→Malaysia personal
shopping business. Next.js 16 (App Router) · TypeScript · Tailwind 4 · Postgres
via Prisma.

**Phases 1–5 are complete and runnable** (Phase 4 in disconnected mode — no
BSP account yet; Phase 5 AI extraction requires ANTHROPIC_API_KEY). See [Roadmap](#roadmap) for what lands next.

## Getting started

Requires Docker Desktop and Node 20.9+.

```bash
cp .env.example .env      # then put a real value in SESSION_SECRET
npm install
npm run db:up             # starts Postgres on localhost:5433
npm run db:deploy         # applies migrations
npm run db:seed           # demo users, customers, products, orders
npm run dev
```

Open http://localhost:3000 and sign in with any seeded account — all use the
password `password123`:

| Email                          | Role    | Can do                                  |
| ------------------------------ | ------- | --------------------------------------- |
| `admin@personalshopper.test`   | ADMIN   | Everything                              |
| `staff@personalshopper.test`   | STAFF   | Create and edit customers/products/orders |
| `shopper@personalshopper.test` | SHOPPER | Update purchase item status/cost on shopping trips |

Generate a real session secret with `openssl rand -base64 32`.

## Scripts

| Command              | Purpose                                     |
| -------------------- | ------------------------------------------- |
| `npm run dev`        | Dev server (Turbopack)                      |
| `npm run build`      | Production build                            |
| `npm run typecheck`  | `tsc --noEmit`                              |
| `npm run lint`       | ESLint                                      |
| `npm run db:up/down` | Start / stop the Postgres container         |
| `npm run db:migrate` | Create and apply a migration after a schema edit |
| `npm run db:reset`   | Drop, re-migrate and re-seed                |
| `npm run db:studio`  | Prisma Studio                               |

## How it fits together

```
src/
  proxy.ts              Optimistic auth redirect (Next 16 renamed middleware → proxy)
  lib/
    db.ts               Prisma singleton
    session.ts          Signed JWT session cookie (jose)
    dal.ts              getCurrentUser / requireRole — the real authorization gate
    money.ts            Decimal → number conversion + MYR formatting
    order-status.ts     Lifecycle labels, colours and legal transitions
    cargo-allocation.ts Pure function: split a cargo batch's cost across its orders
    storage.ts          Local-disk receipt storage (dev stand-in for S3/R2)
    csv.ts              Hand-rolled RFC 4180 parser/writer for J&T CSV import/export
    validation.ts       Zod schemas shared by every Server Action
    whatsapp/           Provider-agnostic WhatsApp service (see Phase 4 notes below)
    queries/            Read helpers; serialize Decimals before returning
  app/
    api/uploads/        Auth-gated route handler that serves saved receipts
    api/shipping/export/ CSV export of orders ready to book with J&T
    api/whatsapp/webhook/ Inbound message receiver (Meta Cloud API shape)
    actions/            Server Actions (each re-authorizes)
    (app)/              Authenticated shell: dashboard, orders, customers, products,
                         search, purchase-batches, cargo-batches, shipping, reports,
                         inbox, message-templates, settings
    login/
```

Five conventions worth knowing before you edit anything:

**Authorization lives in the DAL, not the layout.** `proxy.ts` only reads the
cookie so it stays fast on prefetches. Every page calls `requireUser()` or
`requireRole()`, and every Server Action calls `authorize()` — because actions
are reachable by direct `POST`, and a layout check would not stop nested
segments from rendering. A user deactivated mid-session loses access on their
next request even though their JWT is still valid.

**Money is `Decimal` in Postgres and `number` in components.** Prisma returns
`Decimal` class instances, which React refuses to send across the
Server/Client boundary. Everything in `lib/queries/` converts before returning,
so components never see a `Decimal`. Add new reads there rather than calling
`db` from a page.

**The client never decides cost or status.** Selling price is editable per line,
but `purchaseCost` is re-read from the catalogue server-side, and status changes
are re-checked against `allowedTransitions()` — the dropdown is only a hint.

**Order numbers come from Postgres.** `PS-000001` is a column default backed by
the `order_number_seq` sequence created in the initial migration, so concurrent
inserts cannot collide. Never set `orderNumber` by hand, and preserve the
hand-written `CREATE SEQUENCE` line if that migration is ever regenerated.

**Bulk moves bypass `allowedTransitions()` on purpose.** Adding orders to a
purchase or cargo batch, closing out a fully-purchased order, and marking a
cargo batch arrived all write `Order.status` directly instead of going through
`changeOrderStatus`. These are system-driven group operations triggered by a
business event (paid → shopping trip started, all items bought → purchased,
cargo landed → arrived), not a user picking one step at a time from a dropdown,
so the one-step adjacency rule doesn't apply to them.

## Roadmap

| Phase | Scope | Status |
| ----- | ----- | ------ |
| 1 | Auth + RBAC, customers, products/variants, orders, timeline, dashboard, search | **Done** |
| 2 | Payments + receipt upload, purchase batches, cargo batches and cost allocation | **Done** |
| 3 | Shipping, J&T CSV export/import, Reports v1 | **Done** |
| 4 | WhatsApp service layer, inbox, templates, automation | **Done, disconnected** |
| 5 | AI-assisted order extraction, advanced reports | **Done, requires API key** |

Phase 4 is fully built and testable end-to-end, but runs against a
`DisconnectedProvider` that logs instead of calling a real API — see
[Phase 4 notes](#phase-4-notes) below for exactly what changes once a BSP
account (360dialog, Wati, Twilio, ...) is onboarded.

Not built in Phase 3: a generic CSV bulk-importer for migrating existing
spreadsheet data into new customers/products/orders. Scoped out deliberately —
it's a materially larger feature (column mapping, dedup, partial-failure
handling) worth doing on its own rather than folding into fulfillment tracking.

Phase 2 notes:
- Receipt uploads land on local disk under `.data/uploads/` (git-ignored) and
  are served through an auth-gated route handler — see `lib/storage.ts` for
  the one place to change when moving to Cloudflare R2 or S3.
- Cargo cost allocation writes back to `Order.cargoFee`/`Order.total`, so the
  order's estimated margin uses the real freight cost once a batch is costed,
  and to `PurchaseItem.actualCost`, so the order's estimated margin switches
  from catalogue cost to the real price paid once every item is bought.

### Phase 4 notes

The whole WhatsApp feature set — inbox, template CRUD, the webhook receiver,
and the automation engine — works today and is covered by the same kind of
end-to-end check used for every other phase. Nothing about it is a stub; the
only missing piece is a real BSP account.

- **`lib/whatsapp/index.ts` picks the provider.** It defaults to
  `DisconnectedProvider`, which logs what it would send and returns success
  instead of calling an API. Onboard a BSP, add
  `lib/whatsapp/providers/<name>.ts` implementing the `WhatsAppProvider`
  interface (`sendText`, `sendTemplate`), and add one case to the switch in
  `index.ts` — no other file changes, because every caller goes through
  `lib/whatsapp/service.ts`, not the provider directly.
- **The webhook handshake and inbound parsing already work against the real
  Meta Cloud API shape** (`entry[].changes[].value.messages[]`), which every
  BSP forwards as-is or close to it — verified by POSTing that shape directly
  at `/api/whatsapp/webhook` in dev. What's missing before going live:
  `X-Hub-Signature-256` HMAC verification of the payload, which needs a real
  app secret that doesn't exist yet. Add it to the `POST` handler before
  pointing a live webhook here.
- **Automation is off by default** (`Setting.automation` = `{whatsappEnabled:
  false, notifyOnStatusChange: false}`), toggled from `/settings` (ADMIN
  only — this is the one control that decides whether real messages go out).
  `notifyOrderStatusChange()` in `lib/whatsapp/automation.ts` is called from
  every place an order's status changes across `orders.ts`, `purchasing.ts`,
  `cargo.ts`, and `shipping.ts`; it never throws, so a notification failure
  can't break the order update that triggered it.
- **Template keys are `status_<status in lowercase>`** (e.g.
  `status_payment_verified`), matched automatically against the order's new
  status. Five are seeded covering PAYMENT_VERIFIED → DELIVERED. A missing or
  inactive template is a silent no-op, not an error — you can enable
  automation before every status has a template.
- **Meta requires an approved template to message a customer outside a
  24-hour window they messaged in first** — this is why automation always
  sends via `sendTemplateMessage()` (template-based), never
  `sendText()` (freeform). Templates created here still need Meta's separate
  approval process once connected to a real account; this app doesn't submit
  them for approval.
- Inbound messages match to a `Customer` by normalized WhatsApp number
  automatically; an unmatched conversation shows a "link to customer" picker
  on its Inbox thread page.

Phase 3 notes:
- The J&T CSV column headers in `app/api/shipping/export/route.ts` are a
  sensible default template, not a verified copy of J&T's live bulk-booking
  portal schema — check the real template before a production upload and
  adjust the `HEADERS` array if it has drifted.
- Import matches rows back to orders by `Order Reference` (the `PS-000001`
  order number), so that column must round-trip unchanged through whatever
  the courier's system does to the export.
- Marking a shipment `DELIVERED` on the Shipping page closes out the order
  (`Order.status → DELIVERED`, `deliveredAt` set) the same way the bulk CSV
  import does for `ARRIVED_MY → SHIPPED` — both are the same
  system-driven-bulk-move pattern described above, applied to a single row.

### Phase 5 notes

Phase 5 adds AI-assisted order extraction and advanced reports:

- **AI extraction (`/orders/new`)** uses Claude 3.5 Sonnet via the Anthropic
  SDK to parse free-form customer messages into structured order data. Set
  `ANTHROPIC_API_KEY` in `.env` to enable; if unset, the feature is disabled
  gracefully. The extraction attempts to match product names fuzzily against
  the catalogue and pre-fill variants (color/size) when mentioned. Unmatched
  items are added as blank lines with extraction notes in the `notes` field for
  manual catalog lookup.
- **Advanced reports** (`/reports`) add three new analytics:
  1. **Order status breakdown** — count of orders by status in the date range
  2. **Category performance** — revenue, cost, margin, and quantity by product
     category
  3. **Revenue over time** — daily time-series chart with hover tooltips showing
     revenue and order count per day
  
  All queries handle `Decimal → number` serialization and exclude
  CANCELLED/REFUNDED orders from revenue calculations.

## Notes

- **Auth is hand-rolled, not NextAuth.** Auth.js v5 is still beta and its
  middleware integration predates the Next 16 `middleware`→`proxy` rename. The
  session logic here follows the official Next 16 auth guide and is confined to
  `lib/session.ts` + `lib/dal.ts`, so swapping in a library later is contained.
- **Prisma is pinned to 6.x.** Prisma 7+ requires Node `^20.19 || ^22.12 || >=24`
  and this machine runs 20.14. Upgrading Node first would let you move up.
- `npm audit` reports a high-severity advisory in `deepmerge-ts`, reached only
  through the Prisma **CLI**. It is not in the application's runtime path.
