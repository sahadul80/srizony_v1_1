'use client'
import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/app/components/ui/button'

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
 useEffect(()=>{},[])
 return <main className="page-state container"><div className="state-card"><div className="state-icon"><AlertTriangle size={22}/></div><h1>Something went wrong</h1><p>The page could not be rendered. Your content is safe; try loading it again.</p><Button onClick={()=>reset()}><RefreshCw size={16}/> Try again</Button></div></main>
}
