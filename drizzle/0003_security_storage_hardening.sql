ALTER TABLE media_items ADD COLUMN IF NOT EXISTS storage_key TEXT;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS receipt_sent_at TIMESTAMPTZ;
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS content_type VARCHAR(120);
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS size_bytes BIGINT;
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ready';
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS uploaded_by VARCHAR(254);
UPDATE media_items SET storage_key = NULL WHERE storage_key LIKE '/images/%' OR storage_key LIKE 'http%';
UPDATE media_items SET storage_key = src WHERE storage_key IS NULL AND src LIKE 'media/%';
ALTER TABLE form_users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS auth_email_challenges (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  code_hash VARCHAR(128) NOT NULL,
  purpose VARCHAR(30) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  attempts SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_email_challenges_email_purpose_idx ON auth_email_challenges(email, purpose);
CREATE INDEX IF NOT EXISTS auth_email_challenges_expires_idx ON auth_email_challenges(expires_at);

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  key VARCHAR(255) PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_email VARCHAR(254) NOT NULL,
  action VARCHAR(80) NOT NULL,
  entity VARCHAR(120),
  entity_id VARCHAR(255),
  metadata JSONB,
  ip_address VARCHAR(64),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_log_actor_created_idx ON admin_audit_log(actor_email, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON admin_audit_log(created_at DESC);

CREATE TABLE IF NOT EXISTS page_revisions (
  id BIGSERIAL PRIMARY KEY,
  page_id BIGINT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content JSONB NOT NULL,
  created_by VARCHAR(254),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(page_id, version)
);
CREATE INDEX IF NOT EXISTS page_revisions_page_created_idx ON page_revisions(page_id, created_at DESC);

ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_status_check;
ALTER TABLE pages ADD CONSTRAINT pages_status_check CHECK (status IN ('draft','published','archived'));
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_sort_order_check;
ALTER TABLE pages ADD CONSTRAINT pages_sort_order_check CHECK (sort_order >= 0);
ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_kind_check;
ALTER TABLE media_items ADD CONSTRAINT media_items_kind_check CHECK (kind IN ('image','document','video','file'));
ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_status_check;
ALTER TABLE media_items ADD CONSTRAINT media_items_status_check CHECK (status IN ('ready','quarantined','deleted'));
ALTER TABLE donations DROP CONSTRAINT IF EXISTS donations_status_check;
ALTER TABLE donations ADD CONSTRAINT donations_status_check CHECK (status IN ('pending','success','failed','cancelled','expired'));
ALTER TABLE newsletter_subscribers DROP CONSTRAINT IF EXISTS newsletter_subscribers_status_check;
ALTER TABLE newsletter_subscribers ADD CONSTRAINT newsletter_subscribers_status_check CHECK (status IN ('pending','subscribed','unsubscribed'));
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_status_check;
ALTER TABLE submissions ADD CONSTRAINT submissions_status_check CHECK (status IN ('new','read','resolved','archived','subscribed'));

ALTER TABLE content_entry_related
  DROP CONSTRAINT IF EXISTS content_entry_related_related_slug_fkey;
ALTER TABLE content_entry_related
  ADD CONSTRAINT content_entry_related_related_slug_fkey
  FOREIGN KEY (related_slug) REFERENCES content_entries(slug) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS submissions_status_created_idx ON submissions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS donations_created_idx ON donations(created_at DESC);
CREATE INDEX IF NOT EXISTS pages_status_idx ON pages(status);
CREATE INDEX IF NOT EXISTS visitor_events_visitor_idx ON visitor_events(visitor_id);

DELETE FROM visitor_events a
WHERE a.visitor_id NOT IN (SELECT visitor_id FROM site_visitors);
ALTER TABLE visitor_events DROP CONSTRAINT IF EXISTS visitor_events_visitor_fk;
ALTER TABLE visitor_events ADD CONSTRAINT visitor_events_visitor_fk FOREIGN KEY (visitor_id) REFERENCES site_visitors(visitor_id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION prune_srizony_analytics() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM visitor_events WHERE created_at < now() - interval '180 days';
  DELETE FROM auth_email_challenges WHERE expires_at < now() - interval '1 day';
  DELETE FROM admin_login_attempts WHERE updated_at < now() - interval '30 days';
  UPDATE donations SET status = 'expired' WHERE status = 'pending' AND created_at < now() - interval '24 hours';
END;
$$;
