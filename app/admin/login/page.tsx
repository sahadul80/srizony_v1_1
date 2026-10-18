'use client'

import { FormEvent, useState } from 'react'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { adminLogin } from '@/lib/api/auth'

export default function AdminLoginPage() {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true)
    try {
      await adminLogin(email, password)
      toast.success('CMS login successful')
      router.replace('/admin/dashboard')
      router.refresh()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Login failed') }
    finally { setBusy(false) }
  }

  return <main className="admin-auth-page"><div className="admin-auth-orbit orbit-a"/><div className="admin-auth-orbit orbit-b"/><Card className="admin-login-card"><CardHeader><div className="admin-brand-mark"><ShieldCheck size={21}/></div><CardTitle>Srizony CMS</CardTitle><CardDescription>Securely manage bilingual content, theme tokens and submissions.</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="admin-form"><div><Label htmlFor="email">Admin email</Label><div className="admin-input-with-icon"><Mail size={16}/><Input id="email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@example.com" /></div></div><div><Label htmlFor="password">Password</Label><div className="admin-input-with-icon"><LockKeyhole size={16}/><Input id="password" type={show?'text':'password'} autoComplete="current-password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" /><button type="button" className="password-toggle" onClick={()=>setShow(v=>!v)} aria-label={show?'Hide password':'Show password'}>{show?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></div><Button type="submit" size="lg" disabled={busy}>{busy?'Signing in…':'Sign in'}<ArrowRight size={17}/></Button><p className="admin-login-note">Set <code>CMS_ADMIN_USERS_JSON</code> (or the legacy single-user variables) and either <code>CMS_SESSION_SECRET</code> or <code>AUTH_SECRET</code> in your environment.</p></form></CardContent></Card></main>
}
