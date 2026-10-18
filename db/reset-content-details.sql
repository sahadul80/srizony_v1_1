-- Srizony Foundation CMS catalogue reset (PostgreSQL / Neon).
-- Deletes only public content catalogue rows. It does NOT delete admin/CMS users,
-- authentication/session data, page layouts, site settings, submissions, donations,
-- audit logs, media, or other operational tables.
--
-- After running this script, run: npm run db:seed
-- The canonical bilingual entries from data/contentDetails.ts will then be reinserted.

BEGIN;

LOCK TABLE cms_content_items IN SHARE ROW EXCLUSIVE MODE;

DELETE FROM cms_content_items
WHERE component IN (
  'project', 'news', 'enterprise', 'notice',
  'partner-agency', 'health-service', 'loan-product', 'product'
);

COMMIT;

-- Verification: expected post-seed counts are
-- project 24, news 6, enterprise 8, notice 2,
-- partner-agency 12, health-service 16, loan-product 7.
-- SELECT component, COUNT(*) FROM cms_content_items
-- WHERE component IN ('project','news','enterprise','notice','partner-agency','health-service','loan-product')
-- GROUP BY component ORDER BY component;
