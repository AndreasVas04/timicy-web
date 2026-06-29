-- =============================================================================
-- Product search: trigram index + search_products() function
-- -----------------------------------------------------------------------------
-- Review this file, then run it manually in the Supabase SQL Editor.
-- Every statement is idempotent — safe to re-run at any time.
-- =============================================================================

-- 1. Enable the pg_trgm extension for trigram-based fuzzy matching.
create extension if not exists pg_trgm;

-- 2. GIN trigram index on brand + canonical_title.
--    Covers searches that match the brand name, the product title, or both.
create index if not exists idx_products_search_trgm
  on products
  using gin (
    (coalesce(brand, '') || ' ' || coalesce(canonical_title, ''))
    gin_trgm_ops
  );

-- 3. Search function: returns the top matches ranked by trigram similarity,
--    with a boost for exact prefix matches on canonical_title.
--    Callable by the anon role (read-only, security-definer).
create or replace function search_products(q text, max_results int default 8)
returns table (
  id int,
  canonical_title text,
  brand text,
  image_url text,
  min_price numeric,
  offer_count int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.canonical_title,
    p.brand,
    p.image_url,
    p.min_price,
    p.offer_count
  from products p
  where
    -- substring match: catches the query anywhere in brand+title regardless of
    -- title length (this is what a pure trigram `%` match misses on long titles)
    (coalesce(p.brand,'') || ' ' || coalesce(p.canonical_title,'')) ilike '%' || q || '%'
    -- OR fuzzy trigram match: provides typo tolerance (e.g. "makbook" -> MacBook)
    or (coalesce(p.brand,'') || ' ' || coalesce(p.canonical_title,'')) % q
  order by
    -- exact prefix on the title ranks highest
    (case when p.canonical_title ilike q || '%' then 1 else 0 end) desc,
    -- then a direct substring hit on the title ranks above a fuzzy-only hit
    (case when p.canonical_title ilike '%' || q || '%' then 1 else 0 end) desc,
    -- then trigram similarity
    similarity(coalesce(p.brand,'') || ' ' || coalesce(p.canonical_title,''), q) desc,
    p.offer_count desc nulls last
  limit greatest(1, least(max_results, 20));
$$;

-- 4. Allow anonymous (public) access to the search function.
grant execute on function search_products(text, int) to anon;
