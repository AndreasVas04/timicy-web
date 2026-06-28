-- Row Level Security policies for the TimiCY public-facing frontend.
--
-- This file must be reviewed and executed MANUALLY in the Supabase SQL
-- editor (Dashboard > SQL Editor).  It is NOT run automatically.
--
-- These policies grant SELECT-only access to the anon role on the four
-- tables the frontend reads.  The service role bypasses RLS by design,
-- so it is not mentioned here.

-- =========================================================================
-- Enable RLS on each table (idempotent — safe to run multiple times).
-- =========================================================================
ALTER TABLE products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_map     ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- SELECT-only policies for the anon role.
-- =========================================================================

CREATE POLICY "anon_select_products"
  ON products
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_select_store_products"
  ON store_products
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_select_price_history"
  ON price_history
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_select_category_map"
  ON category_map
  FOR SELECT
  TO anon
  USING (true);
