# Chicago Events Map — Project Decisions

## Project Overview
A web application for Chicago and surrounding suburbs that aggregates external events AND allows community members to submit their own events (dance classes, pottery workshops, neighborhood cleanups, etc.) — all shown on a single interactive map. Users can filter, search, coordinate attendance via comments, and contribute new events that go through automated + admin verification before going live.

---

## Technology Stack

| Layer | Choice | Why | Alternative |
|---|---|---|---|
| Frontend | **React + Vite** | Largest map-integration ecosystem; fast HMR; biggest learning community | Vue 3 |
| Styling | **Tailwind CSS** | Utility-first; fast to prototype; great for multi-step forms | CSS Modules |
| Map | **Mapbox GL JS** | Best free-tier clustering; polygon draw tools built-in; custom marker styles | Leaflet + OSM |
| Backend | **Node.js + Express** | Same language as frontend (JavaScript); minimal boilerplate | Python / FastAPI |
| Database | **PostgreSQL + PostGIS** | Native geospatial queries; robust; same DB handles events + submissions + users | MongoDB |
| Auth + Realtime | **Supabase** | Handles auth, Postgres hosting, and realtime comment subscriptions in one service | Firebase |
| Content Moderation | **OpenAI Moderation API** | Free API; automatically flags hate speech / inappropriate content in submissions | AWS Comprehend |
| Geocoding | **Mapbox Geocoding API** | Already using Mapbox for map; same token; converts addresses to lat/lng | Google Geocoding |
| Job Scheduler | **node-cron** | Simple cron for data ingestion jobs; runs inside Express process | Bull / BullMQ |
| Deploy: Frontend | **Vercel** | Free tier; zero-config React deploy; automatic preview URLs on PR | Netlify |
| Deploy: Backend | **Railway** | Free PostgreSQL + PostGIS; Node server; one-click deploy from GitHub | Render |
| Version Control | **GitHub** | Standard; integrates with Vercel and Railway for auto-deploy on push | GitLab |

> OpenAI Moderation API is completely free — separate from their paid chat API.

---

## Data Model

### Events Table
Stores ALL events regardless of source — ingested from APIs or submitted by users. `submission_status` controls what appears on the map.

```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
external_id         TEXT                      -- source system ID; NULL for community submissions
source              TEXT NOT NULL             -- 'eventbrite' | 'choosechicago' | 'ticketmaster' | 'ical' | 'manual' | 'community'
is_user_submitted   BOOLEAN                   -- TRUE for community; FALSE for ingested
submitted_by_user_id UUID                     -- FK → users.id; NULL for ingested events
submission_status   TEXT                      -- 'ingested' | 'pending' | 'approved' | 'rejected' | 'flagged'
verification_score  INTEGER                   -- 0–100 automated check score
verification_details JSONB                    -- per-check results object
submission_notes    TEXT                      -- admin message shown to submitter
contact_email       TEXT                      -- submitter email; NOT public
title               TEXT NOT NULL
description         TEXT
category            TEXT[]                    -- ['Music','Food','Classes','Workshops']
tags                TEXT[]
image_url           TEXT
start_datetime      TIMESTAMPTZ NOT NULL
end_datetime        TIMESTAMPTZ
is_recurring        BOOLEAN
recurrence_rule     TEXT                      -- iCal RRULE string
venue_name          TEXT
address             TEXT
city                TEXT
neighborhood        TEXT
coordinates         GEOGRAPHY(POINT, 4326) NOT NULL   -- PostGIS
is_free             BOOLEAN
price_min           DECIMAL(8,2)
price_max           DECIMAL(8,2)
price_notes         TEXT
official_url        TEXT
ticket_url          TEXT
content_hash        TEXT                      -- MD5(title+start_datetime+address) for change detection
is_active           BOOLEAN DEFAULT TRUE      -- FALSE = cancelled/past; never hard-delete
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()

UNIQUE (source, external_id)                  -- deduplication key
```

**Map query filter**: `WHERE (submission_status = 'ingested' OR submission_status = 'approved') AND is_active = TRUE`

### Users Table
```sql
id               UUID   -- matches Supabase Auth user ID exactly
display_name     TEXT
avatar_url       TEXT
email            TEXT
is_admin         BOOLEAN
is_banned        BOOLEAN
submission_count INTEGER DEFAULT 0
approved_count   INTEGER DEFAULT 0
created_at       TIMESTAMPTZ DEFAULT NOW()
```

### Comments Table
```sql
id             UUID PRIMARY KEY
event_id       UUID    -- FK → events.id
user_id        UUID    -- FK → users.id
body           TEXT
type           TEXT    -- general | looking_to_join | carpool_offer | carpool_request | question
reported_count INTEGER DEFAULT 0
is_deleted     BOOLEAN DEFAULT FALSE
created_at     TIMESTAMPTZ DEFAULT NOW()
updated_at     TIMESTAMPTZ DEFAULT NOW()
```

### Event Submission Log Table
Audit trail for every status change on a community-submitted event.
```sql
id                    UUID PRIMARY KEY
event_id              UUID    -- FK → events.id
action                TEXT    -- submitted | auto_approved | auto_rejected | admin_approved | admin_rejected | flagged | edited
actor_user_id         UUID
note                  TEXT
verification_snapshot JSONB
created_at            TIMESTAMPTZ DEFAULT NOW()
```

### Key Indexes
```sql
CREATE INDEX ON events USING GIST (coordinates);           -- spatial queries
CREATE INDEX ON events (submission_status, is_active);     -- map filter
CREATE INDEX ON events (submitted_by_user_id);             -- My Submissions page
CREATE INDEX ON events (start_datetime);                   -- date filtering
CREATE INDEX ON events USING GIN (category);               -- array filtering
```

> Also run: `CREATE EXTENSION IF NOT EXISTS pg_trgm;` for fuzzy duplicate detection.

---

## Data Acquisition Strategy

### Source Tiers

| Priority | Source | Method | Refresh Rate |
|---|---|---|---|
| 1 — Primary | Eventbrite API | Official REST API — free, structured JSON | Every 6 hours |
| 2 — Primary | Chicago Open Data Portal | data.cityofchicago.org — Socrata API | Daily |
| 3 — Primary | Ticketmaster API | Free Discovery API | Every 12 hours |
| 4 — Secondary | iCal / RSS Feeds | Parse .ics from Chicago Park District, local venues | Daily |
| 5 — Manual | Admin Entry | Admin dashboard form | On demand |
| 6 — Last Resort | Web Scraping | Playwright; check robots.txt; rate limit 1 req/3 sec | Every 2–3 days |

### Ingestion Pipeline (per source)
1. Fetch raw data
2. Normalize to standard schema — set `source`, `is_user_submitted=FALSE`, `submission_status='ingested'`
3. Compute `content_hash = MD5(title + start_datetime + address)`
4. Query DB: `SELECT id, content_hash WHERE source=? AND external_id=?`
5. No match → INSERT | Hash differs → UPDATE | Same hash → SKIP
6. Set `is_active = FALSE` where `end_datetime < NOW()`

> All ingested events get `submission_status = 'ingested'` permanently — they never go through the pending/approved flow.

---

## Community Event Submission Flow

### Submission States
| Status | Who Sets It | Meaning |
|---|---|---|
| pending | System (on submit) | Awaiting admin review. NOT visible on map. |
| approved | Admin | Reviewed and live with 'Community' badge. |
| rejected | Admin | Declined. User sees rejection note. Can edit and resubmit. |
| flagged | Admin | Was approved but reported. Temporarily hidden. |
| ingested | Ingestion scripts | External event — bypasses submission flow entirely. |

### Automated Verification (runs instantly on submission)
| Check | Points | How |
|---|---|---|
| Geocoding | 30 | Mapbox Geocoding — must resolve to Chicagoland (lat 41–43, lng -88 to -87) |
| Date Validity | 20 | start_datetime > NOW(); end > start if provided |
| Content Moderation | 30 | OpenAI Moderation API — check title + description |
| URL Reachable | 10 | HEAD request to official_url → 200 response |
| Duplicate Check | 10 | pg_trgm similarity > 80% + within 0.5km + within 1 day |

Score interpretation: 80–100 = Looks Good, 50–79 = Review Needed, 0–49 = Needs Attention

---

## Backend API

Base URL: `/api/v1`. Auth: Public = no token, Auth = user JWT, Admin = admin JWT.

### Events
| Method | Route | Auth |
|---|---|---|
| GET | /events | Public |
| GET | /events/:id | Public |
| GET | /events/within-bounds | Public |
| POST | /events | Admin |
| PUT | /events/:id | Admin |

### Community Submissions
| Method | Route | Auth |
|---|---|---|
| POST | /submissions | Auth |
| GET | /submissions/mine | Auth |
| PUT | /submissions/:id | Auth |
| GET | /admin/submissions | Admin |
| GET | /admin/submissions/all | Admin |
| PUT | /admin/submissions/:id/approve | Admin |
| PUT | /admin/submissions/:id/reject | Admin |
| PUT | /admin/submissions/:id/flag | Admin |

### Comments
| Method | Route | Auth |
|---|---|---|
| GET | /events/:id/comments | Public |
| POST | /events/:id/comments | Auth |
| POST | /comments/:id/report | Auth |
| DELETE | /comments/:id | Admin |

### Auth
| Method | Route | Auth |
|---|---|---|
| GET | /auth/me | Auth |
| POST | /auth/geocode | Auth |

---

## Frontend Architecture

### Folder Structure
```
src/
  components/
    Map/
      MapView.jsx              → Main map, two marker layers, clustering
      MarkerCluster.jsx        → Cluster circle layer config
      DrawAreaTool.jsx         → Polygon draw for location search
      CommunityMarker.jsx      → Distinct teal marker for community events
    Events/
      EventCard.jsx            → Compact card for list view
      EventDetailPanel.jsx     → Full slide-in drawer with comments
      EventList.jsx            → Scrollable list beside map
      SourceBadge.jsx          → 'Official' (blue) vs 'Community' (teal) badge
    Filters/
      CategoryFilter.jsx       → Multi-select pill buttons
      DateRangePicker.jsx      → Start/end date inputs
      SearchBar.jsx            → Keyword search input
    Community/
      CommentThread.jsx        → Realtime comment list
      CommentForm.jsx          → Textarea + type dropdown
      CommentBadge.jsx         → Colored type pill
    Submissions/
      SubmitEventButton.jsx    → Floating button opens form
      SubmitEventForm.jsx      → Multi-step wizard (5 steps)
      StepBasicInfo.jsx        → Title, category, description
      StepWhen.jsx             → Dates, recurring toggle
      StepWhere.jsx            → Address + geocoding mini-map preview
      StepDetails.jsx          → Cost, URL, contact email
      StepReview.jsx           → Summary before submit
      MySubmissions.jsx        → User's submission history + statuses
      SubmissionStatusBadge.jsx → Pending/Approved/Rejected/Flagged pill
    Auth/
      LoginButton.jsx
      UserAvatar.jsx
    Admin/
      AdminDashboard.jsx       → Tabbed: Pending | Flagged | Comments | Events
      SubmissionReviewCard.jsx → Event details + verification score + approve/reject
      VerificationScoreBar.jsx → Visual score 0–100 with check breakdown
      ReportedComments.jsx
    Layout/
      Navbar.jsx               → Logo, search, user avatar, Submit Event button
      Sidebar.jsx              → Filter panel
  hooks/
    useEvents.js               → Fetch events with current filters
    useComments.js             → Fetch + realtime subscribe to comments
    useAuth.js                 → Supabase auth state
    useMapBounds.js            → Track current map viewport
    useSubmission.js           → Multi-step form state + submit logic
    useGeocoding.js            → Debounced address → coordinates lookup
  services/
    api.js                     → All fetch calls to /api/v1
    supabase.js                → Supabase client init
  store/
    filters.js                 → Zustand store: categories, dates, search
    submission.js              → Zustand store: form steps state
  pages/
    Home.jsx                   → Map + filters + event list
    MySubmissions.jsx          → /my-submissions route
    AdminDashboard.jsx         → /admin route
  utils/
    formatDate.js
    categoryColors.js          → Category → color mapping
    geoUtils.js
    verificationHelpers.js     → Parse verification_details into human-readable results
```

### Map Defaults
- Centered on Chicago: `lat: 41.8827, lng: -87.6233, zoom: 11`
- Two GeoJSON sources: blue (ingested), teal #2E986A (community-approved)
- Both cluster at `clusterMaxZoom: 14`
- Re-fetch on map bounds change, debounced 400ms

---

## Event Categories
Food, Sightseeing, Festivals, Farmers Market, Nightlife, Music, Arts, Family-Friendly, Classes, Workshops

---

## Development Milestones

### M1 — Project Scaffold (Week 1) ✅
- [x] Initialize repos: /client (Vite + React + Tailwind) and /server (Node + Express)
- [x] .env files for Supabase, Mapbox, Eventbrite, OpenAI keys
- [x] Express health endpoint: `GET /api/v1/health → { status: 'ok', timestamp }`
- [x] Client fetches /health and renders 'API connected'
- [x] Create Supabase project + enable PostGIS and pg_trgm
- [x] Tailwind + full folder structure from spec

### M2 — Database Setup (Week 1–2) ✅
- [x] Run SQL for all 4 tables with PostGIS + pg_trgm
- [x] Create all indexes
- [x] seed.js — 20 real Chicago events (submission_status='ingested')
- [x] GET /events endpoint returning filtered JSON

### M3 — Map with Live Markers (Week 2) ✅
- [x] Mapbox integration centered on Chicago
- [x] Two marker layers (blue ingested, teal community)
- [x] Clustering on both sources
- [x] Click marker → EventDetailPanel with SourceBadge

### M4 — Filters, Search & Location (Week 2–3) ✅
- [x] CategoryFilter, DateRangePicker, SearchBar
- [x] Radius filter (ST_DWithin)
- [ ] Draw-area polygon filter (ST_Within) — deferred to post-MVP

### M5 — External Data Ingestion (Week 3) ✅
- [x] Eventbrite ingestion script + upsert pattern
- [x] node-cron schedule (Eventbrite every 6h, Open Data daily 3am)
- [x] Chicago Open Data ingestion script
- [x] Manual trigger routes: POST /api/v1/ingest/eventbrite, POST /api/v1/ingest/chicago-open-data

### M6 — Authentication (Week 4) ✅
- [x] Supabase Google OAuth
- [x] useAuth.js hook, LoginButton, UserAvatar
- [x] Backend JWT middleware (checkAuth, checkAdmin)
- [x] Upsert user record on first login via POST /auth/sync
- [x] Geocoding proxy at POST /auth/geocode (keeps Mapbox secret token server-side)

### M7 — Community Comments (Week 4–5) ✅
- [x] CommentThread, CommentForm with type dropdown
- [x] Supabase Realtime subscription on comments
- [x] Report button (increments reported_count via RPC)
- [x] Soft-delete (admin only — sets is_deleted=true, shows [removed])

### M8 — Community Event Submission Form (Week 5–6) ✅
- [x] 5-step wizard (BasicInfo → When → Where → Details → Review)
- [x] Step 3: address input → debounced geocode → confirmation
- [x] POST /submissions endpoint with validation
- [x] Confirmation screen with submission ID
- [x] Floating "+ Submit Event" button — shows login prompt if not signed in

### M9 — Automated Verification System (Week 6) ✅
- [x] /server/services/verification.js with all 5 checks
- [x] Score storage in verification_score + verification_details JSONB
- [x] event_submission_log insert with verification_snapshot
- [x] Auto-reject if OpenAI flags content
- [x] find_duplicate_events RPC using pg_trgm similarity

### M10 — Admin Moderation Dashboard (Week 7)
- [ ] AdminDashboard with 4 tabs
- [ ] Approve/reject flows, VerificationScoreBar

### M11 — My Submissions Page (Week 7–8)
- [ ] /my-submissions route with status badges
- [ ] Edit & Resubmit flow

### M12 — Polish, Performance & Deploy (Week 8–9)
- [ ] Mobile responsive, loading states, error handling
- [ ] Deploy frontend (Vercel) + backend (Railway)
- [ ] Production cron jobs, security audit

---

## Environment Variables

### Server (/server/.env)
| Variable | Source |
|---|---|
| SUPABASE_URL | Supabase → Settings → API |
| SUPABASE_SERVICE_KEY | Supabase → Settings → API → service_role (never expose to client) |
| EVENTBRITE_API_KEY | eventbrite.com/platform → API Keys |
| TICKETMASTER_API_KEY | developer.ticketmaster.com → My Apps |
| OPENAI_API_KEY | platform.openai.com → API Keys (for free Moderation API only) |
| MAPBOX_SECRET_TOKEN | mapbox.com → Tokens → Create secret token (server-side geocoding proxy) |
| PORT | 3001 locally; Railway sets automatically in prod |
| FRONTEND_URL | http://localhost:5173 (dev) / Vercel URL (prod) — for CORS |

### Client (/client/.env)
| Variable | Source |
|---|---|
| VITE_MAPBOX_TOKEN | mapbox.com → Tokens → Create public token |
| VITE_SUPABASE_URL | Same as SUPABASE_URL — safe to expose |
| VITE_SUPABASE_ANON_KEY | Supabase → Settings → API → anon/public key — safe to expose |
| VITE_API_BASE_URL | http://localhost:3001/api/v1 (dev) / Railway URL (prod) |

> NEVER put SUPABASE_SERVICE_KEY or OPENAI_API_KEY in /client .env.

---

## Open Decisions / TBD
- **Auto-approve**: Future feature — submissions scoring 80–100 could skip admin queue
- **Phase 2**: Plan a Day Trip, private messaging, Going/attendance tracking, push notifications, trusted moderators, mobile app, neighborhood browse mode

---

## Implementation Decisions Log
Decisions made during build that aren't in the original spec.

### Backend: Node.js chosen over Python
Python considered but rejected. Node.js wins because: same language as frontend (no context switching), Supabase JS SDK is first-class, Mapbox geocoding is JS-native, Playwright has first-class Node support. Only reason to add Python would be ML clustering for "Plan a Day Trip" — if that happens, add a Python microservice for that feature only, don't replace the backend.

### PostGIS coordinates: WKB parsing on the server
Supabase returns `GEOGRAPHY` columns as raw WKB hex strings (e.g. `0101000020E610000...`), not GeoJSON. Decision: parse WKB → `{type: 'Point', coordinates: [lng, lat]}` in `server/src/utils/parseCoordinates.js` before sending to the client. This keeps the frontend clean — it always receives standard GeoJSON. Alternative considered: Postgres view with `ST_AsGeoJSON` — rejected because Supabase JS client doesn't support function calls in `.select()`.

### Map state: lifted to Home.jsx
`selectedEventId` state lives in `Home.jsx`, not inside `MapView`. Both `MapView` (marker click) and `EventList` (card click) call `onSelectEvent(id)` — single source of truth. `EventDetailPanel` fetches the full event by ID from the API, so markers only need to store the ID in their GeoJSON properties, not all fields.

### Seed data: 20 real Chicago events (not fake)
Spec said "20 fake events" but we used real Chicago events with accurate coordinates, real venue names, and correct dates for 2026. This makes the map immediately useful for demos and makes M3 visually compelling. Events span Chicago + suburbs (Evanston, Naperville) to demonstrate the "Chicagoland" scope.

### Route ordering: /within-bounds before /:id
Express matches routes in order. `/within-bounds` must be registered before `/:id` or Express interprets `within-bounds` as an event UUID. Already handled in `server/src/routes/events.js`.

### Mapbox token: public token in client, secret token in server
`VITE_MAPBOX_TOKEN` (public, `pk.*`) used in the React client for map rendering. `MAPBOX_SECRET_TOKEN` (secret, `sk.*`) used server-side only for the geocoding proxy endpoint (`POST /auth/geocode`). This keeps the secret token out of the browser bundle.

### M4: Filter state in Zustand, applied in two places
Filters (categories, startDate, endDate, searchQuery) live in `useFiltersStore` (Zustand). They are read by two consumers: (1) `useEvents` hook — drives the EventList; (2) `MapView` — passes filters as extra params to `getEventsWithinBounds`. Both react to filter changes independently. Map reloads on filter change via a separate `useEffect` watching the store values.

### M4: Bounds filtering happens in PostGIS, other filters applied in JS
The `events_within_bounds` RPC does the spatial filter in PostGIS (fast). Category, date, and keyword filters are applied in JS on the server after the spatial query returns. This avoids building a complex parameterized PostGIS function for M4 — can be moved into SQL later if performance requires it.

### M4: toQueryString helper for array params
`URLSearchParams` serializes arrays as `category=Music%2CFood` (comma-joined), which Express doesn't parse as an array. Replaced with a custom `toQueryString` that serializes arrays as repeated keys: `category=Music&category=Food`. Express's `req.query` then returns an array automatically.

### M5: Upsert pattern — hash-based change detection
Each ingested event gets a `content_hash = MD5(title + start_datetime + address)`. On re-ingest: if hash unchanged → skip (no DB write); if hash changed → update; if new → insert. This makes all workers idempotent — safe to run repeatedly. Logic lives in `server/src/ingestion/upsert.js` shared by all workers.

### M5: Category mapping for Eventbrite
Eventbrite has its own category taxonomy. We map their categories to our 10 categories in `CATEGORY_MAP` inside `eventbrite.js`. Unmapped categories are dropped. Can be expanded as new Eventbrite categories are encountered.

### M5: Chicago Open Data — category inferred from event name
The Socrata dataset has no category field. We infer category by keyword-matching the event name (e.g. "market" → Farmers Market, "festival" → Festivals). Logic in `guessCategory()` in `chicago-open-data.js`. All permitted public events default to `is_free: true`.

### M5: Manual trigger routes for testing
`POST /api/v1/ingest/eventbrite` and `POST /api/v1/ingest/chicago-open-data` run workers immediately without waiting for cron. Use these during development to test ingestion. Remove or protect with `checkAdmin` before production.

### M6: User sync via POST /auth/sync (no JWT required)
The client calls `POST /auth/sync` immediately after login, passing the Supabase user fields (id, email, display_name, avatar_url). This endpoint does NOT require a JWT — the data comes from Supabase Auth directly and the user ID is trusted. This avoids a chicken-and-egg problem where the user record doesn't exist yet when the JWT middleware tries to look it up.

### M6: Profile stored in two places
`user` (from `useAuth`) = Supabase Auth user object (has `user_metadata.avatar_url`, `email`, etc.). `profile` = our `users` table row (has `is_admin`, `is_banned`, `submission_count`). Both are returned by `useAuth`. Components should use `profile.is_admin` to gate admin features, not `user`.

### M5: Ticketmaster deferred
Ticketmaster ingestion not built in M5 — Eventbrite + Chicago Open Data covers launch needs. Can add in a later sprint using the same upsert pattern.

### M4: Draw-area polygon filter deferred
Mapbox Draw plugin (`@mapbox/mapbox-gl-draw`) deferred to post-MVP. Adds meaningful complexity (install, UI toggle, polygon state) for a feature users can approximate with zoom + radius filter. Will revisit for Phase 2.

### Color constants
- Official/ingested events: `#3B82F6` (Tailwind blue-500), CSS class `bg-official`
- Community/approved events: `#2E986A` (custom teal), CSS class `bg-community`
- Defined in `tailwind.config.js` as theme extensions so they're usable as Tailwind classes everywhere

---

## Phase 2 Decisions

### P2: UI/Style Overhaul
Two themes — both minimal:
1. **Day mode** — beige/warm yellow palette, Monet-inspired. Mapbox style: `mapbox://styles/mapbox/light-v11` as base, customized toward warm/sandy tones. Tailwind theme extended with warm neutrals (sand, cream, amber).
2. **Dark mode** — minimal dark. Mapbox style: `mapbox://styles/mapbox/dark-v11`.

**Layout** (new, replacing sidebar-left layout):
- Map takes full left side
- Filters panel: top-right
- Event list: bottom-right
- On mobile: map full screen, floating "Filters" and "List" toggle buttons

**Vibe reference**: Poetle/Wordle — clean, friendly, soft, lovely. No harsh edges, warm typography, gentle shadows.

**Event cards**: keep current structure but restyle to match warm theme.

### P2: Event end time default
When a user creates an event and sets a start time, end time auto-defaults to start + 1 hour. User can still override. Implemented in `StepWhen.jsx` via `onChange` on start_datetime input.

### P2: Map style — minimal, event-first
Switched from `navigation-day-v1` / `navigation-night-v1` to `light-v11` / `dark-v11`.
Reason: navigation styles have colored road lanes, traffic indicators, and heavy labeling that compete visually with event markers. `light-v11` and `dark-v11` are near-neutral canvases — subtle gray roads, minimal labels — so event markers read as the primary visual element.

### P2: Collections — save events + see commented events
Two sub-features:
a) **Save/bookmark an event** — bookmark icon on EventDetailPanel. Toggles save. Stored in `saved_events` table (user_id, event_id, unique).
b) **Collections page** at `/collections` — two tabs: "Saved" (all bookmarked events) and "Commented" (events the user has commented on). Requires auth.

API:
- `POST /api/v1/events/:id/save` — toggle (saves if not saved, unsaves if saved)
- `GET /api/v1/me/collections` — returns `{ saved: [...events], commented: [...events] }`

DB: new `saved_events` table — see migration `m13_saved_events.sql`.

### P2: Chat & Messaging Spec

**Model**: Instagram-style. Start a DM with any user → add people → becomes a group chat.

**Rules:**
- Any logged-in user can start a DM or group
- Max 300 members per group
- Group creator can set public or private
- Public groups are discoverable and shown on the event detail panel if linked to an event
- Private groups only visible to members

**Data model:**
```
conversations        — id, name, is_group, is_public, event_id (nullable FK → events), created_by (FK → users), max_members (default 300), created_at
conversation_members — conversation_id, user_id, role (admin|member), joined_at, UNIQUE(conversation_id, user_id)
messages             — id, conversation_id, sender_id, body, created_at, is_deleted
```

**API routes (all require checkAuth):**
- POST /api/v1/conversations — create DM or group
- GET /api/v1/conversations — list user's conversations
- GET /api/v1/conversations/:id — get conversation + members
- POST /api/v1/conversations/:id/messages — send message
- GET /api/v1/conversations/:id/messages — paginated message history
- POST /api/v1/conversations/:id/members — add member (admin only)
- GET /api/v1/events/:id/groups — public groups linked to an event

**Realtime**: Supabase Realtime subscription on `messages` filtered by `conversation_id` (same pattern as comments).

**Frontend pages/components:**
- `/messages` — inbox: list of all conversations, last message preview
- `/messages/:id` — chat view with realtime message stream + send box
- User profile click → "Message" button starts DM
- EventDetailPanel → "Groups" section shows public groups for that event with join button
- New group: modal to set name, pick event (optional), public/private, invite members

### P2: Phase 2 feature roadmap (in priority order)
1. UI/style overhaul (in progress)
2. Collections — save events + see saved/commented (in progress)
3. Chat & group chat — Instagram-style DMs + group chats (see P2: Chat spec below)
4. Plan a Day Trip — multi-event itinerary builder (see P2: Day Trip spec below)
5. Mobile app

### P2: Day Trip Planner Spec

**Flow:**
1. User picks a date → map shows only events on that day
2. User clicks events to add them to their trip itinerary ("+Add to Trip" button in event detail panel)
3. Itinerary panel shows events ordered by start time with a Mapbox Directions route drawn between them on the map
4. User can reorder, remove events, name the trip
5. Save trip → stored in DB, shareable via link or group chat

**Route rendering:** Mapbox Directions API (client-side, public token) — draws a polyline between event coordinates in order. Mode: driving by default, toggle to walking.

**Sharing:** Each saved trip gets a public URL `/trip/:id`. Can be sent as a message in group chat.

**Data model:**
```
trips               — id, user_id, name, date, is_public, created_at, updated_at
trip_events         — id, trip_id, event_id, position (integer order), note (optional)
```

**API routes:**
- POST /api/v1/trips — create trip
- GET /api/v1/trips/:id — get trip (public if is_public)
- PUT /api/v1/trips/:id — update name/date/is_public
- DELETE /api/v1/trips/:id — delete
- POST /api/v1/trips/:id/events — add event to trip
- DELETE /api/v1/trips/:id/events/:event_id — remove event
- PUT /api/v1/trips/:id/events/reorder — update positions
- GET /api/v1/me/trips — list user's trips

**Frontend:**
- Day Trip mode toggle in navbar/map — activates date picker, filters map to that day
- "Add to Trip" button in EventDetailPanel (only visible in trip mode)
- TripPanel — slide-in right panel showing itinerary, reorder handle, route stats (total distance/time)
- `/trip/:id` — public shareable trip view
- `/my-trips` — user's saved trips list
