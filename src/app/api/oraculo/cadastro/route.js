import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabaseServer";
import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { isValidCPF, normalizeCPF } from "@/lib/cpf";
import { normalizeUF } from "@/lib/oab";
import {
  oraculoAccountConfirmationTemplate,
  oraculoSupervisorInviteTemplate,
} from "@/lib/oraculo/oraculoEmails";
import { resolvePublicAppOrigin } from "@/lib/publicAppOrigin";
import { resend } from "@/lib/resend";

const RESEND_FROM = "Social Jurídico <contato@socialjuridico.com.br>";

const TIPOS = ["ESTUDANTE", "ESTAGIARIO"];

const RELACOES = [
  "PROFESSOR",
  "ADVOGADO_CONHECIDO",
  "ADVOGADO_ESCRITORIO",
  "COORDENADOR_ACADEMICO",
  "MENTOR",
  "OUTRO",
];

const DOC_MIME_EXT = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_DOC_SIZE = 8 * 1024 * 1024;

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function text(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validatePayload(payload) {
  const nome = text(payload?.nome, 120);
  const email = text(payload?.email, 160).toLowerCase();
  const whatsapp = text(payload?.whatsapp, 20);
  const senha = String(payload?.senha || "");
  const cpf = normalizeCPF(payload?.cpf);
  const cidade = text(payload?.cidade, 120);
  const estado = normalizeUF(payload?.estado);
  const origemDescoberta = text(payload?.origem_descoberta, 80);
  const tipo = text(payload?.tipo, 20).toUpperCase();

  if (nome.length < 3) throw fail("Informe seu nome completo.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw fail("Informe um endereço de e-mail válido.");
  }
  const phoneDigits = whatsapp.replace(/\D/g, "");
  if (phoneDigits.length < 10 || phoneDigits.length > 11) {
    throw fail("Informe um número de WhatsApp válido.");
  }
  if (senha.length < 8) {
    throw fail("A senha deve possuir pelo menos oito caracteres.");
  }
  if (!isValidCPF(cpf)) throw fail("Informe um CPF válido.");
  if (!cidade || !estado) throw fail("Informe cidade e estado.");
  if (!origemDescoberta) {
    throw fail("Informe onde conheceu o Social Jurídico.");
  }
  if (!TIPOS.includes(tipo)) {
    throw fail("Selecione seu perfil jurídico/acadêmico.");
  }

  const isEstagiario = tipo === "ESTAGIARIO";
  const isEstudante = tipo === "ESTUDANTE";

  const oabEstagiarioNumero = isEstagiario
    ? text(payload?.oab_estagiario_numero, 10).replace(/\D/g, "")
    : null;
  const oabEstagiarioUf = isEstagiario
    ? normalizeUF(payload?.oab_estagiario_uf)
    : null;

  if (isEstagiario && (!oabEstagiarioNumero || !oabEstagiarioUf)) {
    throw fail(
      "Informe o número e a UF da sua inscrição de estagiário na OAB.",
    );
  }

  // Instituição: ou um id vindo do select (instituição ATIVA), ou o
  // nome digitado quando o candidato indica uma instituição nova. O nome
  // final é sempre resolvido no servidor (nunca se confia no texto do
  // cliente quando há id).
  const instituicaoId = text(payload?.instituicao_id, 60) || null;
  const instituicaoEnsino = text(payload?.instituicao_ensino, 180) || null;
  if (!instituicaoId && !instituicaoEnsino) {
    throw fail("Informe a instituição de ensino.");
  }

  const periodoAtual = isEstudante
    ? text(payload?.periodo_atual, 40)
    : null;
  const previsaoConclusao =
    isEstudante && payload?.previsao_conclusao
      ? String(payload.previsao_conclusao)
      : null;
  const numeroMatricula = isEstudante
    ? text(payload?.numero_matricula, 60) || null
    : null;
  const participaNucleoPratica = isEstudante
    ? Boolean(payload?.participa_nucleo_pratica)
    : null;
  const fezEstagioJuridico = isEstudante
    ? Boolean(payload?.fez_estagio_juridico)
    : null;

  if (isEstudante && !periodoAtual) {
    throw fail("Informe seu período atual.");
  }

  const areasInteresse = Array.isArray(payload?.areas_interesse)
    ? payload.areas_interesse.map((item) => text(item, 40)).filter(Boolean)
    : [];
  const experienciaPratica = text(payload?.experiencia_pratica, 60);
  const disponibilidadeSemanal = text(payload?.disponibilidade_semanal, 40);
  const bio = text(payload?.bio, 2000);
  const motivoParticipacao = text(payload?.motivo_participacao, 2000);

  if (!areasInteresse.length) {
    throw fail("Selecione ao menos uma área de interesse.");
  }
  if (!experienciaPratica) {
    throw fail("Selecione seu nível de experiência prática.");
  }
  if (!disponibilidadeSemanal) {
    throw fail("Selecione sua disponibilidade semanal.");
  }

  const supervisoresInput = Array.isArray(payload?.supervisores)
    ? payload.supervisores
    : [];

  if (!supervisoresInput.length || supervisoresInput.length > 3) {
    throw fail("Indique de 1 a 3 advogados supervisores.");
  }

  const supervisores = supervisoresInput.map((item) => {
    const supervisorNome = text(item?.nome, 120);
    const supervisorEmail = text(item?.email, 160).toLowerCase();
    const oabNumero = text(item?.oab_numero, 10).replace(/\D/g, "");
    const oabUf = normalizeUF(item?.oab_uf);
    const relacao = text(item?.relacao, 30).toUpperCase();

    if (supervisorNome.length < 3) {
      throw fail("Informe o nome de todos os supervisores.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supervisorEmail)) {
      throw fail("Informe um e-mail válido para cada supervisor.");
    }
    if (!oabNumero || !oabUf) {
      throw fail("Informe a OAB e a UF de cada supervisor.");
    }
    if (!RELACOES.includes(relacao)) {
      throw fail("Selecione a relação com cada supervisor indicado.");
    }

    return {
      nome: supervisorNome,
      email: supervisorEmail,
      oab_numero: oabNumero,
      oab_uf: oabUf,
      relacao,
    };
  });

  const uniqueSupervisorEmails = new Set(
    supervisores.map((item) => item.email),
  );
  if (uniqueSupervisorEmails.size !== supervisores.length) {
    throw fail("Os e-mails dos supervisores indicados devem ser distintos.");
  }

  if (!payload?.termos_aceitos) {
    throw fail(
      "Você precisa aceitar todas as declarações e termos para continuar.",
    );
  }

  return {
    nome,
    email,
    whatsapp,
    senha,
    cpf,
    cidade,
    estado,
    origemDescoberta,
    tipo,
    oabEstagiarioNumero,
    oabEstagiarioUf,
    instituicaoId,
    instituicaoEnsino,
    periodoAtual,
    previsaoConclusao,
    numeroMatricula,
    participaNucleoPratica,
    fezEstagioJuridico,
    areasInteresse,
    experienciaPratica,
    disponibilidadeSemanal,
    bio,
    motivoParticipacao,
    supervisores,
  };
}

async function validateDocument(file, fieldLabel) {
  if (!file || typeof file === "string") {
    throw fail(`Envie o ${fieldLabel}.`);
  }

  const mimeType = String(file.type || "").toLowerCase();
  const extension = DOC_MIME_EXT[mimeType];

  if (!extension) {
    throw fail(
      `O ${fieldLabel} deve ser PDF, JPG, PNG ou WEBP.`,
      415,
    );
  }

  if (file.size > MAX_DOC_SIZE) {
    throw fail(`O ${fieldLabel} excede o limite de 8 MB.`, 413);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return { buffer, mimeType, extension };
}

async function uploadDocument(userId, kind, doc) {
  const objectPath = `${userId}/${kind}-${Date.now()}.${doc.extension}`;

  const { error } = await supabaseAdmin.storage
    .from("oraculo-documentos")
    .upload(objectPath, doc.buffer, {
      contentType: doc.mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Falha ao enviar documento (${kind}): ${error.message}`);
  }

  return objectPath;
}

export async function POST(request) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  if (!supabaseAdmin) {
    return json(
      { success: false, message: "Serviço indisponível no servidor." },
      503,
    );
  }

  let createdUserId = null;

  try {
    const siteUrl = resolvePublicAppOrigin(request);
    const form = await request.formData();
    const rawPayload = form.get("payload");
    let payload;

    try {
      payload = JSON.parse(String(rawPayload || "{}"));
    } catch {
      throw fail("Dados do formulário inválidos.");
    }

    const data = validatePayload(payload);

    const { data: existingOraculo } = await supabaseAdmin
      .from("oraculo_profissionais")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();

    if (existingOraculo) {
      throw fail(
        "Já existe um cadastro do Oráculo Acadêmico com este e-mail.",
        409,
      );
    }

    // Resolver a instituição de ensino. Com id: precisa existir e estar
    // ATIVA (é o que o select público lista). Sem id: o candidato
    // indicou uma instituição nova — registra como RASCUNHO para a equipe
    // formalizar a participação depois.
    let instituicaoIdFinal = null;
    let instituicaoNome = data.instituicaoEnsino;

    if (data.instituicaoId) {
      const { data: instituicao } = await supabaseAdmin
        .from("oraculo_instituicoes")
        .select("id, nome, status")
        .eq("id", data.instituicaoId)
        .maybeSingle();

      if (!instituicao || instituicao.status !== "ATIVA") {
        throw fail("Selecione uma instituição de ensino válida.");
      }

      instituicaoIdFinal = instituicao.id;
      instituicaoNome = instituicao.nome;
    } else {
      const { data: existente } = await supabaseAdmin
        .from("oraculo_instituicoes")
        .select("id, nome")
        .ilike("nome", instituicaoNome)
        .maybeSingle();

      if (existente) {
        instituicaoIdFinal = existente.id;
        instituicaoNome = existente.nome;
      } else {
        const { data: indicada, error: indicadaError } = await supabaseAdmin
          .from("oraculo_instituicoes")
          .insert([{ nome: instituicaoNome, status: "RASCUNHO" }])
          .select("id")
          .single();

        if (indicadaError) {
          // Não bloqueia o cadastro: o nome em texto continua registrado no
          // perfil mesmo sem a linha na tabela de instituições.
          console.error(
            "[Oraculo/Cadastro] Falha ao registrar instituição indicada:",
            indicadaError,
          );
        } else {
          instituicaoIdFinal = indicada.id;
        }
      }
    }

    // Documento obrigatório de acordo com o tipo de perfil.
    let docField = "comprovante_matricula";
    let docLabel = "comprovante de matrícula";
    let dbColumn = "comprovante_matricula_url";

    if (data.tipo === "ESTAGIARIO") {
      docField = "comprovante_estagiario";
      docLabel = "comprovante de inscrição de estagiário";
      dbColumn = "comprovante_estagiario_url";
    }

    const docFile = form.get(docField);
    const validatedDoc = await validateDocument(docFile, docLabel);

    // 1. Conta no Auth. Dois caminhos:
    //    - Criação normal: e-mail novo → cria usuário não confirmado.
    //    - Ativação: e-mail já existe no ecossistema Social Jurídico → o
    //      candidato prova posse da conta com a senha atual e o cadastro do
    //      Oráculo é vinculado ao auth_user_id existente (mesmo padrão do
    //      produto Assinatura).
    const senhaContaExistente = String(payload?.senha_conta_existente || "");
    const isActivation = senhaContaExistente.length > 0;
    let user = null;

    if (isActivation) {
      const supabase = createClient();
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: data.email,
          password: senhaContaExistente,
        });

      if (signInError || !signInData?.user) {
        if (/not confirmed/i.test(signInError?.message || "")) {
          throw fail(
            "O e-mail da sua conta existente ainda não foi confirmado. Confirme-o antes de vincular o Oráculo Acadêmico.",
            403,
          );
        }
        throw fail(
          "Senha incorreta para a conta já existente com este e-mail.",
          401,
        );
      }

      user = signInData.user;
      // A verificação de posse não deve deixar sessão aberta nesta resposta.
      await supabase.auth.signOut().catch(() => {});

      // Regra do programa: quem já tem OAB de advogado não pode ser Oráculo;
      // contas de administrador também não.
      const { data: advogado } = await supabaseAdmin
        .from("advogados")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (advogado) {
        throw fail(
          "Contas de advogado não podem ativar o Oráculo Acadêmico — o programa é exclusivo para quem ainda não possui OAB de advogado.",
          403,
        );
      }

      const { data: adminRow } = await supabaseAdmin
        .from("admins")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (adminRow) {
        throw fail(
          "Contas de administrador não podem ativar o Oráculo Acadêmico.",
          403,
        );
      }

      const { data: existingProfile } = await supabaseAdmin
        .from("oraculo_profissionais")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (existingProfile) {
        throw fail(
          "Esta conta já possui um cadastro do Oráculo Acadêmico.",
          409,
        );
      }
    } else {
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: data.email,
          password: data.senha,
          email_confirm: false,
          user_metadata: { full_name: data.nome, role: "ORACULO" },
        });

      if (authError) {
        if (
          authError.message?.includes("already be registered") ||
          authError.status === 422
        ) {
          // Conta do ecossistema reconhecida — o wizard oferece vincular o
          // cadastro do Oráculo a ela mediante a senha atual.
          return json(
            {
              success: false,
              code: "ORACULO_ACTIVATION_REQUIRED",
              message:
                "Este e-mail já possui uma conta no ecossistema Social Jurídico. Informe a senha dessa conta para vincular o cadastro do Oráculo Acadêmico a ela.",
            },
            409,
          );
        }
        throw authError;
      }

      user = authData.user;
      if (!user) throw new Error("Erro ao identificar usuário.");
      // Rollback só se ESTA requisição criou o usuário — nunca na ativação.
      createdUserId = user.id;
    }

    // 2. Upload do documento obrigatório.
    const objectPath = await uploadDocument(user.id, docField, validatedDoc);

    // 3. Inserir o cadastro completo.
    const nowIso = new Date().toISOString();
    const { data: oraculoRow, error: insertError } = await supabaseAdmin
      .from("oraculo_profissionais")
      .insert([
        {
          auth_user_id: user.id,
          name: data.nome,
          email: data.email,
          whatsapp: data.whatsapp,
          cpf: data.cpf,
          cidade: data.cidade,
          estado: data.estado,
          origem_descoberta: data.origemDescoberta,
          tipo: data.tipo,
          instituicao_id: instituicaoIdFinal,
          instituicao_ensino: instituicaoNome,
          periodo_atual: data.periodoAtual,
          previsao_conclusao: data.previsaoConclusao,
          numero_matricula: data.numeroMatricula,
          [dbColumn]: objectPath,
          participa_nucleo_pratica: data.participaNucleoPratica,
          fez_estagio_juridico: data.fezEstagioJuridico,
          possui_oab_estagiario: data.tipo === "ESTAGIARIO",
          oab_estagiario_numero: data.oabEstagiarioNumero,
          oab_estagiario_uf: data.oabEstagiarioUf,
          areas_interesse: data.areasInteresse,
          experiencia_pratica: data.experienciaPratica,
          disponibilidade_semanal: data.disponibilidadeSemanal,
          bio: data.bio,
          motivo_participacao: data.motivoParticipacao,
          status: "PENDENTE_DOCUMENTOS",
          termos_aceitos_em: nowIso,
        },
      ])
      .select("id")
      .single();

    if (insertError) {
      throw new Error(
        `Falha ao salvar cadastro do Oráculo: ${insertError.message}`,
      );
    }

    // 4. Inserir supervisores.
    const { data: supervisorRows, error: supervisorError } =
      await supabaseAdmin
        .from("oraculo_supervisores")
        .insert(
          data.supervisores.map((supervisor) => ({
            oraculo_id: oraculoRow.id,
            nome: supervisor.nome,
            email: supervisor.email,
            oab_numero: supervisor.oab_numero,
            oab_uf: supervisor.oab_uf,
            relacao: supervisor.relacao,
            status: "CONVIDADO",
          })),
        )
        .select("id, nome, email, relacao, token_convite");

    if (supervisorError) {
      throw new Error(
        `Falha ao registrar supervisores: ${supervisorError.message}`,
      );
    }

    // 5. Disparar convites por e-mail aos supervisores.
    const relacaoLabels = {
      PROFESSOR: "Professor",
      ADVOGADO_CONHECIDO: "Advogado conhecido",
      ADVOGADO_ESCRITORIO: "Advogado do escritório onde estagia",
      COORDENADOR_ACADEMICO: "Coordenador acadêmico",
      MENTOR: "Mentor",
      OUTRO: "Outro",
    };

    for (const supervisor of supervisorRows || []) {
      const acceptUrl = new URL(
        `/oraculoacademico/supervisor/${supervisor.token_convite}`,
        siteUrl,
      ).toString();

      try {
        await resend.emails.send({
          from: RESEND_FROM,
          to: [supervisor.email],
          subject: "Convite para ser supervisor — Oráculo Acadêmico",
          html: oraculoSupervisorInviteTemplate({
            supervisorName: supervisor.nome,
            oraculoName: data.nome,
            relacaoLabel: relacaoLabels[supervisor.relacao] || supervisor.relacao,
            acceptUrl,
          }),
        });
      } catch (emailError) {
        console.error(
          "[Oraculo/Cadastro] Falha ao enviar convite de supervisor:",
          emailError,
        );
      }
    }

    // 6. E-mail de confirmação de conta com status, ao final de todas as
    // etapas do cadastro. Na ativação a conta já está confirmada, então o
    // e-mail não leva botão de confirmação — só o status e o acesso.
    try {
      if (isActivation) {
        await resend.emails.send({
          from: RESEND_FROM,
          to: data.email,
          subject: "Cadastro do Oráculo Acadêmico recebido",
          html: oraculoAccountConfirmationTemplate({
            name: data.nome,
            verifyUrl: null,
            activation: true,
          }),
        });
      } else {
        const { data: linkData, error: linkError } =
          await supabaseAdmin.auth.admin.generateLink({
            type: "signup",
            email: data.email,
            options: { redirectTo: `${siteUrl}/oraculoacademico/login` },
          });

        if (linkError) throw linkError;

        const hashedToken = linkData?.properties?.hashed_token;
        if (!hashedToken) {
          throw new Error("Não foi possível gerar o token de confirmação.");
        }

        const verifyUrl = new URL("/confirmar-email/processar", siteUrl);
        verifyUrl.searchParams.set("token_hash", hashedToken);
        verifyUrl.searchParams.set("type", "signup");
        // Marca a origem do cadastro para que a confirmacao leve o usuario de
        // volta ao login do Oraculo Academico, e nao ao login do Social Juridico.
        verifyUrl.searchParams.set("contexto", "oraculo");

        await resend.emails.send({
          from: RESEND_FROM,
          to: data.email,
          subject: "Bem-vindo ao Oráculo Acadêmico — confirme sua conta",
          html: oraculoAccountConfirmationTemplate({
            name: data.nome,
            verifyUrl: verifyUrl.toString(),
          }),
        });
      }
    } catch (emailError) {
      console.error(
        "[Oraculo/Cadastro] Falha ao enviar confirmação de conta:",
        emailError,
      );
      // A conta continua criada para permitir reenvio via resendConfirmationAction.
    }

    return json(
      {
        success: true,
        message: isActivation
          ? "Cadastro do Oráculo vinculado à sua conta existente! Seu acesso usa o e-mail e a senha que você já possui."
          : "Cadastro recebido! Verifique seu e-mail para confirmar sua conta.",
      },
      201,
    );
  } catch (error) {
    console.error("[Oraculo/Cadastro][POST] Erro:", {
      message: error?.message || "unknown",
    });

    if (createdUserId) {
      await supabaseAdmin.auth.admin
        .deleteUser(createdUserId)
        .catch((cleanupError) => {
          console.error(
            "[Oraculo/Cadastro] Falha ao limpar usuário após erro:",
            cleanupError,
          );
        });
    }

    const status = Number(error?.status) || 500;
    return json(
      {
        success: false,
        message:
          status < 500
            ? error.message
            : "Não foi possível concluir o cadastro.",
      },
      status,
    );
  }
}
