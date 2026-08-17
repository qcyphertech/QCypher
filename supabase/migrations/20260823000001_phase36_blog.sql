-- Phase 36: AI Blog Generation, Publishing & Citation Tracking (v1, scoped)
--
-- Scoped down from the original spec, which assumed infrastructure this
-- app doesn't have: a `goods_services` table (real one is `catalog_items`),
-- a `tenant_users` role table (roles actually live in the JWT via
-- `public.user_role()`/`public.is_super_admin()`), a `tenants.location`
-- column (doesn't exist), pg_cron (this project deliberately uses Vercel
-- Cron instead, see 20260806000002_phase22_audit_logs.sql), and per-tenant
-- GitHub-repo-backed websites (don't exist — tenants only have a CRM
-- workspace and the shared customer portal at /portal/[slug]).
--
-- v1 publishing targets: QCypher's own marketing site (/blog) for
-- is_qcypher_blog rows, and the tenant's existing customer portal
-- (/portal/[slug]/blog) for tenant rows. AI generation reuses the
-- already-wired Gemini integration (GEMINI_API_KEY), not a new DeepSeek
-- dependency. Citation tracking is manual, as the original spec intended.

create table blog_articles (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid references tenants(id) on delete cascade,
  is_qcypher_blog     boolean not null default false,
  title               text not null,
  slug                text not null,
  content             text not null,
  excerpt             text,
  status              text not null default 'draft'
                        check (status in ('draft', 'pending_approval', 'published')),
  ai_generated        boolean not null default true,
  views_count         int not null default 0,
  approved_by         uuid references auth.users(id) on delete set null,
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- A QCypher blog has no tenant; a tenant blog must have one.
  constraint blog_articles_tenant_matches_flag
    check (
      (is_qcypher_blog = true and tenant_id is null) or
      (is_qcypher_blog = false and tenant_id is not null)
    )
);

-- Slugs only need to be unique within their own namespace (QCypher blogs
-- vs. each tenant's own blog), not globally — two different tenants (or
-- a tenant and QCypher) should each be able to use "5-tips-for-spring".
create unique index blog_articles_qcypher_slug_idx
  on blog_articles (slug) where is_qcypher_blog = true;
create unique index blog_articles_tenant_slug_idx
  on blog_articles (tenant_id, slug) where is_qcypher_blog = false;

create index blog_articles_tenant_idx on blog_articles (tenant_id);
create index blog_articles_status_idx on blog_articles (status);
create index blog_articles_published_idx on blog_articles (published_at desc);

alter table blog_articles enable row level security;

-- Public can read published posts (both QCypher's and any tenant's —
-- these render on public pages, /blog and /portal/[slug]/blog).
create policy "blog_articles: public read published"
  on blog_articles for select
  using (status = 'published');

-- Tenant members can read all of their own tenant's posts regardless of
-- status (so the CRM can show drafts), matching this project's existing
-- tenant_id = public.tenant_id() pattern.
create policy "blog_articles: tenant members read own"
  on blog_articles for select
  using (tenant_id = public.tenant_id());

-- Only super admins write blog_articles directly via the client SDK —
-- generation/approval/publish all go through server actions using the
-- admin client with an explicit requireSuperAdmin() check (same pattern
-- as security-scans.ts/incidents.ts), so this is a safety net, not the
-- primary enforcement path.
create policy "blog_articles: super admin write"
  on blog_articles for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Citation tracking — internal tool, super-admin only (Thomas/Felix Sam
-- run this monthly per the original spec's manual workflow).
create table blog_citations (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  article_id            uuid references blog_articles(id) on delete cascade,
  test_keyword          text not null,
  cited_in_chatgpt      boolean not null default false,
  cited_in_claude       boolean not null default false,
  cited_in_perplexity   boolean not null default false,
  position_in_response  int,
  tracked_month         text not null, -- 'YYYY-MM', set at insert time
  notes                 text,
  tracked_at            timestamptz not null default now(),

  constraint one_tracking_per_keyword_monthly
    unique (tenant_id, article_id, test_keyword, tracked_month)
);

create index blog_citations_tenant_idx on blog_citations (tenant_id);
create index blog_citations_tracked_idx on blog_citations (tracked_at desc);

alter table blog_citations enable row level security;

create policy "blog_citations: super admin only"
  on blog_citations for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Monthly rollup for the CRM dashboard — recomputed on demand via a
-- server action (no pg_cron in this project), not written to directly
-- by the client.
create table blog_metrics (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  month                 text not null, -- 'YYYY-MM'
  articles_published    int not null default 0,
  total_views           int not null default 0,
  citations_tracked     int not null default 0,
  citations_found       int not null default 0,
  updated_at            timestamptz not null default now(),

  constraint unique_tenant_month unique (tenant_id, month)
);

create index blog_metrics_tenant_idx on blog_metrics (tenant_id);

alter table blog_metrics enable row level security;

create policy "blog_metrics: super admin only"
  on blog_metrics for all
  using (public.is_super_admin())
  with check (public.is_super_admin());
