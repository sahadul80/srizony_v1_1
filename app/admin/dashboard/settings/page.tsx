import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/adminAuth'
import SettingsClient from './SettingsClient'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')
  return <SettingsClient role={session.role} />
}
