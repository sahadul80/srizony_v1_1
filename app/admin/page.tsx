import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/adminAuth'

export default async function AdminPage() {
  if (!(await getAdminSession())) redirect('/admin/login')
  redirect('/admin/dashboard')
}
