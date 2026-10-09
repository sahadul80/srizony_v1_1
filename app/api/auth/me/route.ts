import { NextResponse } from 'next/server'
import { getCurrentFormUser } from '@/lib/formFlow'
export async function GET() { return NextResponse.json({ user: await getCurrentFormUser() }, { headers: { 'Cache-Control': 'no-store' } }) }
export async function DELETE() { const response=NextResponse.json({ok:true}); response.cookies.set('sf-auth','',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:0,path:'/'}); return response }
