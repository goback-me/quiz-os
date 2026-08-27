# Quiz OS

Multi-tenant quiz/lead-form platform. One deploy, unlimited clients. Each client's quiz content,
theme, and destination webhook live as rows in Postgres — adding a client or changing a quiz
never requires a redeploy or an env change.

## Stack
Next.js 14 (App Router) · Prisma · Postgres · Docker · Traefik · Clerk (admin auth only)

Same deployment pattern as Hive OS / Coach OS / Gingin Forecast — drop into your existing VPS,
new subdomain `embed.hivesocial.agency`, Traefik network `root_default`.

## How it's secure
- The browser only ever talks to `/api/submit/[quizId]` — it never sees a client's real webhook URL.
- Webhook URLs are stored AES-256-GCM encrypted in Postgres (`lib/crypto.ts`), decrypted only inside
  the server-side submit route, and never included in any API response.
- `WEBHOOK_ENCRYPTION_KEY` is set once (`openssl rand -hex 32`) and never touched again — new clients
  are just an insert via the admin UI.
- Disqualify logic is checked BOTH client-side (instant UX) and server-side (the one that's actually
  trusted — client-side checks can be tampered with).
- Disqualified users are blocked from resubmitting via localStorage + cookie (per quizId), and their
  disqualified state is logged as a `Submission` row (status `skipped`) but never forwarded to the
  client's webhook.
- `/admin/*` and `/api/admin/*` are Clerk-gated (`middleware.ts`); public quiz pages and `/api/submit`
  stay open so embeds work with zero auth.

## How to add a new client (no code, no deploy)
1. Go to `/admin/clients`, fill in name, slug, real webhook URL, brand colors.
2. Go into that client, add a quiz — schema is JSON (see `prisma/seed.ts` for the debt consolidation
   example: steps, options, `disqualify` rules, end screen).
3. Set quiz status to `live`.
4. Embed: `<div id="hive-quiz" data-quiz="[clientSlug]/[quizSlug]"></div>` + loader script
   (build `embed.js` the same way as the JOAT/Sydney Gutters embed — fetch schema by slug, mount).

## Changing a theme
Edit `Client.theme` JSON (`primary`, `secondary`, `font`, `radius`, `logoUrl`) — no component
changes, ever. Same renderer for every client.

## Disqualify rules
```json
"disqualify": [
  { "if": { "field": "q2", "equals": "centrelink" }, "message": "..." }
]
```
Add more rules to the array as needed — `equals` or `in: [...]` supported (see `lib/quiz-logic.ts`).

## Embedding on a third-party website

**Easiest way**: in the admin, go to a client → find the quiz in the Active Quizzes table → click
**Embed** next to Copy Link. It shows the exact ready-to-paste snippet with the real slugs and domain
already filled in — click Copy, done. No hand-typing `data-quiz` values.

The snippet looks like this:

```html
<div data-quiz="clientSlug/quizSlug"></div>
<script src="https://embed.hivesocial.agency/embed.js" defer></script>
```

Replace `clientSlug/quizSlug` with the real values (same as the public URL path, e.g.
`debt-consolidation-client/debt-consolidation`). What it does:

- **Auto-resizing** — the quiz page (`components/QuizRenderer.tsx`) reports its own height to the
  parent page via `postMessage` every time content changes (step change, error message, disqualify,
  end screen). `embed.js` listens for that and resizes the iframe to match — no fixed height guessing,
  no internal scrollbar.
- **Mobile responsive** — the iframe is `width: 100%` by default, so it fills whatever container
  it's placed in; the quiz itself has its own mobile breakpoint at 480px.
- **UTM/tracking passthrough** — if the ad points at the *client's own landing page* rather than the
  quiz URL directly, `embed.js` automatically copies whatever query params are on that host page's URL
  into the iframe's quiz URL, so tracking still reaches the webhook. (If the ad points straight at the
  quiz URL instead, that already works as covered earlier — this just covers the embedded case too.)
- **Multiple quizzes on one page** — drop multiple `<div data-quiz="...">` blocks before the one
  `<script>` tag; each gets its own independently auto-resizing iframe.
- **Fast to open** — `embed.js` adds a `<link rel="preconnect">` to the quiz domain the moment it runs
  (warms up DNS/TLS before the iframe even mounts) and skips lazy-loading, since lead forms are almost
  always placed above the fold and need to be interactive right away.

Framing is explicitly allowed via a `Content-Security-Policy: frame-ancestors *` header on `/q/*`
routes (`next.config.js`) — without it, some hosting layers default to blocking iframes from other
domains, which would silently blank the embed on the client's site.

## Deploying to your VPS (Docker + Traefik — same pattern as Hive OS / Gingin)

One domain serves the whole app — admin, public quiz pages, the `/api/submit` backend, and
`embed.js` all come from this same Next.js deploy, no separate frontend/backend split needed.

**1. DNS** — point `embed.hivesocial.agency` (A record) at your VPS IP (`151.106.120.202`), same as your other subdomains.

**2. Get the code onto the VPS**
```bash
ssh developer@151.106.120.202
cd /home/developer  # or wherever you keep client projects
git clone <your-repo-url> quiz-os
cd quiz-os
```

**3. Create `.env` on the VPS** (copy `.env.example`, fill in real values)
```env
POSTGRES_PASSWORD="pick-a-strong-password"
DATABASE_URL="postgresql://quizos:pick-a-strong-password@quizos-db:5432/quizos"
WEBHOOK_ENCRYPTION_KEY="<openssl rand -hex 32 — generate once, keep forever>"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
CLERK_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/admin
NEXT_PUBLIC_SITE_URL="https://embed.hivesocial.agency"
```
`POSTGRES_PASSWORD` and `DATABASE_URL`'s password must match — the first sets the database
container's password, the second is how the app connects to it. No manual `docker exec ... psql`
step needed; `docker compose up` creates the whole database container for you, same pattern as
your other apps (`gingin-forecast-db`, `coach_os_postgres`, `hive_os_postgres`) — a dedicated
Postgres container per app, not a shared instance. It has no host port published and isn't on
`root_default`, so it's invisible to everything except this app, and can't conflict with your other
apps' Postgres containers even though they all internally use port 5432.

Use Clerk's **live** keys (`pk_live_`/`sk_live_`), not test keys — get these from the Clerk dashboard
after adding `embed.hivesocial.agency` under Domains there.

**4. Build and start**
```bash
docker compose build
docker compose up -d
```
First boot takes a few extra seconds — compose waits for `quizos-db`'s health check to pass before
starting the app, so it never races to connect before Postgres is actually ready.

**5. Run the database migration** (first deploy only, or after schema changes)
```bash
docker compose run --rm migrate npx prisma migrate deploy
```
`migrate deploy` (not `migrate dev`) — it applies existing migrations without prompting, safe for
production. Make sure your migration files (`prisma/migrations/`) are committed to the repo — generate
them locally first with `prisma migrate dev` if you haven't, then commit before deploying.

Note this runs against the `migrate` service (defined in `docker-compose.yml`, using the `builder`
build stage), **not** `docker compose exec quizos ...` — the running `quizos` container uses Next's
standalone output, which prunes `node_modules` down to only what's needed to serve the app. The
`prisma` CLI (only needed for migrations, never imported by the app itself) gets stripped out, so
`npx prisma` inside that container would silently fetch the latest Prisma from the registry instead
of your pinned version — a real problem if that latest major version has breaking schema changes.
The `migrate` service is built from the fuller `builder` stage specifically to avoid this.

**6. Seed the demo quiz** (optional)
```bash
docker compose run --rm migrate npx tsx prisma/seed.ts
```

**7. Verify**
```bash
docker compose logs -f quizos
```
Look for the Next.js server starting cleanly, then visit `https://embed.hivesocial.agency/admin/clients`.

### Common build errors and the fix already baked in
- **"Environment variable not found: DATABASE_URL" during build** — the Dockerfile sets a placeholder
  `DATABASE_URL` before `prisma generate`, since generating the client only reads the schema file, it
  never opens a real connection. The real value only matters at runtime, from `.env`.
- **Build tries to hit the database and fails** — admin and public quiz pages now have
  `export const dynamic = 'force-dynamic'`, so Next never attempts to statically pre-render them at
  build time (which would need a live database connection that doesn't exist yet mid-build).
- **Build runs out of memory** — `shm_size: '1gb'` is already set in `docker-compose.yml`, same fix
  used on your other Next.js apps.
- **Traefik doesn't pick it up** — check `docker network ls` confirms `root_default` exists, and
  `docker logs root-traefik-1` for routing errors. The labels here match your existing pattern exactly
  (`entrypoints=web,websecure`, `certresolver=mytlschallenge`).

### Redeploying after code changes
```bash
git pull
docker compose build
docker compose up -d
docker compose run --rm migrate npx prisma migrate deploy  # only if schema.prisma changed
```

## Local setup
```bash
cp .env.example .env      # fill in DATABASE_URL, WEBHOOK_ENCRYPTION_KEY, Clerk keys
npx prisma migrate dev
npx prisma db seed        # seeds the debt consolidation example quiz
npm run dev
```
Visit `/q/debt-consolidation-client/debt-consolidation`.

## Webhook payload format
The client's n8n webhook receives both the raw internal answers AND a readable version — no need
to cross-reference `q1`/`q2` field IDs against the quiz schema to know what was actually answered:

```json
{
  "clientSlug": "debt-consolidation-client",
  "quizSlug": "debt-consolidation",
  "submissionId": "clx...",
  "answers": { "q1": "credit_cards", "q2": "full_time", "fullName": "Jane Doe" },
  "questions": [
    { "question": "What are you mainly looking to consolidate?", "answer": "Credit cards" },
    { "question": "What best describes your current employment situation?", "answer": "Full-time employed" },
    { "question": "Full name", "answer": "Jane Doe" }
  ],
  "utm": { "utm_source": "facebook", "campaign": "Q3-Leads" },
  "submittedAt": "2026-08-24T12:00:00.000Z"
}
```
`questions` (`lib/quiz-logic.ts` → `formatAnswersForWebhook`) resolves each field ID to its actual
question text and each option value to its label — for `multi_select`, multiple selections join
with a comma. Use `questions` for anything human-facing (Slack notification, email, n8n field
mapping), keep `answers` around for anything that needs to key off stable internal IDs instead.

## UTM / query tracking
Every query param on the quiz URL is captured automatically — not just `utm_*`. Append whatever
your ad platform needs to the link and it flows straight through to the webhook payload untouched:

```
https://embed.hivesocial.agency/q/[clientSlug]/[quizSlug]?lead_source=facebook&campaign={{campaign.name}}&adset={{adset.name}}&ad_name={{ad.name}}&utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.id}}&utm_content={{ad.id}}&utm_adset={{adset.id}}&utm_ad={{ad.id}}
```

It's captured once on page load (`components/QuizRenderer.tsx`) and sent as the `utm` object in the
submit payload — same shape whether it's one param or twenty, no hidden fields to configure per quiz.
Disqualified submissions still get logged with their tracking params for analytics, they just never
get forwarded to the client's webhook.

## Default look
The public quiz now defaults to a warm design: cream page background, white rounded card, gradient
progress bar, an uppercase "Question N" eyebrow label, and soft tinted pill-style answer options instead
of plain white bordered boxes. All of it is still theme-driven — change `primary`, `secondary`, or the
new `pageBackground` field in a client's brand settings and the whole thing re-colors, nothing hardcoded.
App-wide default font is General Sans (loaded from Fontshare in `app/layout.tsx`), overridable per-client
via `theme.font` same as before.

An optional `trustLine` field on the quiz schema renders a short proof line below the card — the text
before the first comma renders bold in the primary color, the rest in the secondary color, e.g.
`"160+ people helped, grown by referral."`

## Step types
- **Single Choice** — pick one, auto-advances
- **Multiple Choice** — pick any number, click Continue (now actually renders — it silently didn't before)
- **Text / Email / Phone** — a standalone question step, placeable anywhere in the flow via drag-reorder,
  not just bundled at the end. Email and phone get format validation automatically (both client-side for
  instant feedback and server-side in `/api/submit`, since the client check can be tampered with).
- **Contact Form** — groups several fields (name/email/phone) on one screen, same validation rules apply
  per field.

## Validation
`lib/quiz-logic.ts` → `validateFieldValue()` / `validateAnswers()` — shared by the public quiz page and
the submit API. Required fields, email format, and phone format are checked twice: once client-side for
an instant inline error, and again server-side before anything touches the database or the client's
webhook. A malformed submission is rejected with a 400 and never gets saved or forwarded.

## Responsive design
The public quiz page (`app/globals.css`) has a mobile breakpoint at 480px — tighter padding, smaller
headline, full-width card. The admin quiz builder's Live Preview panel has a working Mobile/Desktop
toggle (top-right of the preview pane) that actually resizes the preview frame, not just decorative icons.

## Theme colors
Headline, option borders, progress bar, and buttons all read `--quiz-primary` / `--quiz-secondary` CSS
variables set from `Client.theme` — verified end to end so a color change in the admin actually shows up
on the live page (an earlier version had the headline wired to the wrong variable, fixed).

## Known scaling caveat
`/api/submit`'s rate limiter (`lib/webhook.ts` area, in `route.ts`) uses an in-memory `Map` — fine for a
single VPS container, but if you ever run Quiz OS across multiple instances behind a load balancer, each
instance has its own counter and the limit effectively multiplies. At that point swap it for a Redis-backed
limiter (e.g. `@upstash/ratelimit`) — flagging this now so it doesn't surprise you later, not fixed here
since it needs an external store this scaffold doesn't assume you have.

## Webhook retries
`lib/webhook.ts` does one inline retry on submit. For real durability, add a cron route
(`/api/cron/retry-webhooks`) that re-attempts any `Submission.webhookStatus = 'failed'` every
few minutes — same pattern as the Ad Performance OS / Swarm retry queue. Cron over n8n, per your
usual preference.

## File map (this delivery)
- `prisma-schema.prisma` → `prisma/schema.prisma`
- `prisma-seed.ts` → `prisma/seed.ts`
- `lib-prisma.ts` → `lib/prisma.ts`
- `lib-crypto.ts` → `lib/crypto.ts`
- `lib-quiz-logic.ts` → `lib/quiz-logic.ts`
- `lib-webhook.ts` → `lib/webhook.ts`
- `middleware.ts` → `middleware.ts`
- `app-api-submit-[quizId]-route.ts` → `app/api/submit/[quizId]/route.ts`
- `app-(public)-q-[clientSlug]-[quizSlug]-page.tsx` → `app/(public)/q/[clientSlug]/[quizSlug]/page.tsx`
- `components-QuizRenderer.tsx` → `components/QuizRenderer.tsx`
- `app-(admin)-admin-layout.tsx` → `app/(admin)/admin/layout.tsx`
- `app-(admin)-admin-clients-page.tsx` → `app/(admin)/admin/clients/page.tsx`
- `env-example.txt` → `.env.example`

## Not built yet (next steps)
- Quiz JSON visual builder (v1 ships with raw JSON textarea in admin, works fine)
- `embed.js` loader script (copy the pattern from Sydney Gutters/JOAT embed)
- Cron retry route for failed webhooks
- Submissions log page with manual resend button
