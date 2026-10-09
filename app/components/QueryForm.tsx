'use client'

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Loader2, Mail, ShieldCheck, X } from 'lucide-react'
import { FaChrome } from 'react-icons/fa'
import { toast } from 'sonner'
import { z } from 'zod'
import { useSite } from './SiteProvider'
import { requestEmailCode, startGoogleAuth, submitQuery, verifyEmailCode } from '@/lib/api/public'

const enquirySchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.').max(120),
  email: z.email('Please enter a valid email address.'),
  phone: z.string().trim().max(30).optional(),
  message: z.string().trim().min(10, 'Please enter at least 10 characters.').max(5000),
})

export default function QueryForm() {
  const { lang, site, profile, refreshProfile } = useSite()
  const ui = site?.global.ui[lang]
  const [busy, setBusy] = useState(false)
  const [consent, setConsent] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [authEmail, setAuthEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationSent, setVerificationSent] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })

  const dictionary = useMemo(() => lang === 'en' ? {
    name: 'Name', email: 'Email', phone: 'Phone (optional)', message: 'Message',
    consent: 'I agree to the privacy notice and cookies needed to process this enquiry, and I understand I can ask for my information to be removed.',
    title: 'Send us a query', subtitle: 'We usually use this form for programme, partnership and general enquiries.',
    authTitle: 'Choose how to continue',
    authText: 'Continue with Google for verified sign-in, or verify your email address with a one-time code.',
    authEmail: 'Email (optional)',
    authEmailHelp: 'We will send a six-digit verification code to this address.',
    continueEmail: 'Send verification code',
    verifyEmail: 'Verify and submit',
    verifiedNote: 'Your enquiry is submitted only after mailbox ownership is verified.',
  } : {
    name: 'নাম', email: 'ইমেইল', phone: 'ফোন (ঐচ্ছিক)', message: 'বার্তা',
    consent: 'এই অনুসন্ধান প্রক্রিয়াকরণের জন্য প্রয়োজনীয় গোপনীয়তা নোটিশ ও কুকিজে আমি সম্মতি দিচ্ছি এবং প্রয়োজনে আমার তথ্য অপসারণের অনুরোধ করতে পারি।',
    title: 'আপনার অনুসন্ধান পাঠান', subtitle: 'কর্মসূচি, অংশীদারিত্ব ও সাধারণ অনুসন্ধানের জন্য এই ফর্মটি ব্যবহার করুন।',
    authTitle: 'কীভাবে চালিয়ে যাবেন নির্বাচন করুন',
    authText: 'যাচাইকৃত সাইন-ইনের জন্য Google ব্যবহার করুন, অথবা একবারের কোড দিয়ে আপনার ইমেইল যাচাই করুন।',
    authEmail: 'ইমেইল (ঐচ্ছিক)',
    authEmailHelp: 'এই ঠিকানায় একটি ছয় অংকের যাচাইকরণ কোড পাঠানো হবে।',
    continueEmail: 'যাচাইকরণ কোড পাঠান',
    verifyEmail: 'যাচাই করে জমা দিন',
    verifiedNote: 'ইমেইলের মালিকানা যাচাই হওয়ার পরেই অনুসন্ধান জমা হবে।',
  }, [lang])

  useEffect(() => {
    if (!profile) return
    setForm(v => ({ ...v, name: profile.name || v.name, email: profile.email, phone: profile.phone || v.phone || '' }))
  }, [profile])

  useEffect(() => {
    const auth = new URLSearchParams(window.location.search).get('auth')
    if (!auth) return
    const messages: Record<string, string> = {
      success: lang === 'en' ? 'Your enquiry was submitted successfully.' : 'আপনার অনুসন্ধান সফলভাবে জমা হয়েছে।',
      'daily-limit': lang === 'en' ? 'You have already sent an enquiry today. Please try again tomorrow.' : 'আপনি আজ ইতোমধ্যে একটি অনুসন্ধান পাঠিয়েছেন। আগামীকাল আবার চেষ্টা করুন।',
      cancelled: lang === 'en' ? 'Google sign-in was cancelled. Your enquiry was not submitted.' : 'Google সাইন-ইন বাতিল হয়েছে। অনুসন্ধান জমা হয়নি।',
      failed: lang === 'en' ? 'Google sign-in could not be completed. Please try again.' : 'Google সাইন-ইন সম্পন্ন হয়নি। আবার চেষ্টা করুন।',
    }
    if (messages[auth]) toast[auth === 'success' ? 'success' : 'error'](messages[auth])
    if (auth === 'success') void refreshProfile()
    window.history.replaceState({}, '', window.location.pathname)
  }, [lang, refreshProfile])

  if (!ui) return null

  async function beginGoogleAuth() {
    setBusy(true)
    try {
      const { ok, data } = await startGoogleAuth({ provider: 'google', ...form, consentAt: new Date().toISOString(), visitorId: window.localStorage.getItem('sf-visitor-id') || undefined, returnTo: window.location.pathname })
      if (!ok || !data.url) throw new Error(data.error || 'Unable to start Google sign-in')
      window.location.assign(data.url)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Unable to start Google sign-in')
      setBusy(false)
    }
  }

  async function continueWithEmail() {
    const email = (authEmail.trim() || form.email).trim()
    const result = z.email('Please enter a valid email address.').safeParse(email)
    if (!result.success) {
      toast.error(lang === 'en' ? result.error.issues[0]?.message || 'Please enter a valid email.' : 'অনুগ্রহ করে সঠিক ইমেইল দিন।')
      return
    }
    setBusy(true)
    try {
      const { ok, data } = await requestEmailCode(email)
      if (!ok) throw new Error(data.error?.message || 'Unable to send the verification code.')
      setAuthEmail(email)
      setVerificationSent(true)
      toast.success(lang === 'en' ? 'Verification code sent. Check your email.' : 'যাচাইকরণ কোড পাঠানো হয়েছে। ইমেইল দেখুন।')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send the verification code.')
    } finally { setBusy(false) }
  }

  async function verifyAndSubmit() {
    const email = authEmail.trim()
    const validEmail = z.email().safeParse(email)
    if (!validEmail.success || !/^\d{6}$/.test(verificationCode.trim())) {
      toast.error(lang === 'en' ? 'Enter the six-digit verification code.' : 'ছয় অংকের যাচাইকরণ কোড দিন।')
      return
    }
    setBusy(true)
    try {
      const { ok, status, data } = await verifyEmailCode({ code: verificationCode.trim(), ...form, email, consentAt: new Date().toISOString(), visitorId: window.localStorage.getItem('sf-visitor-id') || undefined })
      if (status === 429 || status === 400) throw new Error(data.error?.message || 'Verification failed.')
      if (!ok) throw new Error(data.error?.message || 'Unable to submit your enquiry.')
      setShowAuth(false); setVerificationSent(false); setVerificationCode(''); setForm(v => ({ ...v, email }))
      toast.success(lang === 'en' ? 'Your enquiry was submitted successfully.' : 'আপনার অনুসন্ধান সফলভাবে জমা হয়েছে।')
      await refreshProfile()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit your enquiry.')
    } finally { setBusy(false) }
  }

  async function submitAuthenticated(consentAt: string) {
    setBusy(true)
    try {
      const { ok, status, data } = await submitQuery({ ...form, consent: true, consentAt, visitorId: window.localStorage.getItem('sf-visitor-id') || undefined })
      if (status === 429) throw new Error(data.error || 'You have already sent an enquiry today.')
      if (!ok) throw new Error(data.error || 'Unable to submit your enquiry.')
      toast.success(lang === 'en' ? 'Your enquiry was submitted successfully.' : 'আপনার অনুসন্ধান সফলভাবে জমা হয়েছে।')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit your enquiry.')
    } finally { setBusy(false) }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setErrors({})
    const parsed = enquirySchema.safeParse(form)
    if (!parsed.success) {
      const next: Record<string, string> = {}
      parsed.error.issues.forEach(issue => { next[String(issue.path[0])] = issue.message })
      setErrors(next)
      return
    }
    if (!consent) { toast.error(dictionary.consent); return }
    const consentAt = new Date().toISOString()
    if (profile) { void submitAuthenticated(consentAt); return }
    setAuthEmail(form.email)
    setShowAuth(true)
  }

  return <form className="query-form" onSubmit={submit} noValidate>
    <div className="form-heading"><span className="eyebrow">{lang === 'en' ? 'Get in touch' : 'যোগাযোগ করুন'}</span><h3>{dictionary.title}</h3><p className="query-form-intro">{dictionary.subtitle}</p></div>
    <div className="form-grid two"><Field label={dictionary.name} error={errors.name}><input value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} autoComplete="name" aria-invalid={!!errors.name} /></Field><Field label={dictionary.email} error={errors.email}><input value={form.email} onChange={e => setForm(v => ({ ...v, email: e.target.value }))} autoComplete="email" inputMode="email" readOnly={!!profile} aria-readonly={!!profile} aria-invalid={!!errors.email} /></Field></div>
    <Field label={dictionary.phone} error={errors.phone}><input value={form.phone} onChange={e => setForm(v => ({ ...v, phone: e.target.value }))} autoComplete="tel" inputMode="tel" aria-invalid={!!errors.phone} /></Field>
    <Field label={dictionary.message} error={errors.message}><textarea value={form.message} onChange={e => setForm(v => ({ ...v, message: e.target.value }))} rows={5} aria-invalid={!!errors.message} /><span className="field-counter">{form.message.length}/5000</span></Field>
    <label className="consent-row"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><ShieldCheck size={16} /><span>{dictionary.consent}</span></label>
    <button className="btn primary query-submit" disabled={busy}>{busy ? <Loader2 className="spin" size={17} /> : <Mail size={17} />} {lang === 'en' ? 'Submit enquiry' : 'অনুসন্ধান জমা দিন'}</button>
    {showAuth && <div className="auth-consent-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="auth-consent-modal">
        <button type="button" className="auth-close" onClick={() => setShowAuth(false)} aria-label={lang === 'en' ? 'Close' : 'বন্ধ করুন'}><X size={20} /></button>
        <div className="auth-modal-icon"><ShieldCheck size={20} /></div>
        <h3 id="auth-title">{dictionary.authTitle}</h3>
        <p>{dictionary.authText}</p>
        <button type="button" className="auth-provider google" onClick={() => void beginGoogleAuth()} disabled={busy}><FaChrome size={18} aria-hidden="true" /><span>{lang === 'en' ? 'Continue with Google' : 'Google দিয়ে চালিয়ে যান'}</span></button>
        <div className="auth-divider"><span>{lang === 'en' ? 'or' : 'অথবা'}</span></div>
        <label className="auth-email-field"><span>{dictionary.authEmail}</span><input value={authEmail} onChange={e => setAuthEmail(e.target.value)} autoComplete="email" inputMode="email" placeholder={form.email} /></label>
        <small className="auth-email-help">{dictionary.authEmailHelp}</small>
        {!verificationSent ? <button type="button" className="auth-provider email" onClick={() => void continueWithEmail()} disabled={busy}><Mail size={18} /><span>{busy ? (lang === 'en' ? 'Sending…' : 'পাঠানো হচ্ছে…') : dictionary.continueEmail}</span></button> : <>
          <label className="auth-email-field"><span>{lang === 'en' ? 'Verification code' : 'যাচাইকরণ কোড'}</span><input value={verificationCode} onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" /></label>
          <button type="button" className="auth-provider email" onClick={() => void verifyAndSubmit()} disabled={busy}><ShieldCheck size={18} /><span>{busy ? (lang === 'en' ? 'Verifying…' : 'যাচাই হচ্ছে…') : dictionary.verifyEmail}</span></button>
        </>}
        <small className="auth-security-note">{dictionary.verifiedNote}</small>
      </div>
    </div>}
  </form>
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <label className="form-field"><span>{label}</span>{children}{error && <small className="field-error">{error}</small>}</label>
}
