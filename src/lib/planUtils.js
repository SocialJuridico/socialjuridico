export const PLAN_LIMITS = {
  FREE: {
    crm_clients: 0,
    smart_docs_mb: 0,
    redator_ia: 0,
    triagem: 0,
    agenda: 0,
    has_calculadora: false,
    has_jurisprudencia: false,
  },
  START: {
    crm_clients: 10,
    smart_docs_mb: 500,
    redator_ia: 20,
    triagem: 10,
    agenda: 30,
    has_calculadora: false,
    has_jurisprudencia: false,
  },
  PRO: {
    crm_clients: Infinity,
    smart_docs_mb: 10000, // 10GB
    redator_ia: 200,
    triagem: 200,
    agenda: Infinity,
    has_calculadora: true,
    has_jurisprudencia: true,
  }
};

export async function getUserPlanLimits(supabaseDb, userId) {
  const { data: user, error } = await supabaseDb
    .from('advogados')
    .select('plan_type, is_premium, uso_redator_ia, uso_triagem, uso_agenda, uso_storage_mb, extra_redator_ia, extra_triagem, extra_storage_mb')
    .eq('id', userId)
    .single();

  if (error) {
    console.error(`[getUserPlanLimits] Erro ao buscar limites para o usuário ${userId}:`, error);
  }

  if (!user) return null;

  // Garantir retrocompatibilidade: quem já era premium vira PRO implicitamente
  let planType = user.plan_type || 'FREE';
  if (user.is_premium && planType === 'FREE') {
    planType = 'PRO';
  }

  const baseLimits = PLAN_LIMITS[planType] || PLAN_LIMITS.FREE;

  return {
    planType,
    isLegacyPro: user.is_premium,
    
    // CRM
    maxCrmClients: baseLimits.crm_clients,
    
    // Smart Docs
    maxStorageMb: baseLimits.smart_docs_mb + (user.extra_storage_mb || 0),
    usedStorageMb: user.uso_storage_mb || 0,
    canUploadDocs: function(fileSizeMb) {
      return (this.usedStorageMb + fileSizeMb) <= this.maxStorageMb;
    },

    // Redator IA
    maxRedatorIa: baseLimits.redator_ia + (user.extra_redator_ia || 0),
    usedRedatorIa: user.uso_redator_ia || 0,
    canUseRedatorIa: function() {
      return this.usedRedatorIa < this.maxRedatorIa;
    },

    // Triagem
    maxTriagem: baseLimits.triagem + (user.extra_triagem || 0),
    usedTriagem: user.uso_triagem || 0,
    canUseTriagem: function() {
      return this.usedTriagem < this.maxTriagem;
    },

    // Agenda
    maxAgenda: baseLimits.agenda,
    usedAgenda: user.uso_agenda || 0,
    canUseAgenda: function() {
      return this.usedAgenda < this.maxAgenda;
    },

    // Boolean features
    hasCalculadora: baseLimits.has_calculadora,
    hasJurisprudencia: baseLimits.has_jurisprudencia,
  };
}

export async function incrementUsage(supabaseDb, userId, field, amount = 1) {
    try {
        const { data, error: selectError } = await supabaseDb.from('advogados').select(field).eq('id', userId).single();
        
        if (selectError) {
            console.error(`[incrementUsage] Erro ao buscar ${field} para o usuário ${userId}:`, selectError);
            return null;
        }

        if (data) {
            const newValue = (data[field] || 0) + amount;
            const { error: updateError } = await supabaseDb.from('advogados').update({ [field]: newValue }).eq('id', userId);
            
            if (updateError) {
                console.error(`[incrementUsage] Erro ao atualizar ${field} para ${newValue} (usuário ${userId}):`, updateError);
                return null;
            }

            console.log(`[incrementUsage] ${field} atualizado para ${newValue} (usuário ${userId})`);
            return newValue;
        }
        
        console.warn(`[incrementUsage] Usuário ${userId} não encontrado na tabela advogados.`);
        return null;
    } catch (err) {
        console.error(`[incrementUsage] Erro inesperado:`, err);
        return null;
    }
}
