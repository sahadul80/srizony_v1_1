/** Shared (client + server) definition of every manageable content component. */
export type ContentComponent = 'project' | 'news' | 'enterprise' | 'partner-agency' | 'health-service' | 'loan-product' | 'product' | 'team' | 'notice' | 'report' | 'job' | 'success-story'
export type FieldType = 'text' | 'textarea' | 'date' | 'number' | 'select' | 'url' | 'image' | 'email'
export type FieldDef = {
  key: string            // bilingual fields are stored as `${key}_en` / `${key}_bn`
  label: string
  type: FieldType
  bilingual?: boolean
  required?: boolean
  options?: string[]
  max?: number
  help?: string
}
export type ComponentDef = { key: ContentComponent; label: string; plural: string; description: string; fields: FieldDef[] }

const core = (dateLabel = 'Publish date'): FieldDef[] => [
  { key: 'title', label: 'Title', type: 'text', bilingual: true, required: true, max: 200 },
  { key: 'summary', label: 'Summary', type: 'textarea', bilingual: true, max: 600 },
  { key: 'body', label: 'Details', type: 'textarea', bilingual: true, max: 20000 },
  { key: 'image', label: 'Image URL', type: 'image', help: 'Use an HTTPS image URL from a source you are allowed to use (for example Unsplash), or an uploaded media URL. Replace demo stock photos with approved organizational photos before publishing factual field reports.' },
  { key: 'date', label: dateLabel, type: 'date', required: true },
]

export const COMPONENTS: Record<ContentComponent, ComponentDef> = {
  project: {
    key: 'project', label: 'Project', plural: 'Projects', description: 'Programmes and projects.', fields: [
      ...core('Start / publish date'),
      { key: 'projectStatus', label: 'Project status', type: 'select', options: ['Ongoing', 'Completed', 'Planned'] },
      { key: 'location', label: 'Location', type: 'text', bilingual: true, max: 200 },
      { key: 'donor', label: 'Donor / partner', type: 'text', max: 200 },
      { key: 'endDate', label: 'End date', type: 'date' },
      { key: 'beneficiaries', label: 'Beneficiaries', type: 'number' },
    ]
  },
  news: {
    key: 'news', label: 'News item', plural: 'News', description: 'Bilingual news articles and field updates.', fields: [
      ...core('Publication date'),
      { key: 'category', label: 'News category', type: 'text', bilingual: true, max: 120 },
      { key: 'source', label: 'Source / reference', type: 'text', max: 200 },
    ]
  },
  enterprise: {
    key: 'enterprise', label: 'Enterprise', plural: 'Enterprises', description: 'Foundation enterprise profiles.', fields: [
      ...core(),
      { key: 'category', label: 'Enterprise category', type: 'text', bilingual: true, max: 120 },
      { key: 'link', label: 'Enquiry / website link', type: 'url' },
    ]
  },
  'partner-agency': {
    key: 'partner-agency', label: 'Partner agency', plural: 'Partner agencies', description: 'Donor, institutional and network profiles.', fields: [
      ...core(),
      { key: 'partnerType', label: 'Partner type', type: 'text', bilingual: true, max: 120 },
      { key: 'website', label: 'Official website', type: 'url' },
    ]
  },
  'health-service': {
    key: 'health-service', label: 'Health service', plural: 'Health services', description: 'Health service catalogue and guidance.', fields: [
      ...core(),
      { key: 'serviceType', label: 'Service type', type: 'text', bilingual: true, max: 120 },
      { key: 'availability', label: 'Availability / service note', type: 'text', bilingual: true, max: 300 },
    ]
  },
  'loan-product': {
    key: 'loan-product', label: 'Loan product', plural: 'Loan products', description: 'Loan products, purpose and application guidance.', fields: [
      ...core(),
      { key: 'category', label: 'Loan category', type: 'text', bilingual: true, max: 120 },
      { key: 'terms', label: 'Terms / pricing note', type: 'text', bilingual: true, max: 500 },
      { key: 'eligibility', label: 'Eligibility guidance', type: 'textarea', bilingual: true, max: 1200 },
      { key: 'repayment', label: 'Repayment guidance', type: 'textarea', bilingual: true, max: 1200 },
      { key: 'link', label: 'Application / enquiry link', type: 'url' },
    ]
  },
  product: {
    key: 'product', label: 'Product / Service', plural: 'Products & Services', description: 'Loans, enterprises and other services.', fields: [
      ...core(),
      { key: 'category', label: 'Category', type: 'text', bilingual: true, max: 120 },
      { key: 'terms', label: 'Terms / pricing', type: 'text', bilingual: true, max: 300 },
      { key: 'link', label: 'Call-to-action link', type: 'url' },
    ]
  },
  team: {
    key: 'team', label: 'Team member', plural: 'Team', description: 'Governing body, secretariat and staff.', fields: [
      ...core('Joined / publish date').filter((f) => f.key !== 'summary'),
      { key: 'role', label: 'Role / designation', type: 'text', bilingual: true, required: true, max: 160 },
      { key: 'group', label: 'Group', type: 'select', options: ['Governing Body', 'Executive Secretariat', 'Advisor', 'Staff'], required: true },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone', type: 'text', max: 40 },
      { key: 'order', label: 'Display order', type: 'number' },
    ]
  },
  notice: {
    key: 'notice', label: 'Notice', plural: 'Notices', description: 'Public notices.', fields: [
      ...core('Notice date'),
      { key: 'file', label: 'Attachment path', type: 'url' },
    ]
  },
  report: {
    key: 'report', label: 'Report', plural: 'Reports', description: 'Published reports.', fields: [
      ...core('Published date'),
      { key: 'file', label: 'Report file path', type: 'url', required: true },
      { key: 'category', label: 'Report category', type: 'text', bilingual: true, max: 120 },
    ]
  },
  job: {
    key: 'job', label: 'Job post', plural: 'Job posts', description: 'Career opportunities.', fields: [
      ...core('Posted date'),
      { key: 'deadline', label: 'Application deadline', type: 'date', required: true },
      { key: 'location', label: 'Location', type: 'text', bilingual: true, max: 200 },
      { key: 'employmentType', label: 'Employment type', type: 'select', options: ['Full-time', 'Part-time', 'Contract', 'Internship'] },
      { key: 'vacancies', label: 'Vacancies', type: 'number' },
      { key: 'salary', label: 'Salary', type: 'text', max: 120 },
    ]
  },
  'success-story': {
    key: 'success-story', label: 'Success Story', plural: 'Success Stories', description: 'Tails of the successful life.', fields: [
      ...core(),
      { key: 'category', label: 'Story category', type: 'text', bilingual: true, max: 120 },
      { key: 'source', label: 'Source / reference', type: 'text', max: 200 },
    ]
  }
}

/** Components an admin can attach to a navigation menu (at least one is mandatory). */
export const MENU_COMPONENTS: ContentComponent[] = ['project', 'product', 'team']
/** "News" is the date-sorted collection of these components. */
export const NEWS_COMPONENTS: ContentComponent[] = ['news', 'project', 'notice', 'report', 'job']

export const SUCCESS_STORY_COMPONENTS: ContentComponent[] = ['news', 'project', 'success-story']

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Flat storage keys for a component: bilingual fields expand to _en/_bn. */
export function storageKeys(def: ComponentDef) {
  return def.fields.flatMap((f) => (f.bilingual ? [`${f.key}_en`, `${f.key}_bn`] : [f.key]))
}
export const CORE_KEYS = ['title_en', 'title_bn', 'summary_en', 'summary_bn', 'body_en', 'body_bn', 'image', 'date']
export type ContentValues = Record<string, string>
export type ContentRecord = { id: number; component: ContentComponent; slug: string; status: 'published' | 'draft' | 'hidden'; values: ContentValues; publishedAt: string; updatedAt: string }
export type FeedItem = { id: number; component: ContentComponent; slug: string; title: { en: string; bn: string }; summary: { en: string; bn: string }; image?: string; date: string; href?: string; deadline?: string }
