import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";

async function ensureAdmin(db, userId) {
  const { data: admin, error } = await db
    .from("admins")
    .select("id, role")
    .eq("id", userId)
    .eq("role", "ADMIN")
    .single();

  if (error || !admin) return false;
  return true;
}

export async function POST(request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const db = supabaseAdmin || supabase;
    const isAdmin = await ensureAdmin(db, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Acesso restrito a administradores" },
        { status: 403 },
      );
    }

    const { data: adminData, error: adminError } = await db
      .from("admins")
      .select("google_refresh_token")
      .eq("id", user.id)
      .single();

    if (adminError || !adminData?.google_refresh_token) {
      return NextResponse.json(
        { success: false, message: "google_not_connected" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const type = body.type || "CLIENTES"; // "CLIENTES" ou "ADVOGADOS"

    // 1. Instanciar o cliente OAuth2 do Google
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-contacts/callback`
    );

    oauth2Client.setCredentials({
      refresh_token: adminData.google_refresh_token
    });

    const tokenResponse = await oauth2Client.getAccessToken();
    const accessToken = tokenResponse.token;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Falha ao renovar autenticação com o Google." },
        { status: 400 }
      );
    }

    // 2. Garantir que o Contact Group (etiqueta) existe no Google Contacts
    const groupName = type === "ADVOGADOS" ? "Advogados SocialJurídico" : "Clientes SocialJurídico";
    
    const listGroupsRes = await fetch("https://people.googleapis.com/v1/contactGroups?groupFields=name", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json"
      }
    });

    let groupResourceName = null;
    if (listGroupsRes.ok) {
      const listGroupsData = await listGroupsRes.json();
      if (listGroupsData.contactGroups) {
        const existingGroup = listGroupsData.contactGroups.find(
          (g) => g.name === groupName || g.formattedName === groupName
        );
        if (existingGroup) {
          groupResourceName = existingGroup.resourceName;
        }
      }
    }

    if (!groupResourceName) {
      const createGroupRes = await fetch("https://people.googleapis.com/v1/contactGroups", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          contactGroup: {
            name: groupName
          }
        })
      });

      if (createGroupRes.ok) {
        const createGroupData = await createGroupRes.json();
        groupResourceName = createGroupData.resourceName;
      }
    }

    if (!groupResourceName) {
      groupResourceName = "contactGroups/myContacts"; // Fallback padrão
    }

    // 3. Listar contatos existentes no Google Contacts do usuário para evitar duplicados
    const existingPhones = new Set();
    const existingEmails = new Set();
    let nextPageToken = "";

    try {
      do {
        const url = `https://people.googleapis.com/v1/people/me/connections?pageSize=1000&personFields=phoneNumbers,emailAddresses${nextPageToken ? `&pageToken=${nextPageToken}` : ""}`;
        const res = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/json"
          }
        });
        if (!res.ok) break;

        const data = await res.json();
        if (data.connections) {
          for (const conn of data.connections) {
            if (conn.phoneNumbers) {
              for (const p of conn.phoneNumbers) {
                const cleaned = p.value ? p.value.replace(/\D/g, "") : "";
                if (cleaned) {
                  // Salva os últimos 9 dígitos (para lidar com DDI ou 9 extra)
                  existingPhones.add(cleaned.slice(-9));
                }
              }
            }
            if (conn.emailAddresses) {
              for (const e of conn.emailAddresses) {
                if (e.value) {
                  existingEmails.add(e.value.trim().toLowerCase());
                }
              }
            }
          }
        }
        nextPageToken = data.nextPageToken || "";
      } while (nextPageToken);
    } catch (eList) {
      console.warn("Aviso ao carregar contatos existentes para controle de duplicados:", eList);
    }

    // 4. Buscar contatos na nossa base de dados
    const tableName = type === "ADVOGADOS" ? "advogados" : "clientes";
    const { data: dbContacts, error: dbContactsError } = await db
      .from(tableName)
      .select("name, email, phone")
      .order("created_at", { ascending: false });

    if (dbContactsError) throw dbContactsError;

    // 5. Sincronizar contatos novos
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const contact of (dbContacts || [])) {
      try {
        const fullName = (contact.name || "").trim();
        if (!fullName) continue; // WhatsApp exige nome

        const email = (contact.email || "").trim().toLowerCase();
        let phone = contact.phone || "";
        const digitsOnly = phone.replace(/\D/g, "");
        
        let phoneFormatted = "";
        if (digitsOnly) {
          if (digitsOnly.startsWith("55") && digitsOnly.length >= 12) {
            phoneFormatted = `+${digitsOnly}`;
          } else if (digitsOnly.length >= 10 && digitsOnly.length <= 11) {
            phoneFormatted = `+55${digitsOnly}`;
          } else {
            phoneFormatted = phone.startsWith("+") ? phone : `+${digitsOnly}`;
          }
        }

        // Controle de duplicados
        const phoneKey = digitsOnly.slice(-9);
        const hasPhone = digitsOnly && existingPhones.has(phoneKey);
        const hasEmail = email && existingEmails.has(email);

        if (hasPhone || hasEmail) {
          skippedCount++;
          continue; // Já existe no Google Contatos
        }

        if (!phoneFormatted) continue; // WhatsApp exige telefone

        // Dividir nome para a API do Google
        const nameParts = fullName.split(/\s+/);
        const givenName = nameParts[0] || "";
        const familyName = nameParts.slice(1).join(" ") || "";

        const contactBody = {
          names: [
            {
              givenName: givenName,
              familyName: familyName,
              displayName: fullName
            }
          ],
          phoneNumbers: [
            {
              value: phoneFormatted,
              type: "mobile"
            }
          ],
          biographies: [
            {
              value: `Sincronizado via SocialJurídico. Tipo: ${type === "ADVOGADOS" ? "Advogado" : "Cliente"}`,
              contentType: "TEXT_PLAIN"
            }
          ],
          memberships: [
            {
              contactGroupMembership: {
                contactGroupResourceName: groupResourceName
              }
            }
          ]
        };

        if (email) {
          contactBody.emailAddresses = [
            {
              value: email,
              type: "home"
            }
          ];
        }

        const res = await fetch("https://people.googleapis.com/v1/people:createContact", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(contactBody)
        });

        if (res.ok) {
          successCount++;
          // Adiciona ao set local para evitar duplicados caso o loop processe cadastros idênticos
          if (digitsOnly) existingPhones.add(phoneKey);
          if (email) existingEmails.add(email);
        } else {
          const errData = await res.json();
          console.error(`Erro ao criar contato Google para ${fullName}:`, errData);
          errorCount++;
        }
      } catch (loopErr) {
        console.error("Erro ao processar contato:", loopErr);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `${successCount} contatos novos sincronizados. ${skippedCount} já existiam e foram pulados. ${errorCount} falhas.`,
      successCount,
      skippedCount,
      errorCount
    });

  } catch (error) {
    console.error("Erro na API POST /api/admin/google-contacts/sync:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
      { status: 500 },
    );
  }
}
