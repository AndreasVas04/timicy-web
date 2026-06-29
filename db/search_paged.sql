-- Paginated product search function for the full search-results page.
--
-- Must be reviewed and run manually in the Supabase SQL editor.
-- Safe and idempotent to re-run (uses CREATE OR REPLACE).
--
-- This is a SECOND search function alongside the existing search_products,
-- which remains unchanged and powers the autocomplete dropdown. This one
-- adds pagination (limit + offset) and returns the total match count in
-- every row via a window function, so the frontend can compute total pages
-- without a separate count query.
--
-- Matching logic mirrors search_products: substring ILIKE + pg_trgm
-- similarity, with the same relevance ordering.

create or replace function search_products_paged(
  q text,
  max_results int default 24,
  result_offset int default 0
)
returns table (
  id int,
  canonical_title text,
  brand text,
  image_url text,
  min_price numeric,
  offer_count int,
  total_count bigint          -- total matches across all pages (window function)
)
language sql
stable                        -- no side effects; safe for read replicas
security definer              -- runs with the function owner's permissions
set search_path = public      -- pin search_path to avoid schema hijacking
as $$
  -- Step 1: Find all matching products using substring (ILIKE) and trigram
  -- similarity (%), and compute ranking signals for relevance ordering.
  with matches as (
    select
      p.id,
      p.canonical_title,
      p.brand,
      p.image_url,
      p.min_price,
      p.offer_count,
      -- Prefix match ranks higher than mid-string match.
      (case when p.canonical_title ilike q || '%' then 1 else 0 end) as prefix_rank,
      -- Substring match anywhere in the title.
      (case when p.canonical_title ilike '%' || q || '%' then 1 else 0 end) as substr_rank,
      -- Trigram similarity against the combined brand + title string.
      similarity(coalesce(p.brand,'') || ' ' || coalesce(p.canonical_title,''), q) as sim
    from products p
    where
      -- Substring match (catches exact and partial matches).
      (coalesce(p.brand,'') || ' ' || coalesce(p.canonical_title,'')) ilike '%' || q || '%'
      -- Trigram similarity match (catches typos and fuzzy matches).
      or (coalesce(p.brand,'') || ' ' || coalesce(p.canonical_title,'')) % q
  )
  select
    m.id, m.canonical_title, m.brand, m.image_url, m.min_price, m.offer_count,
    -- count(*) over() computes the grand total across the entire match set
    -- BEFORE limit/offset is applied, so every returned row carries the
    -- total for pagination math (total_pages = ceil(total_count / page_size)).
    count(*) over() as total_count
  from matches m
  -- Relevance ordering: prefix matches first, then substring matches,
  -- then by trigram similarity, finally by popularity (offer count).
  order by m.prefix_rank desc, m.substr_rank desc, m.sim desc, m.offer_count desc nulls last
  -- Clamp max_results between 1 and 100 to prevent abuse.
  limit greatest(1, least(max_results, 100))
  -- Clamp offset to non-negative.
  offset greatest(0, result_offset);
$$;

-- Allow the anonymous (public) role to call this function.
grant execute on function search_products_paged(text, int, int) to anon;
