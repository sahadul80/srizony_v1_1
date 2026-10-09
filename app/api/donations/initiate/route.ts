import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { donations } from '@/lib/db/schema'
import { ensureDonationsSchema } from '@/lib/db/ensureOperationalSchema'

const cfg=()=>({
 storeId:process.env.SSLCOMMERZ_STORE_ID,
 storePassword:process.env.SSLCOMMERZ_STORE_PASSWORD,
 baseUrl:(process.env.SSLCOMMERZ_BASE_URL||'https://sandbox.sslcommerz.com').replace(/\/$/,''),
 siteUrl:(process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000').replace(/\/$/,''),
})

type Body={amount:number;method?:string;anonymous?:boolean;name?:string;email?:string;phone?:string;message?:string}

const methodFilter:Record<string,string|undefined>={
 all:undefined,cards:'visacard,mastercard,amexcard,othercard',bkash:'bkash',nagad:'mobilebank',rocket:'mobilebank',mobile:'mobilebank',internet:'internetbank'
}

export async function POST(req:Request){
 try{
   const body=await req.json() as Body
   const amount=Number(body.amount)
   if(!Number.isFinite(amount)||amount<10||amount>500000) return NextResponse.json({error:'Donation amount must be between BDT 10 and BDT 500,000.'},{status:400})
   const {storeId,storePassword,baseUrl,siteUrl}=cfg()
   if(!storeId||!storePassword) return NextResponse.json({error:'SSLCOMMERZ is not configured. Add SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD to the server environment.'},{status:503})
   const tranId=`SF-DON-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`.slice(0,30)
   const anonymous=body.anonymous!==false
   const email=(body.email||'').trim().toLowerCase()
   const phone=(body.phone||'').trim()
   if (!anonymous && (!z.email().safeParse(email).success || phone.length < 7)) return NextResponse.json({error:'Name, a valid email address and phone number are required for identified donations.'},{status:400})
   if (!anonymous && !body.name?.trim()) return NextResponse.json({error:'Please provide the donor name.'},{status:400})
   if (anonymous && (!z.email().safeParse(email).success || phone.length < 7)) return NextResponse.json({error:'A valid email address and phone number are required for the payment gateway. Your donor identity can still remain anonymous in our records.'},{status:400})
   if (!db) return NextResponse.json({error:'Database is not configured.'},{status:503})
   await ensureDonationsSchema()
   await db.insert(donations).values({ transactionId: tranId, amount: amount.toFixed(2), status: 'pending', donor: { anonymous, name: body.name || '', email, phone, message: body.message || '', method: body.method || 'all' } })
   const data=new URLSearchParams({
     store_id:storeId,store_passwd:storePassword,total_amount:amount.toFixed(2),currency:'BDT',tran_id:tranId,
     success_url:`${siteUrl}/api/donations/callback?status=success`,fail_url:`${siteUrl}/api/donations/callback?status=failed`,cancel_url:`${siteUrl}/api/donations/callback?status=cancelled`,
     ipn_url:`${siteUrl}/api/donations/callback?status=ipn`,
     product_name:'Donation to Srizony Foundation',product_category:'donation',product_profile:'non-physical-goods',product_amount:amount.toFixed(2),
     cus_name:anonymous?'Anonymous Donor':(body.name||'Donor'),cus_email:email,cus_phone:phone,cus_add1:'Bangladesh',cus_city:'Dhaka',cus_state:'Dhaka',cus_postcode:'1000',cus_country:'Bangladesh',
     shipping_method:'NO',num_of_item:'1',value_a:body.method||'all',value_b:body.message||'',value_c:anonymous?'anonymous':'identified'
   })
   const filter=methodFilter[body.method||'all']; if(filter) data.set('multi_card_name',filter)
   let response: Response
   try {
     response=await fetch(`${baseUrl}/gwprocess/v4/api.php`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:data,cache:'no-store'})
   } catch (gatewayError) {
     await db.update(donations).set({ status:'failed' }).where(and(eq(donations.transactionId,tranId),eq(donations.status,'pending'))).catch(()=>undefined)
     throw gatewayError
   }
   const json=await response.json() as {status?:string;failedreason?:string;GatewayPageURL?:string}
   if(!response.ok||json.status!=='SUCCESS'||!json.GatewayPageURL){
     await db.update(donations).set({ status:'failed' }).where(and(eq(donations.transactionId,tranId),eq(donations.status,'pending'))).catch(()=>undefined)
     return NextResponse.json({error:json.failedreason||'Payment gateway did not return a checkout URL.'},{status:502})
   }
   return NextResponse.json({url:json.GatewayPageURL,tranId})
 }catch(error){console.error('Donation initiation error',error);return NextResponse.json({error:'Unable to start the payment.'},{status:500})}
}
