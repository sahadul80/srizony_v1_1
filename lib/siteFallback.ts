/**
 * Safe defaults for the public layout. `getPublicSiteSnapshot` returns a sparse `global`
 * (no contactInfo / images / homeHero / nav) when no database is configured and
 * CMS_STATIC_FALLBACK is not enabled. The shared site components use these instead of crashing.
 */
export const FALLBACK_LOGO = '/images/Logo-SF.png'

export const FALLBACK_CONTACT = {
  email: 'info@srizonyfoundation.org.bd',
  primaryPhone: '+8802477747270',
  phones: ['+8802477747270', '+880451632646', '01926888584'],
  address: {
    en: '111 Pabahati Road, Pabahati, Jhenaidah-7300, Bangladesh',
    bn: '১১১ পাভাহাটি রোড, পাভাহাটি, ঝিনাইদহ-৭৩০০, বাংলাদেশ',
  },
  maps: { headOffice: '' },
  socials: { linkedin: 'https://bd.linkedin.com/company/srizonyfoundation' },
  footprint: [],
}

export const FALLBACK_HOME_LABEL = { en: 'Home', bn: 'হোম' }
