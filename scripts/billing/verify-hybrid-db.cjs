// Tests use isolated temporary tables; no customer rows or payments are modified.
const fs = require("node:fs");
const assert = require("node:assert/strict");
const { Client } = require("pg");
const env = require("dotenv").parse(fs.readFileSync(".env"));
const migration = fs.readFileSync("database/migrations/20260907_hybrid_checkout.sql","utf8");
const client = new Client({connectionString:env.DATABASE_URL,connectionTimeoutMillis:10000});
async function run() {
  await client.connect();
  await client.query("begin");
  try {
    await client.query("create temp table advogados (like public.advogados including defaults including constraints including indexes); create temp table transacoes (like public.transacoes including defaults including constraints including indexes)");
    const testSql=migration.replaceAll("public.","pg_temp.").replaceAll("search_path = public","search_path = pg_temp")
      .replace(/^revoke .*$/gm,"").replace(/^grant .*$/gm,"").replace(/^notify .*$/gm,"");
    await client.query(testSql);
    const owner="00000000-0000-0000-0000-000000000001";
    const checkout="00000000-0000-0000-0000-000000000002";
    await client.query("insert into pg_temp.advogados(id,balance) values($1,0)",[owner]);
    const product={type:"JURIS_PURCHASE",jurisAmount:10,recurring:false,priceInCents:990};
    await client.query("insert into pg_temp.billing_checkouts(id,advogado_id,method,product,payer_email) values($1,$2,$3,$4,$5)",[checkout,owner,"pix",product,"fixture@example.invalid"]);
    const invoke=(key,amount,first=true,sub=null,end=null)=>client.query("select pg_temp.fulfill_hybrid_checkout($1,$2,$3,$4,$5,$6) as result",[checkout,key,amount,first,sub,end]);
    assert.equal((await invoke("mp_order_fixture",990)).rows[0].result.approved,true);
    assert.equal((await invoke("mp_order_fixture",990)).rows[0].result.duplicate,true);
    assert.equal((await client.query("select balance from pg_temp.advogados")).rows[0].balance,10);
    assert.equal((await client.query("select count(*)::int as count from pg_temp.transacoes")).rows[0].count,1);
    await client.query("savepoint invalid_amount");
    await assert.rejects(()=>invoke("another_payment",800),/SECOND_PAYMENT_FOR_ONE_TIME_CHECKOUT/);
    await client.query("rollback to savepoint invalid_amount");
    await client.query("delete from pg_temp.billing_receipts; delete from pg_temp.transacoes");
    const plan={type:"PRO_SUBSCRIPTION",planType:"PRO",billingCycle:"MONTHLY",jurisAmount:20,recurring:true,priceInCents:3999,renewalPriceInCents:15000};
    await client.query("update pg_temp.billing_checkouts set product=$1,method=$2,status=$3",[plan,"card","pending"]);
    await invoke("stripe_invoice_first",3999,true,"sub_fixture","2026-10-07T00:00:00Z");
    await invoke("stripe_invoice_renewal",15000,false,"sub_fixture","2026-11-07T00:00:00Z");
    await invoke("stripe_invoice_first",3999,true,"sub_fixture","2026-10-07T00:00:00Z");
    const lawyer=(await client.query("select balance,plan_type,premium_expires_at from pg_temp.advogados")).rows[0];
    assert.equal(lawyer.balance,50);assert.equal(lawyer.plan_type,"PRO");
    assert.equal(new Date(lawyer.premium_expires_at).toISOString(),"2026-11-07T00:00:00.000Z");
    await client.query("savepoint mismatch");
    await assert.rejects(()=>invoke("stripe_invoice_wrong",6990,false,"sub_fixture","2026-12-07T00:00:00Z"),/AMOUNT_MISMATCH/);
    await client.query("rollback to savepoint mismatch");
    await client.query("savepoint duplicate_plan");
    await assert.rejects(()=>client.query("insert into pg_temp.billing_checkouts(id,advogado_id,method,product,payer_email) values($1,$2,$3,$4,$5)",
      ["00000000-0000-0000-0000-000000000003",owner,"card",plan,"fixture@example.invalid"]),/PLAN_ALREADY_ACTIVE/);
    await client.query("rollback to savepoint duplicate_plan");
    console.log("PASS: atomic delivery, duplicate receipt, second payment blocked, first promotion, renewal, out-of-order duplicate and amount mismatch.");
  } finally {await client.query("rollback");}
  if(process.argv.includes("--apply")) {
    await client.query("begin");
    try {await client.query(migration);await client.query("commit");console.log("Migration applied.");}
    catch(error){await client.query("rollback");throw error;}
    const result=await client.query("select relname,relrowsecurity from pg_class where oid in ('public.billing_checkouts'::regclass,'public.billing_receipts'::regclass)");
    console.log(JSON.stringify(result.rows));
    const grants=await client.query("select has_function_privilege('anon','public.fulfill_hybrid_checkout(uuid,text,integer,boolean,text,timestamptz)','execute') as anon_execute,has_function_privilege('authenticated','public.fulfill_hybrid_checkout(uuid,text,integer,boolean,text,timestamptz)','execute') as user_execute,has_function_privilege('service_role','public.fulfill_hybrid_checkout(uuid,text,integer,boolean,text,timestamptz)','execute') as backend_execute");
    assert.deepEqual(grants.rows[0],{anon_execute:false,user_execute:false,backend_execute:true});
    console.log("PASS: RLS enabled and fulfillment callable only by backend.");
  }
}
run().catch(error=>{console.error(error.code || "VERIFY_FAILED",error.message);process.exitCode=1;}).finally(()=>client.end());
