// Scoped, read-only reconciliation report. No credentials or emails are printed.
const fs=require('node:fs');
const {Client}=require('pg');
const env=require('dotenv').parse(fs.readFileSync('.env'));
const email=process.argv[2];
const statuses=['subscription_pending','subscription_pending_payment','subscription_activating','subscription_authorized','subscription_reconciliation_required'];
async function get(path){
  const response=await fetch('https://api.mercadopago.com'+path,{headers:{Authorization:`Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`},signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`MP_HTTP_${response.status}`);
  return response.json();
}
async function run(){
  if(!email?.includes('@'))throw new Error('EMAIL_REQUIRED');
  const db=new Client({connectionString:env.DATABASE_URL,connectionTimeoutMillis:10000});
  await db.connect();
  try{
    const {rows:profiles}=await db.query('select id,subscription_status,stripe_subscription_id from advogados where lower(email)=lower($1)',[email]);
    if(profiles.length!==1)throw new Error('ACCOUNT_NOT_UNIQUE');
    const profile=profiles[0];
    console.log('Profile',{status:profile.subscription_status,subscription:profile.stripe_subscription_id});
    const {rows}=await db.query('select id,stripe_session_id,status,created_at from transacoes where advogado_id=$1 and tipo=$2 and status=any($3) order by created_at',[profile.id,'PRO_SUBSCRIPTION',statuses]);
    const subs=await get('/preapproval/search?'+new URLSearchParams({payer_email:email,limit:'100'}));
    console.log('Search completeness',{returned:subs.results?.length,total:subs.paging?.total});
    for(const row of rows){
      const payments=await get('/v1/payments/search?'+new URLSearchParams({external_reference:row.stripe_session_id,limit:'100'}));
      const matching=(subs.results||[]).filter(s=>s.external_reference===row.stripe_session_id);
      console.log('Attempt',{id:row.id,status:row.status,created:row.created_at,subscriptions:matching.map(s=>({id:s.id,status:s.status})),paymentTotal:payments.paging?.total,payments:payments.results?.map(p=>({id:p.id,status:p.status,detail:p.status_detail,referenceMatches:p.external_reference===row.stripe_session_id}))});
      for(const sub of matching){
        const invoices=await get('/authorized_payments/search?'+new URLSearchParams({preapproval_id:sub.id}));
        console.log('Invoices',{subscription:sub.id,paging:invoices.paging,results:invoices.results?.map(i=>({id:i.id,status:i.status,paymentStatus:i.payment?.status,paymentId:i.payment?.id}))});
      }
    }
    const {rows:hybrid}=await db.query("select id,method,status,provider_id from billing_checkouts where advogado_id=$1 and status in ('creating','pending')",[profile.id]);
    console.log('Open hybrid',hybrid);
  }finally{await db.end();}
}
run().catch(e=>{console.error(e.code||e.message);process.exitCode=1;});
