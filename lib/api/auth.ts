import { adminRequest, request } from './http'

export const adminLogin = (email: string, password: string) => adminRequest('/api/admin/login', { method: 'POST', json: { email, password } }, 'Login failed')
export const adminLogout = () => request('/api/admin/session', { method: 'DELETE' })
