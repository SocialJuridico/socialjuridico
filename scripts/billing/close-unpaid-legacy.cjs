// Explicitly targeted maintenance: cancel only a pending subscription with no
// payments or invoices, then release its matching local checkout blocker.
const fs=require('node:fs');
const {Client}=require('pg');
const env=require('dotenv').parse(fs.readFileSync('.env'));
const [email,transactionId,subscriptionId]=process.argv.slice(2);
const unresolved=['subscription_pending','subscription_pending_payment','subscription_activating','subscription_authorized','subscription_reconciliation_required'];
async function request(path,body){
  const response=await fetch('https://api.mercadopago.com'+path,{
    method:body?'PUT':'GET',headers:{Authorization:`Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,'Content-Type':'application/json'},
    ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
  if(!response.ok){
    const detail=await response.json().catch(()=>({}));
    const message=String(detail.message||detail.error||'').replace(/[\w.+-]+@[\w.-]+/g,'[email]').slice(0,200);
    throw new Error(`MP_HTTP_${response.status}: ${message}`);
  }
  return response.json();
}
const empty=result=>Array.isArray(result.results)&&result.results.length===0&&result.paging?.total===0;
async function verifyUnpaid(reference){
  const payments=await request('/v1/payments/search?'+new URLSearchParams({external_reference:reference,limit:'100'}));
  const invoices=await request('/authorized_payments/search?'+new URLSearchParams({preapproval_id:subscriptionId}));
  if(!empty(payments)||!empty(invoices))throw new Error('PAYMENT_OR_INVOICE_PRESENT_STOP');
}
async function run(){
  if(!email?.includes('@')||!transactionId||!subscriptionId)throw new Error('EXPLICIT_TARGET_REQUIRED');
  const db=new Client({connectionString:env.DATABASE_URL,connectionTimeoutMillis:10000});
  await db.connect();
  try{
    await db.query('begin');
    const {rows}=await db.query("select t.id,t.advogado_id,t.stripe_session_id,t.status from transacoes t join advogados a on a.id=t.advogado_id where lower(a.email)=lower($1) and t.id=$2 and t.tipo='PRO_SUBSCRIPTION' for update of t",[email,transactionId]);
    if(rows.length!==1||!unresolved.includes(rows[0].status))throw new Error('TARGET_NOT_UNRESOLVED');
    const row=rows[0];
    const path='/preapproval/'+encodeURIComponent(subscriptionId);
    const sub=await request(path);
    if(sub.id!==subscriptionId||sub.external_reference!==row.stripe_session_id)throw new Error('SUBSCRIPTION_MISMATCH');
    if(!['pending','canceled','cancelled'].includes(sub.status))throw new Error('SUBSCRIPTION_NOT_PENDING');
    await verifyUnpaid(row.stripe_session_id);
    if(sub.status==='pending')await request(path,{status:'cancelled'});
    const confirmed=await request(path);
    if(!['canceled','cancelled'].includes(confirmed.status))throw new Error('CANCELLATION_NOT_CONFIRMED');
    await verifyUnpaid(row.stripe_session_id);
    const result=await db.query("update transacoes set status='subscription_canceled' where id=$1 and advogado_id=$2 and status=any($3) returning id",[row.id,row.advogado_id,unresolved]);
    if(result.rowCount!==1)throw new Error('LOCAL_STATE_CHANGED');
    await db.query('commit');
    const remaining=await db.query("select count(*)::int as count from transacoes where advogado_id=$1 and tipo='PRO_SUBSCRIPTION' and status=any($2)",[row.advogado_id,unresolved]);
    console.log({providerStatus:confirmed.status,localStatus:'subscription_canceled',remainingLegacyBlockers:remaining.rows[0].count});
  }catch(error){await db.query('rollback');throw error;}finally{await db.end();}
}
run().catch(error=>{console.error(error.code||error.message);process.exitCode=1;});
