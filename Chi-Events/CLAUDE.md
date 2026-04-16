# Chicagoland Events Map — Complete Project Reference

> Read this file before writing any code. Every decision here was made deliberately.
> If you think something should change, update this file as part of the PR.

---

## Product Philosophy

- **Primary user goal**: spend less time planning, more time experiencing
- **The map is the canvas**, not just a feature — everything radiates from it
- **Recommendations must feel personal**, not algorithmic — like a smart local friend
- **Weather is a first-class input**, not an afterthought — outdoor events on rainy days get flagged
- **A perfect Saturday itinerary is the north star** — every feature supports this goal
- **"Plan a Day" is the primary CTA**, not Submit Event

---

## New Feature Decisions (P3 — AI & Personalization)

| Decision | Choice | Reason |
|---|---|---|
| Weather API | Open-Meteo (free, no key) | Zero cost, reliable, covers Chicago area, no auth needed |
| Preference storage | `users.preferences JSONB` | Flexible schema, avoids extra table, Supabase querying is straightforward |
| Recommendation engine | Claude Sonnet via `server/src/services/ai/orchestrator.js` | Best reasoning for preference-matching + local context |
| Itinerary format | Ordered stops with travel time between each | Mirrors how people actually plan days — sequential with buffers |
| AI model calls | Always routed through `orchestrator.js` | Single place to manage API key, error handling, caching, cost control |
| Recommendation cache | In-memory Map, per user per date, 2 hours TTL | Prevents Claude API call on every page load |
| Shared itineraries | `saved_itineraries` table with `share_token` | Random 8-char token → public `/plan/share/[token]` page |
| Email delivery (Phase 3) | Resend | Simple API, generous free tier |
| Push notifications (Phase 3) | Supabase Edge Functions | No separate infra needed |
| `ANTHROPIC_API_KEY` | Server env only — **never in client** | Same rule as all other secret keys |

---

## Project Overview

A full-stack web application for Chicago and surrounding suburbs that:
- Aggregates events from Ticketmaster, PredictHQ, and Chicago Open Data automatically
- Allows community members to submit their own events (classes, workshops, cleanups, etc.)
- Displays everything on an interactive Mapbox map with clustering and category colors
- Supports trip planning, saved collections, group chat, comments, and user profiles
- Runs moderation on community submissions automatically before admin review

**Live URLs:**
- Frontend: Vercel (auto-deploys on push to `main`)
- Backend: Railway (auto-deploys on push to `main`)

---

## Tech Stack

### Frontend (`/client`)
| Package | Version | Purpose |
|---|---|---|
| react | ^18.3.1 | UI framework |
| react-dom | ^18.3.1 | DOM rendering |
| react-router-dom | ^6.26.2 | Client-side routing |
| mapbox-gl | ^3.6.0 | Interactive map |
| @supabase/supabase-js | ^2.45.0 | Auth + Realtime subscriptions |
| zustand | ^4.5.5 | Global state management |
| vite | ^5.4.3 | Build tool + dev server |
| tailwindcss | ^3.4.10 | Utility-first CSS |
| vite-plugin-pwa | ^1.2.0 | PWA / installable on iPhone |
| sharp | ^0.34.5 | PWA icon generation |

### Backend (`/server`)
| Package | Version | Purpose |
|---|---|---|
| express | ^4.19.2 | HTTP server |
| @supabase/supabase-js | ^2.45.0 | Database + auth verification |
| cors | ^2.8.5 | Cross-origin requests |
| dotenv | ^16.4.5 | Environment variables |
| node-cron | ^3.0.3 | Scheduled ingestion jobs |
| nodemon | ^3.1.4 | Dev auto-restart |

### Infrastructure
| Layer | Service | Why |
|---|---|---|
| Database | Supabase (PostgreSQL + PostGIS) | Native geospatial, auth, realtime in one |
| Auth | Supabase Auth (Google OAuth) | No custom auth code needed |
| Realtime | Supabase Realtime | Comments and messages update live |
| Frontend deploy | Vercel | Free tier, zero-config React, preview URLs |
| Backend deploy | Railway | Free PostgreSQL + PostGIS, Node server |
| Map | Mapbox GL JS | Best clustering, custom markers, Directions API |
| Geocoding | Mapbox Geocoding API (server-side) | Same token as map, kept server-side |
| Content moderation | OpenAI Moderation API | Free, auto-flags hate speech in submissions |

---

## Design System

### CSS Architecture
All colors, spacing, and theme values use **CSS custom properties** (variables) defined in `client/src/index.css`. Never hardcode hex values in components — always use theme utilities.

### CSS Variables (Day Theme — default)
```css
--bg:            #fdfaf4   /* warm white page background */
--surface:       #fff      /* card/panel background */
--surface-2:     #faf3e0   /* secondary surface, input bg */
--border:        #edd89a   /* primary border */
--border-subtle: #f5e6c0   /* subtle border (most common) */
--text:          #2c1f0e   /* primary text */
--text-muted:    #8a6a3a   /* secondary text */
--text-faint:    #b8975a   /* tertiary text, placeholders */
--accent:        #d4a843   /* primary accent — amber/gold */
--accent-hover:  #b88a2e   /* accent on hover */
--shadow:        rgba(180,140,60,0.14)  /* warm shadow */
```

### CSS Variables (Dark Theme — `.dark` class on `<html>`)
```css
--bg:            #0f0f17
--surface:       #1a1a27
--surface-2:     #22223a
--border:        #2e2e4a
--border-subtle: #252535
--text:          #e8e8f0
--text-muted:    #9090b0
--text-faint:    #5a5a7a
--accent:        #7c6af5   /* purple in dark mode */
--accent-hover:  #6354d4
--shadow:        rgba(0,0,0,0.4)
```

### Tailwind Theme Extensions (`tailwind.config.js`)
```js
colors: {
  community: '#2E986A',   // teal — community/approved events
  official:  '#3B82F6',   // blue — ingested/official events
  sand: { 50–900 }        // warm amber scale for day theme
}
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif']
}
boxShadow: {
  warm:    '0 2px 12px rgba(180,140,60,0.12)'
  warm-lg: '0 4px 24px rgba(180,140,60,0.18)'
}
borderRadius: {
  xl:  '12px'
  2xl: '16px'
  3xl: '24px'
}
```

### Special Utilities
```css
.pb-safe  /* padding-bottom: env(safe-area-inset-bottom) — iPhone home indicator */
.pt-safe  /* padding-top: env(safe-area-inset-top) */
```

### Theme Utility Classes (use these, not raw CSS vars)
```
.theme-bg        background: var(--bg)
.theme-surface   background: var(--surface)
.theme-surface2  background: var(--surface-2)
.theme-border    border-color: var(--border)
.theme-border-s  border-color: var(--border-subtle)  ← most used
.theme-text      color: var(--text)
.theme-muted     color: var(--text-muted)
.theme-faint     color: var(--text-faint)
.theme-shadow    box-shadow: 0 2px 12px var(--shadow)
.theme-shadow-lg box-shadow: 0 4px 24px var(--shadow)
.theme-input     background + border + color + focus + placeholder
.theme-btn-accent  accent background with hover state
```

### Typography
- **Font**: Inter (loaded from Google Fonts)
- **Headings**: `font-semibold` or `font-bold`, `theme-text`
- **Body**: `text-sm`, `theme-text`
- **Labels/caps**: `text-xs font-semibold theme-muted uppercase tracking-widest`
- **Faint labels**: `text-xs theme-faint`

### Event Type Colors
| Type | Tailwind class | Hex | Used for |
|---|---|---|---|
| Official/ingested | `text-official` / `bg-official` | `#3B82F6` | Eventbrite, Ticketmaster, Open Data markers |
| Community/approved | `text-community` / `bg-community` | `#2E986A` | User-submitted + approved events |
| Places | — | `#8B5CF6` | Google Places markers (purple) |

### Category Colors (map markers + pills)
| Category | Hex | Tailwind pill class |
|---|---|---|
| Food | `#f97316` | `bg-orange-100 text-orange-700` |
| Sightseeing | `#0ea5e9` | `bg-sky-100 text-sky-700` |
| Festivals | `#ec4899` | `bg-pink-100 text-pink-700` |
| Farmers Market | `#22c55e` | `bg-green-100 text-green-700` |
| Nightlife | `#6366f1` | `bg-indigo-100 text-indigo-700` |
| Music | `#8b5cf6` | `bg-violet-100 text-violet-700` |
| Arts | `#f43f5e` | `bg-rose-100 text-rose-700` |
| Family-Friendly | `#eab308` | `bg-yellow-100 text-yellow-700` |
| Classes | `#14b8a6` | `bg-teal-100 text-teal-700` |
| Workshops | `#06b6d4` | `bg-cyan-100 text-cyan-700` |

Defined in `client/src/utils/categoryColors.js` — import `CATEGORY_HEX`, `CATEGORY_COLORS`, `ALL_CATEGORIES`.

### Map Cluster Colors
| Size | Color | Hex |
|---|---|---|
| < 10 events | Orange | `#E8601C` |
| 10–49 events | Amber | `#D97706` |
| 50+ events | Green | `#2C7A5C` |

### Dark Mode
- Toggle stored in `useThemeStore` (Zustand, persisted to localStorage as `chi-events-theme`)
- Applied by toggling `.dark` class on `<html>` in `App.jsx`
- Mapbox style swaps: day = `mapbox://styles/mapbox/light-v11`, dark = `mapbox://styles/mapbox/dark-v11`

---

## Database Schema

All tables live in Supabase (PostgreSQL + PostGIS). Extensions required: `postgis`, `pg_trgm`.

### `events`
```sql
id                   UUID PRIMARY KEY DEFAULT gen_random_uuid()
external_id          TEXT                    -- source system ID; NULL for community
source               TEXT NOT NULL           -- 'ticketmaster'|'predicthq'|'choosechicago'|'manual'|'community'
is_user_submitted    BOOLEAN DEFAULT FALSE
submitted_by_user_id UUID REFERENCES users(id)
submission_status    TEXT                    -- 'ingested'|'pending'|'approved'|'rejected'|'flagged'
verification_score   INTEGER                 -- 0–100
verification_details JSONB                   -- {geocode,date,content,url,duplicate} per-check results
submission_notes     TEXT                    -- admin note shown to submitter
contact_email        TEXT                    -- NOT public
title                TEXT NOT NULL
description          TEXT
category             TEXT[]                  -- subset of 10 categories
tags                 TEXT[]
image_url            TEXT
start_datetime       TIMESTAMPTZ NOT NULL
end_datetime         TIMESTAMPTZ
is_recurring         BOOLEAN
recurrence_rule      TEXT                    -- iCal RRULE string
venue_name           TEXT
address              TEXT
city                 TEXT
neighborhood         TEXT
coordinates          GEOGRAPHY(POINT, 4326) NOT NULL
is_free              BOOLEAN
price_min            DECIMAL(8,2)
price_max            DECIMAL(8,2)
price_notes          TEXT
official_url         TEXT
ticket_url           TEXT
content_hash         TEXT                    -- MD5(title+start_datetime+address)
is_active            BOOLEAN DEFAULT TRUE
created_at           TIMESTAMPTZ DEFAULT NOW()
updated_at           TIMESTAMPTZ DEFAULT NOW()

UNIQUE(source, external_id)
```

**Map filter**: `WHERE submission_status IN ('ingested','approved') AND is_active = TRUE`

### `users`
```sql
id               UUID PRIMARY KEY  -- matches Supabase Auth user ID exactly
display_name     TEXT
avatar_url       TEXT
email            TEXT
is_admin         BOOLEAN DEFAULT FALSE
is_banned        BOOLEAN DEFAULT FALSE
submission_count INTEGER DEFAULT 0
approved_count   INTEGER DEFAULT 0
bio              TEXT
age              INTEGER CHECK (age >= 13 AND age <= 120)
gender           TEXT
interests        TEXT[] DEFAULT '{}'
preferences      JSONB DEFAULT '{}'   -- { categories, max_distance_km, budget, group_size, mobility, avoid }
home_location    GEOGRAPHY(POINT,4326)
home_address     TEXT
onboarding_complete BOOLEAN DEFAULT FALSE
created_at       TIMESTAMPTZ DEFAULT NOW()
```

### `comments`
```sql
id             UUID PRIMARY KEY DEFAULT gen_random_uuid()
event_id       UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE
user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
body           TEXT NOT NULL
type           TEXT DEFAULT 'general'  -- 'general'|'looking_to_join'|'carpool_offer'|'carpool_request'|'question'
reply_to_name  TEXT                    -- display name of user being replied to
reported_count INTEGER DEFAULT 0
is_deleted     BOOLEAN DEFAULT FALSE
created_at     TIMESTAMPTZ DEFAULT NOW()
updated_at     TIMESTAMPTZ DEFAULT NOW()
```

### `event_submission_log`
```sql
id                    UUID PRIMARY KEY DEFAULT gen_random_uuid()
event_id              UUID REFERENCES events(id)
action                TEXT  -- 'submitted'|'auto_approved'|'auto_rejected'|'admin_approved'|'admin_rejected'|'flagged'|'edited'
actor_user_id         UUID
note                  TEXT
verification_snapshot JSONB
created_at            TIMESTAMPTZ DEFAULT NOW()
```

### `saved_events`
```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE
created_at TIMESTAMPTZ DEFAULT NOW()
UNIQUE(user_id, event_id)
```

### `places`
```sql
id                       UUID PRIMARY KEY DEFAULT gen_random_uuid()
external_id              TEXT                    -- Google place_id
source                   TEXT                    -- 'google'|'yelp'|'manual'
name                     TEXT NOT NULL
category                 TEXT[]                  -- 'Restaurant','Coffee','Bar','Park','Trail','Museum','Movie Theater','Spa','Shopping','Sports','Live Music Venue'
subcategory              TEXT                    -- 'Italian', 'Nature Trail', etc.
description              TEXT
address                  TEXT
neighborhood             TEXT
city                     TEXT DEFAULT 'Chicago'
coordinates              GEOGRAPHY(Point,4326)
hours                    JSONB                   -- { mon: "11am-10pm", ... }
price_level              INTEGER                 -- 1-4 ($, $$, $$$, $$$$)
rating                   DECIMAL(2,1)
review_count             INTEGER
image_url                TEXT
website_url              TEXT
reservation_url          TEXT
typical_duration_minutes INTEGER
best_time_to_visit       TEXT
insider_tip              TEXT
is_outdoor               BOOLEAN
requires_reservation     BOOLEAN DEFAULT FALSE
is_active                BOOLEAN DEFAULT TRUE
content_hash             TEXT
created_at               TIMESTAMPTZ DEFAULT NOW()
updated_at               TIMESTAMPTZ DEFAULT NOW()

UNIQUE(source, external_id)
```

### `conversations`
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
name        TEXT              -- NULL for DMs, required for groups
is_group    BOOLEAN DEFAULT FALSE
is_public   BOOLEAN DEFAULT FALSE
event_id    UUID REFERENCES events(id) ON DELETE SET NULL
created_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
max_members INTEGER DEFAULT 300
created_at  TIMESTAMPTZ DEFAULT NOW()
updated_at  TIMESTAMPTZ DEFAULT NOW()  -- updated on each new message
```

### `conversation_members`
```sql
conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE
user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
role            TEXT DEFAULT 'member'  -- 'admin'|'member'
joined_at       TIMESTAMPTZ DEFAULT NOW()
PRIMARY KEY(conversation_id, user_id)
```

### `messages`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE
sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
body            TEXT NOT NULL
is_deleted      BOOLEAN DEFAULT FALSE
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### `trips`
```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
name       TEXT NOT NULL DEFAULT 'My Day Trip'
date       DATE NOT NULL
is_public  BOOLEAN DEFAULT FALSE
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

### `trip_events`
```sql
id       UUID PRIMARY KEY DEFAULT gen_random_uuid()
trip_id  UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE
event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE
position INTEGER NOT NULL DEFAULT 0
note     TEXT
UNIQUE(trip_id, event_id)
```

### `user_blocks`
```sql
blocker_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
blocked_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
created_at  TIMESTAMPTZ DEFAULT NOW()
PRIMARY KEY(blocker_id, blocked_id)
CHECK(blocker_id <> blocked_id)
```

### `user_reports`
```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
reporter_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
reported_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
reason       TEXT
reviewed     BOOLEAN DEFAULT FALSE
created_at   TIMESTAMPTZ DEFAULT NOW()
CHECK(reporter_id <> reported_id)
```

### Key Indexes
```sql
CREATE INDEX ON events USING GIST (coordinates);
CREATE INDEX ON events (submission_status, is_active);
CREATE INDEX ON events (submitted_by_user_id);
CREATE INDEX ON events (start_datetime);
CREATE INDEX ON events USING GIN (category);
CREATE INDEX ON saved_events (user_id);
CREATE INDEX ON saved_events (event_id);
CREATE INDEX ON conversations (created_by);
CREATE INDEX ON conversations (event_id) WHERE event_id IS NOT NULL;
CREATE INDEX ON conversation_members (user_id);
CREATE INDEX ON messages (conversation_id, created_at);
CREATE INDEX ON trips (user_id);
CREATE INDEX ON trip_events (trip_id, position);
CREATE INDEX ON user_blocks (blocked_id);
CREATE INDEX ON user_reports (reported_id, reviewed);
CREATE INDEX ON places USING GIST (coordinates);
CREATE INDEX ON places USING GIN (category);
CREATE INDEX ON places (is_active);
```

### Database Functions (RPCs)
```sql
events_within_bounds(p_north, p_south, p_east, p_west)  -- spatial query for map viewport
events_within_radius(p_lat, p_lng, p_radius_km)         -- radius search
find_duplicate_events(p_title, p_date)                  -- pg_trgm similarity > 0.6
find_dm(p_user1, p_user2)                               -- find existing DM conversation
increment_reported_count(comment_id)                    -- atomic increment
```

---

## API Conventions

### Base URL
- Dev: `http://localhost:3001/api/v1`
- Prod: `https://[railway-url]/api/v1`
- Set in client as `VITE_API_BASE_URL`

### Auth Header
```
Authorization: Bearer <supabase_access_token>
```
Get token client-side: `const { data: { session } } = await supabase.auth.getSession()`

### Auth Levels
- **Public**: no token required
- **Auth** (`checkAuth`): valid Supabase JWT required → `req.user` populated
- **Admin** (`checkAdmin`): valid JWT + `users.is_admin = TRUE` → `req.adminUser` populated

### Response Format
- Success: returns data directly (array or object)
- Error: `{ error: "message string" }`
- All HTTP errors use appropriate status codes (400, 401, 403, 404, 500)

### Coordinates
- Stored in DB as `GEOGRAPHY(POINT, 4326)` — PostGIS returns raw WKB hex
- Parsed server-side in `server/src/utils/parseCoordinates.js` before sending to client
- Client always receives: `{ type: 'Point', coordinates: [lng, lat] }` (GeoJSON format)
- When submitting from client: use WKT string `POINT(lng lat)`

### Array Query Params
Use repeated keys, not comma-joined: `category=Music&category=Food`
The `toQueryString()` helper in `client/src/services/api.js` handles this automatically.

### All Endpoints

#### Events
```
GET  /api/v1/events                     Public  List events with filters
GET  /api/v1/events/within-bounds       Public  Map viewport query (must register before /:id)
GET  /api/v1/events/:id                 Public  Single event
POST /api/v1/events/:id/save            Auth    Toggle bookmark
GET  /api/v1/events/:id/saved           Auth    Check if bookmarked
GET  /api/v1/events/:id/groups          Public  Public group chats linked to event
GET  /api/v1/events/:id/comments        Public  List comments
POST /api/v1/events/:id/comments        Auth    Post comment
```

#### Auth
```
POST /api/v1/auth/sync                  Public  Upsert user on first login (no JWT needed)
GET  /api/v1/auth/me                    Auth    Current user + profile
POST /api/v1/auth/geocode               Auth    Address → lat/lng (Mapbox proxy)
GET  /api/v1/auth/users/search          Auth    Search users by display_name
```

#### Submissions
```
POST /api/v1/submissions                Auth    Create community submission
GET  /api/v1/submissions/mine           Auth    User's own submissions
PUT  /api/v1/submissions/:id            Auth    Edit + resubmit rejected event
```

#### Admin (all require checkAdmin)
```
GET  /api/v1/admin/submissions          Admin   Pending queue sorted by score
GET  /api/v1/admin/submissions/all      Admin   All submissions (filter by status)
PUT  /api/v1/admin/submissions/:id/approve  Admin
PUT  /api/v1/admin/submissions/:id/reject   Admin
PUT  /api/v1/admin/submissions/:id/flag     Admin
GET  /api/v1/admin/flagged              Admin   Flagged events
GET  /api/v1/admin/reported-comments    Admin
DELETE /api/v1/admin/comments/:id       Admin   Soft-delete comment
POST /api/v1/admin/users/:id/ban        Admin
GET  /api/v1/admin/user-reports         Admin
POST /api/v1/admin/user-reports/:id/review  Admin
```

#### Collections
```
GET  /api/v1/me/collections             Auth    { saved: [...], commented: [...] }
```

#### Comments
```
POST /api/v1/comments/:id/report        Auth    Increment reported_count via RPC
DELETE /api/v1/comments/:id             Admin   Soft-delete (sets is_deleted=true)
```

#### Conversations & Messaging
```
POST /api/v1/conversations              Auth    Create DM or group chat
GET  /api/v1/conversations              Auth    List user's conversations
GET  /api/v1/conversations/:id          Auth    Conversation + members + is_locked
GET  /api/v1/conversations/:id/messages Auth    Paginated message history
POST /api/v1/conversations/:id/messages Auth    Send message (DM locked after 1 msg if no reply)
POST /api/v1/conversations/:id/members  Auth    Add member (admin only)
DELETE /api/v1/conversations/:id/members/me  Auth  Leave conversation
```

#### Trips
```
GET  /api/v1/trips/me/list              Auth    User's saved trips
GET  /api/v1/trips/:id                  Public  Single trip (if is_public or owner)
POST /api/v1/trips                      Auth    Create trip
PUT  /api/v1/trips/:id                  Auth    Update name/date/is_public
DELETE /api/v1/trips/:id                Auth    Delete trip
POST /api/v1/trips/:id/events           Auth    Add event to trip
DELETE /api/v1/trips/:id/events/:event_id  Auth  Remove event from trip
PUT  /api/v1/trips/:id/events/reorder   Auth    Update positions
```

#### Users
```
GET  /api/v1/users/:id                  Public  User profile
PUT  /api/v1/users/me                   Auth    Update own profile
POST /api/v1/users/:id/block            Auth    Block user
DELETE /api/v1/users/:id/block          Auth    Unblock user
GET  /api/v1/users/me/blocks            Auth    List blocked users
POST /api/v1/users/:id/report           Auth    Report user
```

#### Ingestion (manual triggers — protect in prod)
```
POST /api/v1/ingest/ticketmaster        Public  Runs Ticketmaster worker in background
POST /api/v1/ingest/predicthq           Public  Runs PredictHQ worker in background
POST /api/v1/ingest/chicago-open-data   Public  Runs Chicago Open Data worker in background
POST /api/v1/ingest/suburbs             Public  Runs suburban iCal ingestion in background
POST /api/v1/ingest/data-quality        Public  Runs data quality agent in background
POST /api/v1/ingest/google-places       Public  Runs Google Places ingestion in background
```

#### Recommendations
```
GET  /api/v1/recommendations?date=saturday|sunday|YYYY-MM-DD  Auth  AI-curated picks for user
```

#### Places
```
GET  /api/v1/places                     Public  List places with filters
GET  /api/v1/places/within-bounds       Public  Map viewport query
GET  /api/v1/places/:id                 Public  Single place
```

#### Itinerary
```
POST /api/v1/itinerary/build            Auth    Build AI itinerary from event_ids + date
GET  /api/v1/itinerary/mine             Auth    List user's saved itineraries
POST /api/v1/itinerary                  Auth    Save an itinerary (generates share_token if is_public)
PUT  /api/v1/itinerary/:id              Auth    Update title / is_public
GET  /api/v1/itinerary/share/:token     Public  Public shareable itinerary (no auth)
```

#### Preferences
```
GET  /api/v1/auth/preferences           Auth    Current user preferences + home_coords
PUT  /api/v1/auth/preferences           Auth    Save preferences + geocode home_address
```

#### Weather
```
GET  /api/v1/weather?lat=&lng=&date=    Public  Single-day forecast (defaults to Chicago)
GET  /api/v1/weather                    Public  Weekend forecast (saturday + sunday)
```

#### Health
```
GET  /api/v1/health                     Public  { status: 'ok', timestamp }
```

---

## Data Ingestion

### Sources
| Source | File | Schedule | Covers | API Key |
|---|---|---|---|---|
| Ticketmaster | `server/src/ingestion/ticketmaster.js` | Every 6h + startup | Concerts, sports, theater, major ticketed events | `TICKETMASTER_API_KEY` |
| PredictHQ | `server/src/ingestion/predicthq.js` | Every 12h + startup | Community events, classes, workshops, festivals (aggregates 19+ sources incl. Eventbrite) | `PREDICTHQ_API_KEY` |
| Chicago Open Data | `server/src/ingestion/chicago-open-data.js` | Daily 3am + startup | Park permits, outdoor events | None (public) |
| Suburban iCal | `server/src/ingestion/suburbs-ical.js` | Daily 3:30am | Evanston, Oak Park, Naperville, Schaumburg city event calendars | None (public iCal) |
| Google Places | `server/src/ingestion/google-places.js` | Manual trigger | Restaurants, cafes, bars, parks, museums, spas, cinemas, shopping | `GOOGLE_PLACES_API_KEY` |

> **Eventbrite API deprecated (2023)** — returns 404 for all search requests. Do not attempt to re-add it.

### Ingestion Pipeline (all workers follow same pattern)
1. Fetch raw data from source API
2. Normalize to standard schema — set `source`, `is_user_submitted=false`, `submission_status='ingested'`
3. Compute `content_hash = MD5(title + start_datetime + address)`
4. Upsert via `server/src/ingestion/upsert.js` — skip if hash unchanged, update if changed, insert if new
5. All operations idempotent — safe to run repeatedly

### Startup Ingestion
All three workers run immediately when `scheduler.start()` is called in `server/src/index.js`. This ensures fresh data on every Railway deploy without waiting for a cron window.

### Chicago Open Data Geocoding
The park permit dataset has no coordinates. Each event is geocoded via `MAPBOX_SECRET_TOKEN` server-side. Falls back to Chicago center (`41.8781, -87.6298`) if geocoding fails.

---

## Frontend State Management

### Zustand Stores (`client/src/store/`)

#### `filters.js` — filter state, shared by MapView + EventList
```js
categories: []        // active category filters
startDate: null       // 'YYYY-MM-DD' or null
endDate: null         // 'YYYY-MM-DD' or null
searchQuery: ''
neighborhood: ''      // e.g. 'Lincoln Park'
radius: null          // km, null = no filter
```

#### `trip.js` — day trip planner state
```js
tripMode: false
tripDate: null        // 'YYYY-MM-DD'
tripId: null          // saved DB trip ID
tripName: 'My Day Trip'
tripEvents: []        // [{id, event_id, position, event: {...}}]
routeMode: 'driving'  // 'driving'|'walking'
```

#### `theme.js` — dark mode (persisted to localStorage)
```js
dark: false
toggle: () => void
```

---

## Frontend Architecture

### Routing (`client/src/App.jsx`)
```
/                     Home (map + filters + events)
/plan                 Plan a Day — AI picks + My Day builder + itinerary
/plan/share/:token    Public shareable itinerary (no auth required)
/preferences          User preference wizard (4 sections, pre-filled)
/my-submissions       User's submission history
/collections          Saved + commented events
/messages             Messaging inbox
/messages/:id         Chat view
/trip/:id             Public shareable trip view
/my-trips             User's saved trips
/profile/me           Own profile
/profile/:userId      Another user's profile
/settings/blocks      Block list management
/admin                Admin dashboard (is_admin required)
```

### Key Components
```
Map/MapView.jsx              Main map, marker layers, clustering, directions route
Events/EventDetailPanel.jsx  Full slide-in drawer with comments, save, trip button
Events/EventList.jsx         Scrollable list beside map
Events/EventCard.jsx         Compact card
Layout/Navbar.jsx            Logo, My Submissions, Admin, Plan Trip, dark toggle, avatar
Layout/BottomNav.jsx         Mobile: Map | Plan Trip | Saved | My Trips | Profile
Layout/FiltersPanel.jsx      Category pills, date range, neighborhood, radius, legend
Filters/CategoryFilter.jsx   10 category pills with active state (hex bg + white + checkmark)
Filters/DateRangePicker.jsx  Start/end date inputs
Filters/SearchBar.jsx        Keyword search
Submissions/SubmitEventForm.jsx  5-step wizard
Trip/TripPanel.jsx           Trip itinerary, reorder, date, save/share
Trip/ShareTripModal.jsx      Copy link + send to conversation
Community/CommentThread.jsx  Realtime comments
Messaging/ChatView.jsx       DM/group chat with realtime messages
Admin/AdminDashboard.jsx     5 tabs: Pending | Flagged | Comments | User Reports | All
Admin/SubmissionReviewCard.jsx  Approve/reject/flag with verification score
Admin/VerificationScoreBar.jsx  Visual 0-100 score with per-check breakdown
Onboarding/OnboardingModal.jsx  4-step first-login wizard (categories, mobility, group, home)
Weather/WeatherBadge.jsx        Outdoor event weather indicator in EventDetailPanel
Weather/WeatherWidget.jsx       Today + weekend forecast toggle in EventList header
Places/PlaceDetailPanel.jsx     Slide-in panel: name, rating, hours, price, insider tip, website
PlanDay/PlanPlaceCard.jsx       Compact place card with + Add for Plan a Day
```

### AI Agents (`server/src/services/ai/agents/`)
```
recommendationAgent.js  Claude Sonnet picks 3-5 events with reasons + fit scores (2hr cache per user+date)
itineraryAgent.js       Claude Sonnet builds ordered day itinerary with travel times + local suggestions
dataQualityAgent.js     Rule-based nightly pass: flags admin events, infers is_outdoor, infers is_free
```

### Map State Pattern
`selectedEventId` lives in `Home.jsx`, not inside `MapView`. Both `MapView` (marker click) and `EventList` (card click) call `onSelectEvent(id)`. `EventDetailPanel` fetches full event by ID. Markers only store IDs in GeoJSON properties.

### Map FeaturesRef Pattern
GeoJSON features are stored in `featuresRef.current` (a React ref) when loaded. The flyTo effect reads from `featuresRef` to find coordinates without using Mapbox's internal `_data` property (which is unreliable). Pattern:
```js
const featuresRef = useRef([]);
// in loadEvents:
featuresRef.current = geojson.features;
// in flyTo effect:
const feature = featuresRef.current.find(f => f.properties?.id === selectedEventId);
```

### Filter → Map Data Flow
Filters in `useFiltersStore` are consumed by two independent consumers:
1. `useEvents` hook → drives `EventList` via `GET /api/v1/events`
2. `MapView.loadEvents` → drives map markers via `GET /api/v1/events/within-bounds`

Both react to filter changes independently. Map reloads via `useEffect` watching store values.

### Neighborhood Filter Behavior
When a neighborhood is selected:
1. Map flies to the neighborhood center (hardcoded in `NEIGHBORHOOD_CENTERS` in `MapView.jsx`)
2. A 5km default radius is applied if no radius is set
3. The radius uses the neighborhood center as its anchor point (not the map viewport center)
4. The text-match `neighborhood` filter is skipped for most events since ingested events have `null` neighborhood fields

### Date Filter Behavior
- Dates are sent as `YYYY-MM-DD` strings
- Backend appends `T00:00:00.000Z` for start, `T23:59:59.999Z` for end
- `within-bounds` uses `Date.getTime()` comparison (not string comparison) to handle mixed timezone formats

---

## Community Submission Flow

### Submission States
| Status | Visible on map? | Set by |
|---|---|---|
| `pending` | No | System on submit |
| `approved` | Yes (community badge) | Admin |
| `rejected` | No | Admin |
| `flagged` | No | Admin (was approved but reported) |
| `ingested` | Yes | Ingestion workers (bypasses flow) |

### Automated Verification (runs on submit)
| Check | Points | How |
|---|---|---|
| Geocoding | 30 | Mapbox — must resolve to Chicagoland (lat 41–43, lng -89 to -87) |
| Date validity | 20 | `start_datetime > NOW()`, end > start if provided |
| Content moderation | 30 | OpenAI Moderation API — title + description |
| URL reachable | 10 | HEAD request to `official_url` → 200 or 405 |
| Duplicate check | 10 | `find_duplicate_events` RPC — pg_trgm similarity > 0.6 |

Score interpretation: 80–100 = Looks Good, 50–79 = Review Needed, 0–49 = Needs Attention
Auto-reject if OpenAI flags content.

---

## Authentication

### Flow
1. User clicks "Sign in with Google" → Supabase Google OAuth
2. On redirect, `main.jsx` cleans bare `#` from URL
3. `useAuth.js` hook calls `POST /api/v1/auth/sync` with user fields → upserts `users` table
4. `useAuth` returns both `user` (Supabase Auth object) and `profile` (our `users` table row)

### Two User Objects
- `user` = Supabase Auth object → has `user_metadata.avatar_url`, `email`
- `profile` = our `users` table row → has `is_admin`, `is_banned`, `submission_count`
- **Always use `profile.is_admin`** to gate admin features, not `user`

### `/auth/sync` — No JWT Required
Called immediately after login. Accepts user fields directly from Supabase Auth. Does NOT require a JWT — avoids chicken-and-egg where the user record doesn't exist yet when JWT middleware tries to look it up.

---

## Messaging Rules

### DM 1-Message Limit
A DM is "locked" if the initiator has sent a message but the recipient has not replied yet. The API computes `is_locked` on `GET /conversations/:id` and enforces it on `POST /conversations/:id/messages`. Prevents spam.

### Block Integration
Block check runs in both directions: if A blocks B or B blocks A, neither can message the other. Blocked users are also excluded from `GET /auth/users/search` results.

---

## Environment Variables

### Server (`/server/.env`)
| Variable | Source | Required |
|---|---|---|
| `SUPABASE_URL` | Supabase → Settings → API | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API → service_role | Yes — **NEVER expose to client** |
| `TICKETMASTER_API_KEY` | developer.ticketmaster.com → My Apps → Consumer Key | Yes for Ticketmaster data |
| `PREDICTHQ_API_KEY` | predicthq.com → Settings → API Credentials | Yes for PredictHQ data |
| `OPENAI_API_KEY` | platform.openai.com → API Keys | Optional (moderation skips gracefully) |
| `MAPBOX_SECRET_TOKEN` | mapbox.com → Tokens → secret token (`sk.*`) | Yes for geocoding + submission verification |
| `PORT` | Set automatically by Railway in prod; use 3001 locally | Auto |
| `FRONTEND_URL` | Vercel URL (for CORS fallback) | Yes in prod |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | Required for recommendations + itinerary |
| `GOOGLE_PLACES_API_KEY` | console.cloud.google.com → Credentials | Required for Places ingestion |

### Client (`/client/.env`)
| Variable | Source | Required |
|---|---|---|
| `VITE_MAPBOX_TOKEN` | mapbox.com → Tokens → public token (`pk.*`) | Yes |
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` — safe to expose | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public key | Yes |
| `VITE_API_BASE_URL` | `http://localhost:3001/api/v1` (dev) / Railway URL (prod) | Yes |

### CORS Policy
The server allows: `localhost`, any `*.vercel.app` subdomain, and `FRONTEND_URL`. No credentials allowed from arbitrary origins.

---

## AI / Verification

### Content Moderation (existing)
`server/src/services/verification.js` uses **OpenAI Moderation API**:
- Endpoint: `POST https://api.openai.com/v1/moderations`
- Free API — completely separate from paid chat models
- Called on every community submission to check title + description
- Auto-rejects if flagged; skips gracefully if `OPENAI_API_KEY` not set

### AI Recommendation & Itinerary System (P3)
`server/src/services/ai/orchestrator.js` — central router for all Claude calls.

Agents under `server/src/services/ai/agents/`:
| File | Purpose |
|---|---|
| `recommendationAgent.js` | Given user prefs + weather + events → returns 3-5 curated picks with reasons |
| `itineraryAgent.js` | Given selected events → returns ordered itinerary with travel times + suggestions |
| `dataQualityAgent.js` | Nightly cron — flags permit-style events, infers is_outdoor, infers is_free |

All agents use **Claude Sonnet** (`claude-sonnet-4-6` via `@anthropic-ai/sdk`).
Key: `ANTHROPIC_API_KEY` in server env — never expose to client.

Caching: both recommendation and itinerary results are cached in-memory (Map) to prevent repeated API calls.

---

## PWA

The app is installable as a PWA on iPhone via `vite-plugin-pwa`.
- Config: `client/vite.config.js`
- Manifest: `client/public/manifest.json`
- Workbox cache limit: 4MB (default 2MB caused build failures)
- Bottom nav padding uses `pb-safe` for iPhone home indicator

---

## Key Decisions

### Why Node.js over Python
Same language as frontend, no context switching, Supabase JS SDK is first-class, Mapbox geocoding is JS-native. Python would only be added as a microservice if ML clustering is needed.

### Why Two Marker Colors (blue vs teal)
Blue (`#3B82F6`) = ingested/official events from APIs. Teal (`#2E986A`) = community-submitted and approved events. Gives users immediate visual signal of event source and trust level. Both use the same GeoJSON source with a Mapbox `match` expression on `primary_category` for color, with `is_user_submitted` driving the source badge.

### Why Supabase
Handles PostgreSQL + PostGIS hosting, Google OAuth, and Realtime subscriptions in one service. Eliminates three separate infrastructure pieces (DB host, auth provider, WebSocket server).

### Why Mapbox over Leaflet
Better free-tier clustering (GeoJSON source + cluster: true), built-in Directions API for trip routes, support for custom marker expressions, polygon draw tools available for future use.

### Why Zustand over Redux
Minimal boilerplate, no providers needed, direct store access from anywhere. Filters store has two independent consumers (map + list) — Zustand handles this cleanly.

### Why PostGIS
Native `ST_DWithin` for radius queries, `ST_Within` for bounds queries. Would be painful to do in application code. Required for geo filtering.

### WKB Parsing Decision
Supabase returns `GEOGRAPHY` columns as raw WKB hex strings. Parsed server-side in `server/src/utils/parseCoordinates.js` → client always receives standard GeoJSON. Alternative (Postgres view with `ST_AsGeoJSON`) rejected because Supabase JS client doesn't support function calls in `.select()`.

### Route Ordering: `/within-bounds` before `/:id`
Express matches routes in order. `/within-bounds` must be registered before `/:id` or Express treats `within-bounds` as a UUID. Already handled in `server/src/routes/events.js`.

### Mapbox Token Split
`VITE_MAPBOX_TOKEN` (public `pk.*`) → client for map rendering.
`MAPBOX_SECRET_TOKEN` (secret `sk.*`) → server only for geocoding proxy. Keeps secret token out of browser bundle.

### Eventbrite Deprecated
Eventbrite's public discovery API was shut down in 2023. Replaced by Ticketmaster (concerts, sports, theater) + PredictHQ (aggregates community events from 19+ sources including Eventbrite).

### Neighborhood Filter + Radius Anchor
Most ingested events have `null` neighborhood field, so text-matching neighborhood is useless. Instead, neighborhood selection flies the map to that neighborhood's hardcoded center and applies a radius filter anchored to that center — gives consistent geo-bounded results regardless of DB data quality.

### Date Comparison
End-date filter uses `T23:59:59.999Z` suffix so all events on the end date are included. Map's `within-bounds` uses `Date.getTime()` comparison (not string comparison) to handle mixed UTC/local timezone formats across different event sources.

### DM 1-Message Limit
Prevents unsolicited spam. The first message goes through; subsequent messages from the same sender are blocked until the recipient replies. Computed server-side on every send, not stored as a separate column.

---

## What NOT To Do

1. **No hardcoded hex colors in components.** Always use theme utility classes (`theme-text`, `theme-surface`, etc.) or Tailwind tokens (`text-official`, `bg-community`, `text-[var(--accent)]`).

2. **No secrets in client code.** `SUPABASE_SERVICE_KEY`, `OPENAI_API_KEY`, `MAPBOX_SECRET_TOKEN`, `TICKETMASTER_API_KEY`, `PREDICTHQ_API_KEY` must never appear in `/client`. Only `VITE_*` vars belong in the client.

3. **No direct DB calls from frontend for events.** All event queries go through the Express API (`/api/v1/events`). The Supabase client in the browser is for Auth and Realtime only.

4. **No string comparison for dates across timezones.** Use `Date.getTime()` or parse to ISO before comparing. Ingested events have mixed timezone formats.

5. **No neighborhood text-match without radius.** Most ingested events have `null` neighborhood. Use radius filter anchored to neighborhood center instead.

6. **Don't re-add Eventbrite.** Their public discovery API is permanently deprecated and returns 404.

7. **No reading Mapbox internal `_data` property.** Use the `featuresRef` pattern to store loaded features. Mapbox's `source._data` is an internal implementation detail that breaks across versions.

8. **No `md:hidden` on the bottom nav.** iPhones have viewport width ≥ 768px and would hide the nav. The bottom nav has no responsive hide class.

9. **No unsigned admin routes in production.** `POST /api/v1/ingest/*` routes should be protected with `checkAdmin` before going fully public.

10. **No amending published commits.** Create new commits. Pre-commit hooks may fail and amending would corrupt history.

---

## Milestones Status

| Milestone | Status |
|---|---|
| M1: Project scaffold | ✅ |
| M2: Database setup + seed data | ✅ |
| M3: Map with live markers | ✅ |
| M4: Filters, search, location | ✅ |
| M5: External data ingestion (Ticketmaster + PredictHQ + Chicago Open Data) | ✅ |
| M6: Authentication (Supabase Google OAuth) | ✅ |
| M7: Community comments + realtime | ✅ |
| M8: Community event submission (5-step form) | ✅ |
| M9: Automated verification system | ✅ |
| M10: Admin moderation dashboard | ✅ |
| M11: My Submissions + edit/resubmit | ✅ |
| M12: PWA + deploy (Vercel + Railway) | ✅ |
| P2: Collections (save/bookmark) | ✅ |
| P2: Messaging (DMs + group chat) | ✅ |
| P2: Day Trip Planner | ✅ |
| P2: User profiles + block/report | ✅ |
| P2: UI overhaul (day/dark theme) | ✅ |
| M10: Admin approve/reject flows | ✅ |
| P2: Admin User Reports tab | ✅ |
| Remaining: mobile polish, /trip/:id public page | 🔄 |
| P3: User Preference System (onboarding + preferences page) | ✅ |
| P3: Weather Integration (Open-Meteo + WeatherBadge) | ✅ |
| P3: AI Recommendation Engine (Claude Sonnet) | ✅ |
| P3: Plan a Day — itinerary builder + /plan page | ✅ |
| P3: Smart Map Enhancements (weather pill, home marker, For You toggle) | ✅ |
| P3: Shareable Itinerary Links (/plan/share/:token) | ✅ |
| P3: Data Quality Agent + Suburban iCal Ingestion | ✅ |
| P3: Polish (meta tags, empty states, error states) | ✅ |
| P3: Places feature (table + ingestion + map markers + detail panel + Plan a Day) | ✅ |
| Phase 4: Friday Evening Digest (Resend email) | ⬜ — documented only |
| Phase 4: Weekend Reminder (Supabase Edge Functions push) | ⬜ — documented only |
