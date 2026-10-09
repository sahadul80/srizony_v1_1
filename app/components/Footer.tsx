'use client'

import SafeImage from './SafeImage'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowUp, Mail, MapPin, Phone } from 'lucide-react'
import { FaLinkedin as Linkedin } from 'react-icons/fa'
import { useSite } from './SiteProvider'
import { localizeDigits } from '../../lib/utils'
import NewsletterForm from './NewsletterForm'
import s from '../css_extra/Footer.module.css'


function AnimatedStat({ value, label, lang }: { value: string; label: string; lang: 'en' | 'bn' }) {
  const target = Number(value.replace(/[^\d]/g, ''))
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!Number.isFinite(target)) {
      setCurrent(0)
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCurrent(target)
      return
    }

    const start = performance.now()
    const duration = 1000
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setCurrent(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])

  return (
    <div className={s.stat}>
      <strong>{localizeDigits(current.toLocaleString('en-US'), lang)}</strong>
      <span>{label}</span>
    </div>
  )
}

export default function Footer() {
  const { lang, site } = useSite()
  if (!site) return null

  const { navGroups, primaryNav, ui, contactInfo, images } = site.global
  const t = (v: { en: string; bn: string }) => v[lang]
  const l = (en: string, bn: string) => (lang === 'en' ? en : bn)
  const currentYear = localizeDigits(String(new Date().getFullYear()), lang)

  return (
    <footer className={s.footer}>
      <div className={s.accent} aria-hidden="true" />
      <div className={s.glowA} aria-hidden="true" />
      <div className={s.glowB} aria-hidden="true" />

      {/* Animated impact stats */}
      <div className={s.statsRow}>
        <div className="container">
          <div className={s.stats}>
            {site.global.homeHero.stats.slice(0, 4).map((stat) => (
              <AnimatedStat key={stat.id} value={stat.value.en} label={t(stat.label)} lang={lang} />
            ))}
          </div>
        </div>
      </div>

      {/* Compact newsletter */}
      <div className={s.newsletterRow}>
        <div className="container">
          <div className={s.newsletter}>
            <h3>{l('Stay connected', 'সঙ্গে থাকুন')}</h3>
            <div className={s.newsletterForm}>
              <NewsletterForm />
            </div>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className={`container ${s.grid}`}>
        <div className={s.brandCol}>
          <Link href="/" className={s.brand} aria-label={l('Srizony Foundation – home', 'সৃজনী ফাউন্ডেশন – হোম')}>
            <span className={s.logo}>
              <SafeImage
                src={images.logo}
                alt="Srizony Foundation"
                fallbackTitle="Srizony Foundation logo"
                fill
                sizes="56px"
                showSourceLinks={false}
              />
            </span>
            <span className={s.brandText}>
              <strong>{l('Srizony Foundation', 'সৃজনী ফাউন্ডেশন')}</strong>
              <small>{l('Community. Dignity. Opportunity.', 'কমিউনিটি • মর্যাদা • সুযোগ')}</small>
            </span>
          </Link>

          <p className={s.note}>{ui[lang].footerNote}</p>

          <span className={s.since}>
            <i aria-hidden="true" />
            {l('Working with communities since 1985', '১৯৮৫ সাল থেকে কমিউনিটির সঙ্গে কাজ করছি')}
          </span>

          <div className={s.socials}>
            <a
              href={contactInfo.socials.linkedin}
              aria-label="LinkedIn"
              target="_blank"
              rel="noreferrer"
              className={s.social}
            >
              <Linkedin size={17} />
            </a>
            <a href={`mailto:${contactInfo.email}`} aria-label="Email" className={s.social}>
              <Mail size={17} />
            </a>
          </div>
        </div>

        <nav className={s.col} aria-label={ui[lang].quickLinks}>
          <h3>{ui[lang].quickLinks}</h3>
          <ul>
            {primaryNav.slice(0, 5).map((i) => (
              <li key={i.href}>
                <Link href={i.href} className={s.link}>
                  <span>{t(i.label)}</span>
                  <ArrowRight size={13} />
                </Link>
              </li>
            ))}
            <li>
              <Link href="/privacy" className={s.link}>
                <span>{l('Privacy & Cookies', 'গোপনীয়তা ও কুকিজ')}</span>
                <ArrowRight size={13} />
              </Link>
            </li>
          </ul>
        </nav>

        <nav className={s.col} aria-label={ui[lang].programs}>
          <h3>{ui[lang].programs}</h3>
          <ul>
            {navGroups[1]?.items.slice(0, 7).map((i) => (
              <li key={i.href}>
                <Link href={i.href} className={s.link}>
                  <span>{t(i.label)}</span>
                  <ArrowRight size={13} />
                </Link>
              </li>
            ))}
            <li>
              <Link href="/projects" className={s.link}>
                <span>{l('Our work', 'আমাদের কাজ')}</span>
                <ArrowRight size={13} />
              </Link>
            </li>
          </ul>
        </nav>

        <div className={s.col}>
          <h3>{l('Contact', 'যোগাযোগ')}</h3>
          <ul className={s.contactList}>
            <li>
              <a className={s.contact} href={contactInfo.maps.headOffice} target="_blank" rel="noreferrer">
                <span className={s.contactIcon}><MapPin size={16} /></span>
                <span>{t(contactInfo.address)}</span>
              </a>
            </li>
            <li>
              <a className={s.contact} href={`tel:${contactInfo.primaryPhone}`}>
                <span className={s.contactIcon}><Phone size={16} /></span>
                <span>{localizeDigits(contactInfo.primaryPhone, lang)}</span>
              </a>
            </li>
            <li>
              <a className={s.contact} href={`mailto:${contactInfo.email}`}>
                <span className={s.contactIcon}><Mail size={16} /></span>
                <span>{contactInfo.email}</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className={s.bottom}>
        <div className={`container ${s.bottomInner}`}>
          <span>
            © {currentYear} {l('Srizony Foundation', 'সৃজনী ফাউন্ডেশন')}.{' '}
            {l('All rights reserved.', 'সর্বস্বত্ব সংরক্ষিত।')}
          </span>

          <div className={s.bottomLinks}>
            <Link href="/privacy">{l('Privacy & Cookies', 'গোপনীয়তা ও কুকিজ')}</Link>
            <span aria-hidden="true">•</span>
            <span>{l('Built for access, clarity and trust', 'অ্যাক্সেস, স্বচ্ছতা ও আস্থার জন্য নির্মিত')}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}