-- 0005_cms_modules.sql
-- Safe to run on databases where some of these tables already exist in another shape.
ALTER TABLE nav_items ADD COLUMN IF NOT EXISTS content_types JSONB NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS cms_content_items (
  id BIGSERIAL PRIMARY KEY,
  component VARCHAR(20) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  title_en TEXT NOT NULL,
  title_bn TEXT NOT NULL DEFAULT '',
  summary_en TEXT NOT NULL DEFAULT '',
  summary_bn TEXT NOT NULL DEFAULT '',
  body_en TEXT NOT NULL DEFAULT '',
  body_bn TEXT NOT NULL DEFAULT '',
  image_src TEXT,
  published_at DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'published',
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE cms_content_items ADD COLUMN IF NOT EXISTS component VARCHAR(20) NOT NULL DEFAULT 'project';
--> statement-breakpoint
ALTER TABLE cms_content_items ADD COLUMN IF NOT EXISTS slug VARCHAR(255);
--> statement-breakpoint
ALTER TABLE cms_content_items ADD COLUMN IF NOT EXISTS title_en TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE cms_content_items ADD COLUMN IF NOT EXISTS title_bn TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE cms_content_items ADD COLUMN IF NOT EXISTS summary_en TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE cms_content_items ADD COLUMN IF NOT EXISTS summary_bn TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE cms_content_items ADD COLUMN IF NOT EXISTS body_en TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE cms_content_items ADD COLUMN IF NOT EXISTS body_bn TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE cms_content_items ADD COLUMN IF NOT EXISTS image_src TEXT;
--> statement-breakpoint
ALTER TABLE cms_content_items ADD COLUMN IF NOT EXISTS published_at DATE NOT NULL DEFAULT CURRENT_DATE;
--> statement-breakpoint
ALTER TABLE cms_content_items ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'published';
--> statement-breakpoint
ALTER TABLE cms_content_items ADD COLUMN IF NOT EXISTS attributes JSONB NOT NULL DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE cms_content_items ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE cms_content_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
--> statement-breakpoint
ALTER TABLE cms_content_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS cms_content_items_component_slug_uq ON cms_content_items(component, slug);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS cms_content_items_feed_idx ON cms_content_items(status, published_at DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS job_applications (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT NOT NULL REFERENCES cms_content_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email VARCHAR(254) NOT NULL,
  phone TEXT,
  cover_letter TEXT,
  resume_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS job_id BIGINT;
--> statement-breakpoint
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS email VARCHAR(254) NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS phone TEXT;
--> statement-breakpoint
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS cover_letter TEXT;
--> statement-breakpoint
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS resume_url TEXT;
--> statement-breakpoint
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'new';
--> statement-breakpoint
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS job_applications_job_idx ON job_applications(job_id, created_at DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS cms_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'editor',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by VARCHAR(254),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE cms_users ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE cms_users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'editor';
--> statement-breakpoint
ALTER TABLE cms_users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
--> statement-breakpoint
ALTER TABLE cms_users ADD COLUMN IF NOT EXISTS created_by VARCHAR(254);
--> statement-breakpoint
ALTER TABLE cms_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
--> statement-breakpoint
ALTER TABLE cms_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
--> statement-breakpoint
ALTER TABLE cms_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
--> statement-breakpoint
INSERT INTO cms_content_items (component, slug, title_en, title_bn, summary_en, summary_bn, body_en, body_bn, image_src, published_at, status)
SELECT CASE ce.category WHEN 'project' THEN 'project' WHEN 'notice' THEN 'notice' WHEN 'career' THEN 'job' WHEN 'enterprise' THEN 'product' END,
  ce.slug, ce.title_en, ce.title_bn, ce.excerpt_en, ce.excerpt_bn,
  COALESCE((SELECT string_agg(b.body_en, E'\n\n' ORDER BY b.sort_order) FROM content_entry_bodies b WHERE b.content_entry_id = ce.id), ''),
  COALESCE((SELECT string_agg(b.body_bn, E'\n\n' ORDER BY b.sort_order) FROM content_entry_bodies b WHERE b.content_entry_id = ce.id), ''),
  m.src,
  CASE WHEN ce.date_value ~ '^\d{4}-\d{2}-\d{2}' THEN LEFT(ce.date_value, 10)::date ELSE CURRENT_DATE END,
  'published'
FROM content_entries ce LEFT JOIN media_items m ON m.id = ce.image_id
WHERE ce.category = 'career'
  AND NOT EXISTS (SELECT 1 FROM cms_content_items)
ON CONFLICT (component, slug) DO NOTHING;
