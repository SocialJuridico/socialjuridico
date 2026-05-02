require('dotenv').config({ path: '.env' });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fs = require('fs');

async function createPlans() {
  console.log("Iniciando criação de produtos e preços no Stripe...");

  try {
    // 1. Criar Produto START
    console.log("Criando Produto START...");
    const startProduct = await stripe.products.create({
      name: 'SocialJurídico START',
      description: 'Acesso essencial à plataforma jurídica com limites.',
    });

    const startAvulso = await stripe.prices.create({
      product: startProduct.id,
      unit_amount: 4990, // R$ 49,90
      currency: 'brl',
    });

    const startMensal = await stripe.prices.create({
      product: startProduct.id,
      unit_amount: 4099, // R$ 40,99
      currency: 'brl',
      recurring: { interval: 'month' },
    });

    const startAnual = await stripe.prices.create({
      product: startProduct.id,
      unit_amount: 43188, // R$ 431,88
      currency: 'brl',
      recurring: { interval: 'year' },
    });

    // 2. Criar Produto PRO
    console.log("Criando Produto PRO...");
    const proProduct = await stripe.products.create({
      name: 'SocialJurídico PRO',
      description: 'Acesso ilimitado e completo à plataforma jurídica.',
    });

    const proAvulso = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 9790, // R$ 97,90
      currency: 'brl',
    });

    const proMensal = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 8790, // R$ 87,90
      currency: 'brl',
      recurring: { interval: 'month' },
    });

    const proAnual = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 91188, // R$ 911,88
      currency: 'brl',
      recurring: { interval: 'year' },
    });

    // 3. Criar Produtos de Expansão
    console.log("Criando Produtos de Expansão (Add-ons)...");
    
    const extraDocs = await stripe.products.create({ name: 'Expansão Smart Docs (+1GB)' });
    const priceDocs = await stripe.prices.create({
      product: extraDocs.id, unit_amount: 1500, currency: 'brl',
      metadata: { expansion_type: 'smart_docs_1gb' }
    });

    const extraIA = await stripe.products.create({ name: 'Expansão Redator IA (+10 Gerações)' });
    const priceIA = await stripe.prices.create({
      product: extraIA.id, unit_amount: 1500, currency: 'brl',
      metadata: { expansion_type: 'redator_ia_10' }
    });

    const extraTriagem = await stripe.products.create({ name: 'Expansão Triagem (+5 Gerações)' });
    const priceTriagem = await stripe.prices.create({
      product: extraTriagem.id, unit_amount: 1500, currency: 'brl',
      metadata: { expansion_type: 'triagem_5' }
    });

    console.log("\n==========================================");
    console.log("PRODUTOS CRIADOS COM SUCESSO!");
    console.log("Copie estas variáveis para o seu arquivo .env:");
    console.log("==========================================\n");

    const envUpdates = `
# NOVOS PLANOS - SOCIALJURIDICO (Adicionados em ${new Date().toLocaleDateString()})
NEXT_PUBLIC_STRIPE_PRICE_START_AVULSO=${startAvulso.id}
NEXT_PUBLIC_STRIPE_PRICE_START_MENSAL=${startMensal.id}
NEXT_PUBLIC_STRIPE_PRICE_START_ANUAL=${startAnual.id}

NEXT_PUBLIC_STRIPE_PRICE_PRO_AVULSO=${proAvulso.id}
NEXT_PUBLIC_STRIPE_PRICE_PRO_MENSAL=${proMensal.id}
NEXT_PUBLIC_STRIPE_PRICE_PRO_ANUAL=${proAnual.id}

NEXT_PUBLIC_STRIPE_PRICE_EXTRA_DOCS=${priceDocs.id}
NEXT_PUBLIC_STRIPE_PRICE_EXTRA_IA=${priceIA.id}
NEXT_PUBLIC_STRIPE_PRICE_EXTRA_TRIAGEM=${priceTriagem.id}
`;

    console.log(envUpdates);
    
    // Anexar no .env automaticamente
    fs.appendFileSync('.env', envUpdates);
    console.log("✅ Os IDs foram adicionados automaticamente ao final do seu arquivo .env!");

  } catch (error) {
    console.error("Erro ao criar planos:", error);
  }
}

createPlans();
