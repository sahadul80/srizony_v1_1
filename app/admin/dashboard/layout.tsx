import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/adminAuth'
import Shell from './_components/Shell'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  return <Shell userEmail={session.email}>{children}</Shell>
}
