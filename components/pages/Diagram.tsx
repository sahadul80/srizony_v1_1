'use client'

import { Fragment } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  CloudSun,
  Coins,
  Droplets,
  GraduationCap,
  HandHeart,
  HeartPulse,
  SunMedium,
  Wheat,
} from 'lucide-react'
import type { Section } from '@/types/entityType'
import { useSite } from '@/components/containers/SiteProvider'
import DiagramHeading from '@/components/pages/DiagramHeading'
import type { Sdg } from '@/components/pages/SdgCard'
import SdgCard from '@/components/pages/SdgCard'

type Lang = 'en' | 'bn'
type Bi = Record<Lang, string>

const SDGS: Sdg[] = [
  {
    n: '1',
    icon: Coins,
    tone: '#e4474c',
    label: {
      en: 'No Poverty',
      bn: 'দারিদ্র্যমুক্তি',
    },
    text: {
      en: 'Microfinance and livelihood pathways reduce economic vulnerability.',
      bn: 'ক্ষুদ্রঋণ ও জীবিকা সহায়তা অর্থনৈতিক ঝুঁকি কমাতে সহায়তা করে।',
    },
  },
  {
    n: '2',
    icon: Wheat,
    tone: '#dc9a45',
    label: {
      en: 'Zero Hunger',
      bn: 'ক্ষুধামুক্তি',
    },
    text: {
      en: 'Agriculture and food-security initiatives strengthen household resilience.',
      bn: 'কৃষি ও খাদ্যনিরাপত্তা উদ্যোগ পরিবারের সহনশীলতা বাড়ায়।',
    },
  },
  {
    n: '3',
    icon: HeartPulse,
    tone: '#4ca867',
    label: {
      en: 'Good Health',
      bn: 'সুস্বাস্থ্য',
    },
    text: {
      en: 'Community health and nutrition services improve access to essential care.',
      bn: 'কমিউনিটি স্বাস্থ্য ও পুষ্টি সেবা প্রয়োজনীয় যত্নে প্রবেশাধিকার বাড়ায়।',
    },
  },
  {
    n: '4',
    icon: GraduationCap,
    tone: '#c5192d',
    label: {
      en: 'Quality Education',
      bn: 'মানসম্মত শিক্ষা',
    },
    text: {
      en: 'Skills and education programs widen practical learning opportunities.',
      bn: 'দক্ষতা ও শিক্ষা কর্মসূচি ব্যবহারিক শেখার সুযোগ বাড়ায়।',
    },
  },
  {
    n: '5',
    icon: HandHeart,
    tone: '#d55b8b',
    label: {
      en: 'Gender Equality',
      bn: 'জেন্ডার সমতা',
    },
    text: {
      en: 'Women’s finance, skills and participation advance equal opportunity.',
      bn: 'নারীর অর্থায়ন, দক্ষতা ও অংশগ্রহণ সমঅধিকারকে এগিয়ে নেয়।',
    },
  },
  {
    n: '6',
    icon: Droplets,
    tone: '#45a5c6',
    label: {
      en: 'Clean Water',
      bn: 'নিরাপদ পানি',
    },
    text: {
      en: 'Water, sanitation and hygiene activities support healthier communities.',
      bn: 'পানি, স্যানিটেশন ও স্বাস্থ্যবিধি কার্যক্রম সুস্থ কমিউনিটি গড়ে।',
    },
  },
  {
    n: '7',
    icon: SunMedium,
    tone: '#e0a21c',
    label: {
      en: 'Clean Energy',
      bn: 'পরিচ্ছন্ন জ্বালানি',
    },
    text: {
      en: 'Solar energy initiatives expand affordable clean-energy access.',
      bn: 'সৌরশক্তি উদ্যোগ সাশ্রয়ী পরিচ্ছন্ন জ্বালানির সুযোগ বাড়ায়।',
    },
  },
  {
    n: '8',
    icon: CloudSun,
    tone: '#5f9b64',
    label: {
      en: 'Climate Action',
      bn: 'জলবায়ু কর্মসূচি',
    },
    text: {
      en: 'Climate-resilient livelihoods and environmental action reduce risk.',
      bn: 'জলবায়ু সহনশীল জীবিকা ও পরিবেশগত উদ্যোগ ঝুঁকি কমায়।',
    },
  },
]

const FLOW: Bi[] = [
  { en: 'Inputs', bn: 'ইনপুট' },
  { en: 'Programs', bn: 'কর্মসূচি' },
  { en: 'Outputs', bn: 'আউটপুট' },
  { en: 'Outcomes', bn: 'ফলাফল' },
]

const FLOW_END: Bi = {
  en: 'Resilient Communities',
  bn: 'সহনশীল কমিউনিটি',
}

const PRINCIPLES: Bi[] = [
  { en: 'Participation', bn: 'অংশগ্রহণ' },
  { en: 'Evidence', bn: 'তথ্যভিত্তিক কাজ' },
  { en: 'Partnerships', bn: 'অংশীদারিত্ব' },
  { en: 'Accountability', bn: 'জবাবদিহিতা' },
]

const GOV_ROOT: Bi = {
  en: 'General Committee',
  bn: 'সাধারণ কমিটি',
}

const GOV_MID: Bi[] = [
  {
    en: 'Advisory Committee',
    bn: 'উপদেষ্টা কমিটি',
  },
  {
    en: 'Executive Committee',
    bn: 'নির্বাহী কমিটি',
  },
  {
    en: 'Executive Office',
    bn: 'নির্বাহী অফিস',
  },
]

const GOV_LEAF: Bi[] = [
  {
    en: 'Programs',
    bn: 'কর্মসূচি',
  },
  {
    en: 'Finance & Admin',
    bn: 'অর্থ ও প্রশাসন',
  },
  {
    en: 'Monitoring & Learning',
    bn: 'পর্যবেক্ষণ ও শেখা',
  },
  {
    en: 'Branches & Projects',
    bn: 'শাখা ও প্রকল্প',
  },
]


export default function Diagram({
  section,
}: {
  section: Extract<Section, { type: 'diagram' }>
}) {
  const { lang } = useSite() as { lang: Lang }

  const t = (value?: Bi) => value?.[lang] || ''

  const heading = t(section.heading)
  const body = t(section.body as Bi | undefined)

  if (section.variant === 'sdg') {
    return (
      <section className="sf-diagram-shell sf-diagram-shell--sdg">
        <DiagramHeading
          eyebrow={lang === 'en' ? 'SDG' : 'এসডিজি'}
          title={heading}
          body={body}
        />

        <div
          className="sf-diagram-sdg-rail"
          role="region"
          aria-label={heading || (lang === 'en' ? 'SDG' : 'এসডিজি')}
          tabIndex={0}
        >
          <div className="sf-diagram-sdg-track">
            {SDGS.map((item) => (
              <SdgCard key={item.n} item={item} lang={lang} />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (section.variant === 'governance') {
    return (
      <section className="sf-diagram-shell sf-diagram-shell--governance">
        <DiagramHeading
          eyebrow={
            lang === 'en'
              ? 'Governance'
              : 'সুশাসন'
          }
          title={heading}
        />

        <div
          className="sf-diagram-tree"
          role="group"
          aria-label={heading || undefined}
        >
          <div className="sf-diagram-node sf-diagram-node--root">
            {GOV_ROOT[lang]}
          </div>

          <div
            className="sf-diagram-line"
            aria-hidden="true"
          />

          <div
            className="sf-diagram-row"
            data-cols="3"
          >
            {GOV_MID.map((item) => (
              <div
                key={item.en}
                className="sf-diagram-node"
              >
                {item[lang]}
              </div>
            ))}
          </div>

          <div
            className="sf-diagram-line"
            aria-hidden="true"
          />

          <div
            className="sf-diagram-row"
            data-cols="4"
          >
            {GOV_LEAF.map((item) => (
              <div
                key={item.en}
                className="sf-diagram-node"
              >
                {item[lang]}
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="sf-diagram-shell sf-diagram-shell--impact">
      <DiagramHeading
        eyebrow={
          lang === 'en'
            ? 'Impact model'
            : 'প্রভাব মডেল'
        }
        title={heading}
        body={body}
      />

      <div
        className="sf-diagram-flow"
        role="group"
        aria-label={heading || undefined}
      >
        {FLOW.map((item) => (
          <Fragment key={item.en}>
            <div className="sf-diagram-step">
              {item[lang]}
            </div>

            <ArrowRight
              className="sf-diagram-arrow"
              size={18}
              aria-hidden="true"
            />
          </Fragment>
        ))}

        <div className="sf-diagram-step sf-diagram-step--highlight">
          {FLOW_END[lang]}
        </div>
      </div>

      <div className="sf-diagram-checks">
        {PRINCIPLES.map((item) => (
          <div
            key={item.en}
            className="sf-diagram-check"
          >
            <CheckCircle2
              size={18}
              aria-hidden="true"
            />
            <span>{item[lang]}</span>
          </div>
        ))}
      </div>
    </section>
  )
}