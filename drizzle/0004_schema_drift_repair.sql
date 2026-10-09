-- 0004_schema_drift_repair.sql
-- Repair additive structural columns on databases where 0002 was only partially applied.
ALTER TABLE pages ADD COLUMN IF NOT EXISTS render_cache JSONB;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS subtitle_en TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS subtitle_bn TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS hero_image_id BIGINT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS hero_tone VARCHAR(20);
ALTER TABLE pages ADD COLUMN IF NOT EXISTS meta_description_en TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS meta_description_bn TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'published';
ALTER TABLE pages ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE pages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS pages_status_idx ON pages(status);
CREATE INDEX IF NOT EXISTS pages_sort_order_idx ON pages(sort_order);
