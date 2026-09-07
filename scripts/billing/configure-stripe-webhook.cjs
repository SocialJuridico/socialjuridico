// Run after publishing the endpoint. Never prints signing secrets.
const fs=require("node:fs");
const dotenv=require("dotenv");
const Stripe=require("stripe");
const filename=".env";
const text=fs.readFileSync(filename,"utf8");
const env=dotenv.parse(text);
const stripe=new Stripe(env.STRIPE_SECRET_KEY,{apiVersion:"2026-02-25.clover"});
const site=new URL(env.NEXT_PUBLIC_SITE_URL || "https://socialjuridico.com.br");
const url=new URL("/api/webhook/stripe",site).href;
const events=["checkout.session.completed","checkout.session.expired","invoice.paid","customer.subscription.updated","customer.subscription.deleted"];
async function main(){
  if(site.protocol!=="https:")throw new Error("HTTPS_REQUIRED");
  const endpoints=await stripe.webhookEndpoints.list({limit:100});
  const matching=endpoints.data.filter(endpoint=>endpoint.url===url);
  if(matching.length>1)throw new Error("MULTIPLE_MATCHING_ENDPOINTS");
  if(matching[0]){
    const endpoint=matching[0];
    console.log(JSON.stringify({id:endpoint.id,url,status:endpoint.status,missingEvents:events.filter(event=>!endpoint.enabled_events.includes(event)&&!endpoint.enabled_events.includes("*"))}));
    // Stripe does not return an existing signing secret. Do not rotate it or alter other sites.
    return;
  }
  if(!process.argv.includes("--create")){console.log("Webhook Social Jurídico ausente. Após publicar, execute com --create.");return;}
  fs.accessSync(filename,fs.constants.W_OK);
  const endpoint=await stripe.webhookEndpoints.create({url,enabled_events:events,api_version:"2026-02-25.clover",description:"Social Jurídico - cartão e assinaturas"});
  if(!endpoint.secret)throw new Error("SIGNING_SECRET_NOT_RETURNED");
  const line=`STRIPE_WEBHOOK_SECRET=${endpoint.secret}`;
  fs.writeFileSync(filename,/^STRIPE_WEBHOOK_SECRET\s*=.*$/m.test(text)
    ?text.replace(/^STRIPE_WEBHOOK_SECRET\s*=.*$/m,line):`${text}\n${line}\n`);
  console.log(JSON.stringify({id:endpoint.id,url,status:endpoint.status,secretSaved:true}));
  console.log("Sincronize STRIPE_WEBHOOK_SECRET com o ambiente publicado e reinicie o serviço.");
}
main().catch(error=>{console.error(error.code||error.type||"WEBHOOK_CONFIGURATION_FAILED");process.exitCode=1;});
