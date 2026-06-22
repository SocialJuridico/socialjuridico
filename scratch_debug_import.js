/**
 * Debug: inspect the stored metadata in lawyer_oab_processes and lawyer_processes
 * Run: node scratch_debug_import.js
 */
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE env vars. URL:', supabaseUrl, 'Key set:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debug() {
  console.log('\n========== lawyer_oab_processes ==========');
  const { data: oabRows, error: oabErr } = await supabase
    .from('lawyer_oab_processes')
    .select('*')
    .limit(5);

  if (oabErr) {
    console.error('Error:', oabErr.message);
  } else if (!oabRows.length) {
    console.log('No rows found in lawyer_oab_processes.');
  } else {
    for (const row of oabRows) {
      console.log('\n--- OAB Process ---');
      console.log('id:', row.id);
      console.log('numero_cnj:', row.numero_cnj);
      console.log('imported:', row.imported);
      console.log('metadata keys:', row.metadata ? Object.keys(row.metadata) : '(empty or null)');
      if (row.metadata?.capa) {
        console.log('metadata.capa:', JSON.stringify(row.metadata.capa, null, 2));
      } else {
        console.log('metadata.capa: MISSING');
      }
      if (row.metadata?.tribunal) {
        console.log('metadata.tribunal:', JSON.stringify(row.metadata.tribunal, null, 2));
      } else {
        console.log('metadata.tribunal: MISSING');
      }
    }
  }

  console.log('\n========== lawyer_processes (5 most recent) ==========');
  const { data: crmRows, error: crmErr } = await supabase
    .from('lawyer_processes')
    .select('id, numero_cnj, classe, orgao_julgador, tribunal_nome, tribunal_codigo, data_ajuizamento, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (crmErr) {
    console.error('Error:', crmErr.message);
  } else if (!crmRows.length) {
    console.log('No rows found in lawyer_processes.');
  } else {
    for (const row of crmRows) {
      console.log('\n--- CRM Process ---');
      console.log('numero_cnj:', row.numero_cnj);
      console.log('classe:', row.classe ?? '(empty)');
      console.log('orgao_julgador:', row.orgao_julgador ?? '(empty)');
      console.log('tribunal_nome:', row.tribunal_nome ?? '(empty)');
      console.log('tribunal_codigo:', row.tribunal_codigo ?? '(empty)');
      console.log('data_ajuizamento:', row.data_ajuizamento ?? '(empty)');
    }
  }
}

debug().catch(console.error);
