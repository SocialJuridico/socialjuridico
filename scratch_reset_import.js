/**
 * Reset: remove the empty CRM process entry and reset the imported flag
 * in lawyer_oab_processes so it can be reimported with full data.
 * Run: node scratch_reset_import.js
 */
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE env vars.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// The CNJ that was imported empty
const EMPTY_CNJ = '50123456720268210001';

async function reset() {
  // 1. Find the empty lawyer_process
  const { data: proc, error: procErr } = await supabase
    .from('lawyer_processes')
    .select('id, numero_cnj, classe, orgao_julgador')
    .eq('numero_cnj', EMPTY_CNJ)
    .limit(1)
    .single();

  if (procErr || !proc) {
    console.log('No CRM process found for CNJ', EMPTY_CNJ, '-', procErr?.message);
  } else {
    console.log('Found CRM process:', proc.id, '| classe:', proc.classe ?? '(empty)', '| orgao:', proc.orgao_julgador ?? '(empty)');

    // Delete associated parties and movements first (FK constraints)
    const { error: partErr } = await supabase
      .from('lawyer_process_parties')
      .delete()
      .eq('process_id', proc.id);
    if (partErr) console.warn('parties delete:', partErr.message);
    else console.log('✓ Deleted process parties');

    const { error: movErr } = await supabase
      .from('lawyer_process_movements')
      .delete()
      .eq('process_id', proc.id);
    if (movErr) console.warn('movements delete:', movErr.message);
    else console.log('✓ Deleted process movements');

    // Delete the process itself
    const { error: delErr } = await supabase
      .from('lawyer_processes')
      .delete()
      .eq('id', proc.id);
    if (delErr) console.error('Failed to delete process:', delErr.message);
    else console.log('✓ Deleted empty CRM process:', proc.id);
  }

  // 2. Reset imported flag in lawyer_oab_processes
  const { data: updated, error: upErr } = await supabase
    .from('lawyer_oab_processes')
    .update({ imported: false, updated_at: new Date().toISOString() })
    .eq('numero_cnj', EMPTY_CNJ)
    .select('id, numero_cnj, imported');

  if (upErr) {
    console.error('Failed to reset imported flag:', upErr.message);
  } else {
    console.log('✓ Reset imported flag for OAB process:', updated);
  }

  console.log('\nDone! Go to /dashboard/advogado/monitoramento and reimport the process.');
}

reset().catch(console.error);
