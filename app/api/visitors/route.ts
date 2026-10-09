import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { db } from '@/lib/db'
import { VISITOR_COOKIE } from '@/lib/authSession'

const schema=z.object({visitorId:z.string().uuid().optional(),path:z.string().trim().min(1).max(1000),referrer:z.string().max(2000).optional()})
export async function POST(req:Request){
  const parsed=schema.safeParse(await req.json().catch(()=>null)); if(!parsed.success)return NextResponse.json({ok:false},{status:400}); if(!db)return new NextResponse(null,{status:204})
  const visitorId=parsed.data.visitorId||randomUUID(), userAgent=req.headers.get('user-agent')||undefined
  try{
    await db.execute(sql`
      WITH upserted AS (
        INSERT INTO site_visitors (visitor_id, last_path, referrer, user_agent, page_views)
        VALUES (${visitorId}, ${parsed.data.path}, ${parsed.data.referrer||null}, ${userAgent||null}, 1)
        ON CONFLICT (visitor_id) DO UPDATE SET
          last_seen_at = now(), last_path = EXCLUDED.last_path, referrer = EXCLUDED.referrer,
          user_agent = EXCLUDED.user_agent, page_views = site_visitors.page_views + 1
        RETURNING visitor_id
      )
      INSERT INTO visitor_events (visitor_id, path, referrer, user_agent)
      SELECT visitor_id, ${parsed.data.path}, ${parsed.data.referrer||null}, ${userAgent||null} FROM upserted
    `)
  }catch{ /* analytics should never break the site */ }
  const response=NextResponse.json({ok:true}); response.cookies.set(VISITOR_COOKIE,visitorId,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:60*60*24*365,path:'/'}); return response
}

