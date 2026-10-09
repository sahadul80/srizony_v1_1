CREATE TABLE IF NOT EXISTS cms_menu_content (id serial PRIMARY KEY, menu_key varchar(120) NOT NULL, slug varchar(255) NOT NULL UNIQUE, type varchar(40) NOT NULL DEFAULT 'page', title_en text, title_bn text, content jsonb NOT NULL, status varchar(20) NOT NULL DEFAULT 'published', updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS cms_menu_content_menu_key_idx ON cms_menu_content(menu_key);
CREATE TABLE IF NOT EXISTS site_visitors (id serial PRIMARY KEY, visitor_id varchar(128) NOT NULL UNIQUE, first_seen_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now(), page_views integer NOT NULL DEFAULT 0, last_path text, referrer text, user_agent text);
CREATE TABLE IF NOT EXISTS visitor_events (id serial PRIMARY KEY, visitor_id varchar(128) NOT NULL, path text NOT NULL, referrer text, user_agent text, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS visitor_events_created_idx ON visitor_events(created_at DESC);
CREATE TABLE IF NOT EXISTS form_users (id serial PRIMARY KEY, provider varchar(16), provider_id varchar(255), name text, email varchar(254) NOT NULL UNIQUE, phone text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS enquiry_daily_limits (id serial PRIMARY KEY, email varchar(254) NOT NULL, submission_date date NOT NULL DEFAULT CURRENT_DATE, submission_id integer REFERENCES submissions(id), UNIQUE(email, submission_date));
CREATE TABLE IF NOT EXISTS cookie_consents (id serial PRIMARY KEY, visitor_id varchar(128), email varchar(254), purpose varchar(40) NOT NULL DEFAULT 'enquiry', consented boolean NOT NULL DEFAULT true, consented_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS newsletter_subscribers (id serial PRIMARY KEY, email varchar(254) NOT NULL UNIQUE, status varchar(20) NOT NULL DEFAULT 'subscribed', consent_at timestamptz NOT NULL DEFAULT now(), unsubscribed_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now());

ALTER TABLE IF EXISTS enquiry_daily_limits ALTER COLUMN submission_date SET DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')::date);
