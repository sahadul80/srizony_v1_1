'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackVisit } from '@/lib/api/public'

function visitorId() {
  const key='sf-visitor-id'
  const current=window.localStorage.getItem(key)
  if(current) return current
  const value=crypto.randomUUID()
  window.localStorage.setItem(key,value)
  return value
}

export default function VisitorTracker(){
  const pathname=usePathname()||'/'
  useEffect(()=>{
    const id=visitorId()
    void trackVisit(id,pathname,document.referrer||undefined)
  },[pathname])
  return null
}
