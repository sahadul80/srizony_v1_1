-- CMS navigation and page-builder settings. Additive and safe to re-run.
ALTER TABLE nav_items ADD COLUMN IF NOT EXISTS menu_type VARCHAR(20) NOT NULL DEFAULT 'page';
--> statement-breakpoint
ALTER TABLE nav_items ADD COLUMN IF NOT EXISTS section_count INTEGER NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE nav_items ADD COLUMN IF NOT EXISTS section_content_type VARCHAR(40) NOT NULL DEFAULT 'richText';
--> statement-breakpoint
ALTER TABLE nav_items ADD COLUMN IF NOT EXISTS section_button_type VARCHAR(20) NOT NULL DEFAULT 'none';
--> statement-breakpoint
UPDATE nav_items SET menu_type = 'page' WHERE menu_type IS NULL OR menu_type NOT IN ('page', 'external');
--> statement-breakpoint
UPDATE nav_items SET section_count = 1 WHERE section_count IS NULL OR section_count < 1;
--> statement-breakpoint
UPDATE nav_items SET section_content_type = 'richText' WHERE section_content_type IS NULL OR section_content_type = '';
--> statement-breakpoint
UPDATE nav_items SET section_button_type = 'none' WHERE section_button_type IS NULL OR section_button_type NOT IN ('none', 'primary', 'secondary', 'both');
