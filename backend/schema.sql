-- =============================================================================
-- YosenaMora Vaults - relational schema
--
-- One table per collection currently held as a JSON file in backend/data/.
-- Written for PostgreSQL. The only code that touches storage is the `db` object
-- in backend/data/db.ts, so migrating means reimplementing that one module
-- against these tables - no route handler, controller or component changes.
--
-- Two shapes flatten out of the JSON on the way in:
--   * order line items      -> order_items
--   * policy body sections  -> policy_sections
-- Both are 1-to-many child tables rather than JSON columns, so they can be
-- queried and ordered directly.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- Enumerated domains. These are currently enforced only in TypeScript; as
-- database types they also hold against anything writing outside the app.
-- -----------------------------------------------------------------------------
CREATE TYPE gem_category   AS ENUM ('Diamond','Sapphire','Emerald','Ruby','Spinel','Tourmaline');
CREATE TYPE gem_shape      AS ENUM ('Emerald Cut','Cushion','Round Brilliant','Oval','Pear','Asscher');
CREATE TYPE gem_status     AS ENUM ('In Vault','On Memo','Reserved');
CREATE TYPE account_role   AS ENUM ('trade_partner','admin','jeweller');
CREATE TYPE booking_status AS ENUM ('Confirmed','Pending Review','Cancelled');
CREATE TYPE service_format AS ENUM ('Virtual','In-Person Vault','Atelier Visit');
CREATE TYPE post_category  AS ENUM ('Gemology','Market Intelligence','Ethical Sourcing','Atelier Craft');


-- -----------------------------------------------------------------------------
-- users - trade accounts. Source: backend/data/users.json
--
-- Clerk owns identity: credentials, email verification and sign-in all live
-- there, which is why this table has no password column. What stays here is the
-- trade relationship Clerk knows nothing about - member id, tier, credit line
-- and role - joined to the Clerk account by clerk_user_id.
--
-- The internal id remains the primary key because memos, orders and
-- saved_stones already reference it. clerk_user_id is nullable so a trade
-- record can be created by the desk before that person has ever signed in.
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id                TEXT PRIMARY KEY,
  clerk_user_id     TEXT,
  email             TEXT          NOT NULL,
  client_name       TEXT          NOT NULL,
  company_name      TEXT          NOT NULL DEFAULT '',
  member_id         TEXT          NOT NULL,
  account_role      account_role  NOT NULL DEFAULT 'trade_partner',
  tier              TEXT          NOT NULL DEFAULT 'Standard',
  credit_line_usd   NUMERIC(14,2) NOT NULL DEFAULT 0,
  phone             TEXT          NOT NULL DEFAULT '',
  address           TEXT          NOT NULL DEFAULT '',
  is_verified_trade BOOLEAN       NOT NULL DEFAULT FALSE,
  notify_drops      BOOLEAN       NOT NULL DEFAULT TRUE,
  notify_memos      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT users_email_key  UNIQUE (email),
  CONSTRAINT users_member_key UNIQUE (member_id),
  CONSTRAINT users_clerk_key  UNIQUE (clerk_user_id)
);

-- Every authenticated request resolves the Clerk subject to a trade record.
CREATE INDEX users_clerk_user_id_idx ON users (clerk_user_id);

-- Sign-in matches on lower(email); a plain UNIQUE would still admit
-- "Arthur@..." alongside "arthur@...".
CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));


-- -----------------------------------------------------------------------------
-- uploads - stone photography, held as base64 text.
--
-- The bytes live in the database rather than on disk so they survive a deploy,
-- are covered by the same backup as everything else, and cannot be orphaned by
-- a file left behind after a record changes.
--
-- Deliberately its own table rather than a column on gemstones: the catalog
-- query selects every gemstone column, and an inline image would make each
-- listing carry megabytes of encoded text. Here the bytes are only read when
-- /api/uploads/<id> asks for one image by id.
--
-- base64 costs about a third more storage than bytea would. That is the price
-- of the format, and at catalog scale (tens of stones, not millions) it is not
-- a meaningful amount.
-- -----------------------------------------------------------------------------
CREATE TABLE uploads (
  id           TEXT PRIMARY KEY,
  content_type TEXT        NOT NULL,
  data_base64  TEXT        NOT NULL,
  byte_size    INTEGER     NOT NULL CHECK (byte_size > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- -----------------------------------------------------------------------------
-- gemstones - vault inventory. Source: backend/data/gemstones.json
-- -----------------------------------------------------------------------------
CREATE TABLE gemstones (
  id              TEXT PRIMARY KEY,
  name            TEXT          NOT NULL,
  category        gem_category  NOT NULL,
  shape           gem_shape     NOT NULL,
  carat           NUMERIC(8,2)  NOT NULL CHECK (carat > 0),
  color           TEXT          NOT NULL,
  clarity         TEXT          NOT NULL,
  origin          TEXT          NOT NULL,
  treatment       TEXT          NOT NULL,
  certification   TEXT          NOT NULL,
  cert_number     TEXT          NOT NULL,
  price_usd       NUMERIC(14,2) NOT NULL CHECK (price_usd >= 0),
  price_per_carat NUMERIC(14,2) NOT NULL CHECK (price_per_carat >= 0),
  dimensions      TEXT          NOT NULL DEFAULT '',
  image           TEXT          NOT NULL DEFAULT '',
  featured        BOOLEAN       NOT NULL DEFAULT FALSE,
  status          gem_status    NOT NULL DEFAULT 'In Vault',
  description     TEXT          NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- A lab certificate number identifies exactly one stone.
  CONSTRAINT gemstones_cert_key UNIQUE (cert_number)
);

-- /api/gemstones filters on each of these; the last backs ?featured=true.
CREATE INDEX gemstones_category_idx ON gemstones (category);
CREATE INDEX gemstones_status_idx   ON gemstones (status);
CREATE INDEX gemstones_price_idx    ON gemstones (price_usd);
CREATE INDEX gemstones_carat_idx    ON gemstones (carat);
CREATE INDEX gemstones_featured_idx ON gemstones (featured) WHERE featured;

-- Backs the ?search= parameter, which currently scans every stone in JS.
CREATE INDEX gemstones_search_idx ON gemstones
  USING gin (to_tsvector('english',
    name || ' ' || origin || ' ' || color || ' ' || clarity || ' ' || cert_number || ' ' || description));


-- -----------------------------------------------------------------------------
-- saved_stones - each member's vault shortlist.
-- Replaces users.savedStoneIds[]; a join table keeps the FK to gemstones real.
-- -----------------------------------------------------------------------------
CREATE TABLE saved_stones (
  user_id     TEXT        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  gemstone_id TEXT        NOT NULL REFERENCES gemstones(id) ON DELETE CASCADE,
  saved_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, gemstone_id)
);


-- -----------------------------------------------------------------------------
-- consultation_services - bookable appointment tiers.
-- Source: backend/data/services.json
-- -----------------------------------------------------------------------------
CREATE TABLE consultation_services (
  id           TEXT PRIMARY KEY,
  title        TEXT           NOT NULL,
  duration     TEXT           NOT NULL,
  type         service_format NOT NULL,
  fee          TEXT           NOT NULL,
  description  TEXT           NOT NULL DEFAULT '',
  suitable_for TEXT           NOT NULL DEFAULT '',
  sort_order   INTEGER        NOT NULL DEFAULT 0,
  is_active    BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX consultation_services_active_idx ON consultation_services (is_active, sort_order);


-- -----------------------------------------------------------------------------
-- bookings - consultation appointments. Source: backend/data/bookings.json
--
-- service_id is ON DELETE SET NULL and service_title is stored alongside it, so
-- retiring a tier never rewrites the history of what a client actually booked.
-- -----------------------------------------------------------------------------
CREATE TABLE bookings (
  id               TEXT PRIMARY KEY,
  service_id       TEXT           REFERENCES consultation_services(id) ON DELETE SET NULL,
  service_title    TEXT           NOT NULL,
  appointment_date DATE           NOT NULL,
  appointment_time TEXT           NOT NULL,
  client_name      TEXT           NOT NULL,
  company_name     TEXT           NOT NULL DEFAULT '',
  email            TEXT           NOT NULL,
  phone            TEXT           NOT NULL DEFAULT '',
  specific_inquiry TEXT           NOT NULL DEFAULT '',
  status           booking_status NOT NULL DEFAULT 'Confirmed',
  reference_number TEXT           NOT NULL,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),

  -- Clients quote this back to the desk, so it must resolve to one booking.
  CONSTRAINT bookings_reference_key UNIQUE (reference_number)
);

CREATE INDEX bookings_email_idx ON bookings (lower(email));
CREATE INDEX bookings_date_idx  ON bookings (appointment_date);


-- -----------------------------------------------------------------------------
-- memos - consignment stones out with a member. Source: backend/data/memos.json
--
-- days_remaining is deliberately NOT stored: it is a countdown that would be
-- wrong the day after it was written. Derive it from the inspection deadline.
-- -----------------------------------------------------------------------------
CREATE TABLE memos (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  member_id          TEXT          NOT NULL,
  company_name       TEXT          NOT NULL DEFAULT '',
  gemstone_id        TEXT          REFERENCES gemstones(id) ON DELETE SET NULL,
  stone_name         TEXT          NOT NULL,
  date_dispatched    DATE          NOT NULL,
  inspection_due     DATE          NOT NULL,
  courier            TEXT          NOT NULL DEFAULT '',
  tracking           TEXT          NOT NULL DEFAULT '',
  declared_value_usd NUMERIC(14,2) NOT NULL DEFAULT 0,
  status             TEXT          NOT NULL,
  notes              TEXT,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT memos_window_valid CHECK (inspection_due >= date_dispatched)
);

CREATE INDEX memos_user_idx ON memos (user_id);
CREATE INDEX memos_due_idx  ON memos (inspection_due);

-- What the member portal reads: days_remaining computed rather than stored.
CREATE VIEW active_memos AS
SELECT m.*,
       GREATEST(0, (m.inspection_due - CURRENT_DATE)) AS days_remaining
FROM memos m;


-- -----------------------------------------------------------------------------
-- orders + order_items - acquisitions. Source: backend/data/orders.json
--
-- The JSON holds items[] inline; as a child table each line is queryable and
-- carries its own FK to the stone sold.
-- -----------------------------------------------------------------------------
CREATE TABLE orders (
  id               TEXT PRIMARY KEY,
  user_id          TEXT          REFERENCES users(id) ON DELETE SET NULL,
  member_id        TEXT,
  client_name      TEXT          NOT NULL,
  company_name     TEXT          NOT NULL DEFAULT '',
  email            TEXT          NOT NULL,
  total_usd        NUMERIC(14,2) NOT NULL CHECK (total_usd >= 0),
  payment_method   TEXT          NOT NULL,
  shipping_service TEXT          NOT NULL,
  status           TEXT          NOT NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX orders_user_idx  ON orders (user_id);
CREATE INDEX orders_email_idx ON orders (lower(email));

CREATE TABLE order_items (
  id          BIGSERIAL PRIMARY KEY,
  order_id    TEXT          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  gemstone_id TEXT          REFERENCES gemstones(id) ON DELETE SET NULL,

  -- Name, carat and price are copied, not joined: an order is a financial
  -- record of what was sold at that moment, and must not move when the
  -- catalog is repriced or a stone is delisted.
  name        TEXT          NOT NULL,
  carat       NUMERIC(8,2)  NOT NULL,
  price_usd   NUMERIC(14,2) NOT NULL,
  quantity    INTEGER       NOT NULL CHECK (quantity > 0)
);

CREATE INDEX order_items_order_idx ON order_items (order_id);


-- -----------------------------------------------------------------------------
-- quote_requests - wholesale sourcing enquiries. Source: backend/data/quotes.json
-- -----------------------------------------------------------------------------
CREATE TABLE quote_requests (
  id                       TEXT PRIMARY KEY,
  gem_type                 TEXT          NOT NULL,
  shape                    TEXT          NOT NULL,
  carat_min                NUMERIC(8,2)  NOT NULL,
  carat_max                NUMERIC(8,2)  NOT NULL,
  target_budget            NUMERIC(14,2) NOT NULL DEFAULT 0,
  quantity                 INTEGER       NOT NULL CHECK (quantity > 0),
  certification_preference TEXT          NOT NULL DEFAULT '',
  jeweller_business        TEXT          NOT NULL,
  contact_email            TEXT          NOT NULL,
  notes                    TEXT          NOT NULL DEFAULT '',
  estimated_unit_price     NUMERIC(14,2),
  estimated_total          NUMERIC(14,2),
  status                   TEXT          NOT NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT quote_carat_range CHECK (carat_max >= carat_min)
);

CREATE INDEX quote_requests_email_idx ON quote_requests (lower(contact_email));


-- -----------------------------------------------------------------------------
-- blog_posts - The YosenaMora Gazette. Source: backend/data/blogPosts.json
--
-- body_paragraphs is TEXT[] rather than a child table: paragraphs are only ever
-- read and rendered as a whole article, never queried individually.
-- -----------------------------------------------------------------------------
CREATE TABLE blog_posts (
  id              TEXT PRIMARY KEY,
  title           TEXT          NOT NULL,
  category        post_category NOT NULL,
  read_time       TEXT          NOT NULL DEFAULT '',
  published_on    DATE,
  display_date    TEXT          NOT NULL DEFAULT '',
  excerpt         TEXT          NOT NULL DEFAULT '',
  author          TEXT          NOT NULL,
  author_role     TEXT          NOT NULL DEFAULT '',
  image           TEXT          NOT NULL DEFAULT '',
  body_paragraphs TEXT[]        NOT NULL DEFAULT '{}',
  sort_order      INTEGER       NOT NULL DEFAULT 0,
  is_published    BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX blog_posts_published_idx ON blog_posts (is_published, sort_order);
CREATE INDEX blog_posts_category_idx  ON blog_posts (category);


-- -----------------------------------------------------------------------------
-- policies + policy_sections - legal documents.
-- Source: backend/data/policies.json
--
-- slug is the value the front end passes as PolicyType ('ethical-sourcing',
-- 'shipping-returns', 'terms', 'privacy', 'cookies', 'legal-notice',
-- 'accessibility').
-- -----------------------------------------------------------------------------
CREATE TABLE policies (
  id         TEXT PRIMARY KEY,
  slug       TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  subtitle   TEXT        NOT NULL DEFAULT '',
  sort_order INTEGER     NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT policies_slug_key UNIQUE (slug)
);

CREATE TABLE policy_sections (
  id         BIGSERIAL PRIMARY KEY,
  policy_id  TEXT    NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  heading    TEXT    NOT NULL,
  body       TEXT    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT policy_sections_order_key UNIQUE (policy_id, sort_order)
);

CREATE INDEX policy_sections_policy_idx ON policy_sections (policy_id, sort_order);


-- -----------------------------------------------------------------------------
-- chat_logs - concierge transcript, read by the admin dashboard.
--
-- Currently held in memory by src/app/api/chat/route.ts, so it empties on every
-- server restart. This is the one table with no JSON file behind it.
-- -----------------------------------------------------------------------------
CREATE TABLE chat_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT        REFERENCES users(id) ON DELETE SET NULL,
  session_id   TEXT,
  user_message TEXT        NOT NULL,
  bot_reply    TEXT        NOT NULL,
  handoff      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The dashboard lists newest first and filters to handoffs.
CREATE INDEX chat_logs_created_idx ON chat_logs (created_at DESC);
CREATE INDEX chat_logs_handoff_idx ON chat_logs (created_at DESC) WHERE handoff;
