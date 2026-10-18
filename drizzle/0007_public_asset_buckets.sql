-- Separate approved public website images from private documents and attachments.
-- Existing rows remain in the private `uploads` bucket until explicitly copied by
-- scripts/migrate-public-media.ts; this migration does not move or delete objects.
ALTER TABLE media_items
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT;

UPDATE media_items
SET storage_bucket = 'uploads'
WHERE storage_bucket IS NULL OR btrim(storage_bucket) = '';

ALTER TABLE media_items
  ALTER COLUMN storage_bucket SET DEFAULT 'uploads';

ALTER TABLE media_items
  ALTER COLUMN storage_bucket SET NOT NULL;

CREATE INDEX IF NOT EXISTS media_items_storage_bucket_key_idx
  ON media_items (storage_bucket, storage_key);
