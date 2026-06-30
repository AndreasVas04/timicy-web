-- ============================================================================
-- price_subscriptions
-- Stores user requests to be notified when a product's price drops to or below
-- a target. Uses a double opt-in flow: a row is created unconfirmed, and only
-- becomes active after the user clicks the confirmation link sent by email.
-- This table holds personal data (emails) and is therefore NOT readable by the
-- anonymous role. It is accessed exclusively through the service_role key from
-- protected server-side Route Handlers.
-- ============================================================================

create table public.price_subscriptions (
  -- Random UUID primary key (not a sequential int) so rows are not enumerable.
  id                 uuid        primary key default gen_random_uuid(),

  -- Subscriber email. Normalized (lowercased + trimmed) by the application
  -- before insert, so the UNIQUE(email, product_id) constraint behaves as expected.
  email              text        not null,

  -- The canonical product this alert is for. If the product is ever removed,
  -- the subscription is meaningless, so it is removed with it.
  product_id         integer     not null
                                 references public.products(id) on delete cascade,

  -- The price at or below which the user wants to be notified. Must be positive.
  target_price       numeric     not null check (target_price > 0),

  -- Which language the user was browsing in, so confirmation / future
  -- notification emails are sent in the right language.
  locale             text        not null check (locale in ('el', 'en')),

  -- false until the user clicks the confirmation link (double opt-in).
  confirmed          boolean     not null default false,

  -- One-time token embedded in the confirmation link. Set to NULL once the
  -- subscription is confirmed, so a confirmation link cannot be reused.
  -- Postgres allows multiple NULLs under a UNIQUE constraint, so many confirmed
  -- rows (all NULL here) do not collide.
  confirmation_token text        unique,

  -- Permanent token embedded in every unsubscribe link (used by the
  -- confirmation email and by all future notification emails).
  unsubscribe_token  text        not null unique,

  -- When the row was created (also used by a later cleanup job that removes
  -- stale unconfirmed rows).
  created_at         timestamptz not null default now(),

  -- When the user confirmed (NULL while still unconfirmed).
  confirmed_at       timestamptz,

  -- When the last price-drop notification was sent. Unused in this phase;
  -- added now so the notification cron (a later step) needs no migration.
  last_notified_at   timestamptz,

  -- One subscription per email per product. A re-subscribe updates the existing
  -- row (new target_price, re-triggered confirmation) instead of duplicating.
  unique (email, product_id)
);

-- Speeds up the future notification job, which scans confirmed subscriptions
-- for a given product when its price changes.
create index price_subscriptions_product_confirmed_idx
  on public.price_subscriptions (product_id, confirmed);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- Enabled with NO policies. This denies the anonymous (and authenticated) roles
-- all access. The service_role key, used only in server-side Route Handlers,
-- bypasses RLS entirely, so no policy is needed for the application to work.
-- ----------------------------------------------------------------------------
alter table public.price_subscriptions enable row level security;