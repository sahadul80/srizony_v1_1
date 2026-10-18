import type { HeroData } from '../types/entityType'

/** Shared copy defaults for the homepage hero, kept separate from the large site catalogue. */
export const HOME_HERO_COPY_DEFAULTS = {
  eyebrow: { en: 'Srizony Foundation', bn: 'সৃজনী ফাউন্ডেশন' },
  headingLineOne: { en: 'Empowering people,', bn: 'মানুষের ক্ষমতায়ন,' },
  headingLineTwo: { en: 'transforming lives.', bn: 'জীবনের রূপান্তর।' },
  description: {
    en: 'Srizony Foundation has worked since 1985 across livelihoods, health, education, rights, climate resilience and financial inclusion for disadvantaged communities.',
    bn: 'সৃজনী ফাউন্ডেশন ১৯৮৫ সাল থেকে সুবিধাবঞ্চিত মানুষের জীবিকা, স্বাস্থ্য, শিক্ষা, অধিকার, জলবায়ু সহনশীলতা ও আর্থিক অন্তর্ভুক্তি নিয়ে কাজ করে আসছে।',
  },
  primaryAction: { label: { en: 'Donate Now', bn: 'দান করুন' }, href: '/donate' },
  secondaryAction: { label: { en: 'Explore Our Work', bn: 'আমাদের কার্যক্রম দেখুন' }, href: '/social-development' },
  autoplay: true,
  autoplayInterval: 4500,
} satisfies Pick<HeroData, 'eyebrow' | 'headingLineOne' | 'headingLineTwo' | 'description' | 'primaryAction' | 'secondaryAction' | 'autoplay' | 'autoplayInterval'>
