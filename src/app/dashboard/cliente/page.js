"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  PlusCircle,
  Bell,
  User,
  LogOut,
  Scale,
  Star,
  ShieldCheck,
  Menu,
  X,
  Upload,
  FileText,
  ImageIcon,
  Trash2,
  MessageSquare,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  Check,
  UserX,
  Search,
  Globe,
} from "lucide-react";
import styles from "./Dashboard.module.css";
import {
  updateCasoAction,
  updatePasswordAction,
  deleteAccountAction,
} from "@/app/actions/authActions";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

const FACEBOOK_GROUP_URL = "https://www.facebook.com/groups/1667675480204134";

const USEFUL_LINKS = [
  {
    title: "ConfirmaAdv",
    description: "Consulta pública de dados da advocacia.",
    href: "https://confirmaadv.oab.org.br/",
  },
  {
    title: "Receita Federal",
    description: "Portal oficial da Receita Federal do Brasil.",
    href: "https://www.gov.br/receitafederal/pt-br",
  },
  {
    title: "e-CAC",
    description: "Centro Virtual de Atendimento ao Contribuinte.",
    href: "https://cav.receita.fazenda.gov.br/",
  },
  {
    title: "CNJ",
    description: "Serviços e informações do Conselho Nacional de Justiça.",
    href: "https://www.cnj.jus.br/",
  },
  {
    title: "TST",
    description: "Portal do Tribunal Superior do Trabalho.",
    href: "https://www.tst.jus.br/",
  },
  {
    title: "Central Registradores",
    description: "Serviços digitais e certidões dos registradores.",
    href: "https://www.registradores.org.br/",
  },
  {
    title: "Consulta Geral de Processos",
    description: "Busca pública ampla para acompanhamento processual.",
    href: "https://www.jusbrasil.com.br/consulta-processual/",
  },
];

export default function ClienteDashboard() {
  const [userName, setUserName] = useState("Cliente");
  const [activeTab, setActiveTab] = useState("painel");
  const [advogados, setAdvogados] = useState([]);
  const [onlineLawyerIds, setOnlineLawyerIds] = useState([]);
  const [loadingAdvogados, setLoadingAdvogados] = useState(true);
  const [casos, setCasos] = useState([]);
  const [loadingCasos, setLoadingCasos] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [lawyerSearch, setLawyerSearch] = useState("");
  const [shareCaseOnFacebook, setShareCaseOnFacebook] = useState(false);
  const [caseActionLoadingId, setCaseActionLoadingId] = useState(null);
  const [expandedSpecialties, setExpandedSpecialties] = useState({});

  // States para Interesses de Advogados
  const [interesses, setInteresses] = useState([]);
  const [loadingInteresses, setLoadingInteresses] = useState(false);
  const [processandoInteresse, setProcessandoInteresse] = useState(null);

  // States para Edição de Caso
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCaso, setSelectedCaso] = useState(null);
  const [editFormData, setEditFormData] = useState({
    titulo: "",
    area: "",
    descricao: "",
  });

  // States para Notificações
  const [notificacoes, setNotificacoes] = useState([]);
  const [loadingNotificacoes, setLoadingNotificacoes] = useState(false);
  const notifIdsRef = useRef(new Set());
  const notifBootstrappedRef = useRef(false);

  // States para Novo Caso
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    titulo: "",
    area: "",
    descricao: "",
  });

  // States para Perfil
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    password: "",
  });

  // States para Modal de Perfil do Advogado e Chat
  const [isLawyerModalOpen, setIsLawyerModalOpen] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState(null);
  const [isCaseSelectOpen, setIsCaseSelectOpen] = useState(false);
  const [isProcessingChat, setIsProcessingChat] = useState(false);

  // Filtra advogados com especialidade preenchida
  const advogadosComEspecialidade = useMemo(() => {
    return advogados.filter((adv) => {
      const specs = String(adv.specialties || "").trim();
      return specs && specs !== "Clínico Geral" && specs.length > 0;
    });
  }, [advogados]);

  // Agrupa advogados por especialidade
  const groupedAdvogadosBySpecialty = useMemo(() => {
    const searchTerm = lawyerSearch.trim().toLowerCase();
    const grupos = {};

    advogadosComEspecialidade.forEach((adv) => {
      // Filtro de busca
      const normalizedName = String(adv.name || "").toLowerCase();
      const normalizedOab = String(adv.oab || "").toLowerCase();

      if (
        searchTerm &&
        !normalizedName.includes(searchTerm) &&
        !normalizedOab.includes(searchTerm)
      ) {
        return; // Pula este advogado se não corresponder à busca
      }

      // Processa especialidades (pode ter múltiplas separadas por vírgula)
      const specs = String(adv.specialties || "")
        .split(",")
        .map((s) => s.trim());
      specs.forEach((spec) => {
        if (spec && spec !== "Clínico Geral") {
          if (!grupos[spec]) {
            grupos[spec] = [];
          }
          grupos[spec].push(adv);
        }
      });
    });

    return grupos;
  }, [advogadosComEspecialidade, lawyerSearch]);

  const showNotificationToast = useCallback(
    (notif) => {
      toast.custom(
        (toastItem) => {
          const handleToastClick = () => {
            setActiveTab("notificacoes");
            window.scrollTo({ top: 0, behavior: "smooth" });
            toast.dismiss(toastItem.id);
          };

          return (
            <button
              type="button"
              className={`${styles.toastNotification} ${toastItem.visible ? styles.toastIn : styles.toastOut}`}
              onClick={handleToastClick}
              aria-label="Abrir notificações"
            >
              <div className={styles.toastIcon}>
                <Bell size={20} color="var(--color-gold)" />
              </div>
              <div className={styles.toastContent}>
                <p className={styles.toastTitle}>{notif.titulo}</p>
                <p className={styles.toastDesc}>{notif.mensagem}</p>
              </div>
            </button>
          );
        },
        { duration: 5000 },
      );
    },
    [setActiveTab],
  );

  const syncNotificacoes = useCallback(async (showToastsForNew = false) => {
    if (!profileData?.id) return;
    try {
      const res = await fetch("/api/notificacoes", { cache: "no-store" });
      const response = await res.json();
      if (!response.success) return;

      const data = response.data || [];
      const incomingIds = new Set(data.map((n) => n.id).filter(Boolean));

      if (!notifBootstrappedRef.current) {
        notifIdsRef.current = incomingIds;
        notifBootstrappedRef.current = true;
        setNotificacoes(data);
        return;
      }

      if (showToastsForNew) {
        const newNotifs = data.filter(
          (n) => n.id && !notifIdsRef.current.has(n.id),
        );
        newNotifs.reverse().forEach((n) => showNotificationToast(n));
      }

      notifIdsRef.current = incomingIds;
      setNotificacoes(data);
    } catch (err) {
      console.error("Erro ao sincronizar notificações:", err);
    }
  }, [showNotificationToast, profileData?.id]);

  const loadNotificacoes = useCallback(async () => {
    setLoadingNotificacoes(true);
    await syncNotificacoes(false);
    setLoadingNotificacoes(false);
  }, [syncNotificacoes]);

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const response = await fetch("/api/perfil");
      const data = await response.json();

      if (data.success) {
        setProfileData(data.data);
        setUserName(data.data.name);
        setProfileForm({
          name: data.data.name,
          phone: data.data.phone || "",
          password: "",
        });
      } else {
        toast.error(data.message || "Erro ao carregar perfil.");
      }
    } catch (err) {
      console.error("Erro carregar perfil:", err);
      toast.error("Erro de conexão ao carregar perfil.");
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const loadCasos = useCallback(async () => {
    console.log("Chamando loadCasos...");
    setLoadingCasos(true);
    try {
      const response = await fetch("/api/casos");
      console.log("Resposta loadCasos:", response.status);
      const data = await response.json();
      if (data.success) {
        console.log("Casos carregados:", data.data.length);
        setCasos(data.data);
      } else {
        console.warn("Falha ao carregar casos:", data.message);
      }
    } catch (err) {
      console.error("Erro ao carregar casos:", err);
    } finally {
      setLoadingCasos(false);
    }
  }, []);

  const loadInteresses = useCallback(async () => {
    setLoadingInteresses(true);
    try {
      const res = await fetch("/api/casos/interesse");
      const data = await res.json();
      if (data.success) setInteresses(data.data);
    } catch (err) {
      console.error("Erro ao carregar interesses:", err);
    } finally {
      setLoadingInteresses(false);
    }
  }, []);

  const openNotificationsTab = async () => {
    setActiveTab("notificacoes");
    window.scrollTo({ top: 0, behavior: "smooth" });
    await loadNotificacoes();
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) setIsSidebarCollapsed(true);
      else setIsSidebarCollapsed(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    async function loadInitialData() {
      // 1. Carregar Advogados
      fetch("/api/advogados")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setAdvogados(data.data);
        })
        .finally(() => setLoadingAdvogados(false));

      // 1.1 Carregar Casos
      loadCasos();
      // 1.2 Carregar Interesses
      loadInteresses();
      // 2. Carregar Perfil
      loadProfile();
    }
    loadInitialData();

    // Inscrição em tempo real para notificações
    let channel;
    let retryTimer;
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        retryTimer = setTimeout(setupRealtime, 1200);
        return;
      }

      channel = supabase
        .channel(`cliente-notificacoes-${user.id}`)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "notificacoes",
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          const notif = payload.new;
          if (!notif?.id || notifIdsRef.current.has(notif.id)) return;
          notifIdsRef.current.add(notif.id);
          setNotificacoes((prev) => [notif, ...prev]);
          showNotificationToast(notif);
        })
        .subscribe();
    };

    setupRealtime();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (retryTimer) clearTimeout(retryTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadCasos, loadInteresses, loadProfile, showNotificationToast]);

  useEffect(() => {
    let presenceChannel;

    const syncPresence = () => {
      if (!presenceChannel) return;
      const state = presenceChannel.presenceState();
      const ids = Object.values(state)
        .flat()
        .map((entry) => entry.user_id)
        .filter(Boolean);
      setOnlineLawyerIds(Array.from(new Set(ids)));
    };

    const setupPresence = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }

      presenceChannel = supabase
        .channel("lawyer-presence-room")
        .on("presence", { event: "sync" }, syncPresence)
        .on("presence", { event: "join" }, syncPresence)
        .on("presence", { event: "leave" }, syncPresence)
        .subscribe();
    };

    setupPresence();
    return () => {
      if (presenceChannel) supabase.removeChannel(presenceChannel);
    };
  }, []);

  // Monitorar mudança de Tab
  useEffect(() => {
    if (activeTab === "painel") loadCasos();
    if (activeTab === "notificacoes") loadNotificacoes();
    if (activeTab === "perfil") loadProfile();
  }, [activeTab, loadCasos, loadNotificacoes, loadProfile]);

  useEffect(() => {
    if (!profileData?.id) return;
    let intervalId;
    const start = async () => {
      await syncNotificacoes(true);
      intervalId = setInterval(() => syncNotificacoes(true), 15000);
    };
    start();
    return () => clearInterval(intervalId);
  }, [syncNotificacoes, profileData?.id]);




  const handleResponderInteresse = async (interestId, action) => {
    setProcessandoInteresse(interestId);
    try {
      const res = await fetch("/api/casos/interesse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interestId, action }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          action === "ACCEPT"
            ? "Advogado aceito! O chat está disponível."
            : "Interesse recusado.",
        );
        // Remover o interesse da lista
        setInteresses((prev) => prev.filter((i) => i.id !== interestId));
        // Recarregar casos para refletir advogado vinculado
        if (action === "ACCEPT") loadCasos();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error("Erro ao processar resposta.");
    } finally {
      setProcessandoInteresse(null);
    }
  };

  const handleOpenEditModal = (caso) => {
    setSelectedCaso(caso);
    setEditFormData({
      titulo: caso.titulo || "",
      area: caso.area_atuacao || "",
      descricao: caso.descricao || "",
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateCaso = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const res = await fetch("/api/casos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedCaso.id,
          titulo: editFormData.titulo,
          area_atuacao: editFormData.area,
          descricao: editFormData.descricao,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Caso atualizado com sucesso!");
        setIsEditModalOpen(false);
        loadCasos();
      } else {
        toast.error(data.message || "Erro ao atualizar caso.");
      }
    } catch (err) {
      console.error("Erro ao atualizar caso:", err);
      toast.error("Erro de conexão ao atualizar caso.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleFinalizeCaso = async () => {
    if (!selectedCaso || caseActionLoadingId) return;

    setCaseActionLoadingId(selectedCaso.id);
    try {
      const res = await fetch("/api/casos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedCaso.id, status: "FECHADO" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Falha ao finalizar caso.");
        return;
      }

      toast.success("Caso finalizado com sucesso.");
      setIsEditModalOpen(false);
      await loadCasos();
    } catch (error) {
      console.error("Erro ao finalizar caso:", error);
      toast.error("Erro ao finalizar caso.");
    } finally {
      setCaseActionLoadingId(null);
    }
  };

  const handleDeleteCaso = async () => {
    if (!selectedCaso || caseActionLoadingId) return;

    setCaseActionLoadingId(selectedCaso.id);
    try {
      const res = await fetch(`/api/casos?id=${selectedCaso.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Falha ao excluir caso.");
        return;
      }

      toast.success("Caso excluído com sucesso.");
      setIsEditModalOpen(false);
      setSelectedCaso(null);
      await loadCasos();
    } catch (error) {
      console.error("Erro ao excluir caso:", error);
      toast.error("Erro ao excluir caso.");
    } finally {
      setCaseActionLoadingId(null);
    }
  };

  const shareCaseToFacebookGroup = async (casePayload) => {
    const siteUrl = "https://socialjuridico.com.br";
    
    // 1. Texto RICO formatado para o Post (O Título e a Descrição vão aqui!)
    const shareText = `⚖️ NOVO CASO JURÍDICO PUBLICADO NO SOCIALJURÍDICO\n\n📌 TÍTULO: ${casePayload.titulo}\n📝 DESCRIÇÃO: ${casePayload.descricao}\n\n🌐 Veja mais em: ${siteUrl}`;

    // 2. Colocar no clipboard imediatamente (Ação mais importante)
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        toast.success("Título e descrição copiados com sucesso!");
      }
    } catch (e) {
      console.error("Erro ao copiar:", e);
    }

    // 3. Link Dinâmico para as Meta Tags (Card Visual)
    // O Facebook lerá o título/descrição deste link e montará o card abaixo do seu texto.
    const dynamicShareUrl = `${siteUrl}/compartilhar?t=${encodeURIComponent(casePayload.titulo)}&d=${encodeURIComponent(casePayload.descricao.substring(0, 150))}`;
    
    // 4. Abrir Janela do Facebook
    const facebookSharerUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(dynamicShareUrl)}`;
    
    window.open(facebookSharerUrl, "_blank", "noopener,noreferrer,width=600,height=600");
    
    // 5. Explicar o motivo do card talvez vir genérico no localhost
    toast("O card visual aparecerá completo assim que o site estiver online. Por enquanto, use o Colar (Ctrl+V) no post!", {
      icon: '💡',
      duration: 8000
    });
  };

  const handleOpenLawyerProfile = (lawyer) => {
    setSelectedLawyer(lawyer);
    setIsLawyerModalOpen(true);
  };

  const handleStartChatRequest = (e, lawyer) => {
    e.stopPropagation(); // Evitar abrir o modal de perfil se clicar no botão
    if (!lawyer.is_premium) {
      toast.error("Apenas advogados PRO aceitam mensagens diretas.");
      return;
    }
    setSelectedLawyer(lawyer);
    setIsCaseSelectOpen(true);
  };

  const handleConfirmStartChat = async (casoId) => {
    setIsProcessingChat(true);
    try {
      const res = await fetch("/api/casos/cliente-iniciar-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: casoId,
          lawyerId: selectedLawyer.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Iniciando chat...");
        window.location.href = `/chat/${casoId}`;
      } else {
        toast.error(data.message || "Erro ao iniciar chat.");
      }
    } catch (err) {
      console.error("Erro iniciar chat:", err);
      toast.error("Falha na conexão.");
    } finally {
      setIsProcessingChat(false);
      setIsCaseSelectOpen(false);
    }
  };


  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter((file) => {
      const isLt5MB = file.size / 1024 / 1024 < 5;
      const isAllowed = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type);
      return isLt5MB && isAllowed;
    });

    if (selectedFiles.length + validFiles.length > 5) {
      toast.error("Limite máximo de 5 arquivos atingido.");
      return;
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitCaso = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const uploadedUrls = [];
      // Em alguns cenários no client o getUser pode retornar null mesmo com sessão válida no backend.
      // Preferimos usar profileData já carregado pela API /api/perfil.
      let userId = profileData?.id || null;

      if (!userId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        userId = user?.id || null;
      }

      if (!userId) {
        const perfilRes = await fetch("/api/perfil");
        const perfilData = await perfilRes.json();
        if (perfilData?.success && perfilData?.data?.id) {
          userId = perfilData.data.id;
          setProfileData(perfilData.data);
        }
      }

      if (!userId) {
        toast.error("Sua sessão expirou. Faça login novamente.");
        window.location.href = "/login";
        return;
      }

      for (const file of selectedFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
          .from("CASES")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("CASES").getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      const createRes = await fetch("/api/casos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: formData.titulo,
          descricao: formData.descricao,
          area_atuacao: formData.area,
          anexos: uploadedUrls,
        }),
      });

      const result = await createRes.json();

      if (!createRes.ok || !result.success) {
        throw new Error(result.message || "Falha ao criar caso.");
      }

      if (result.success) {
        if (shareCaseOnFacebook) {
          await shareCaseToFacebookGroup({
            titulo: formData.titulo,
            descricao: formData.descricao,
          });
        }

        setFormSuccess(true);
        setFormData({ titulo: "", area: "", descricao: "" });
        setSelectedFiles([]);
        setShareCaseOnFacebook(false);
        setTimeout(() => {
          setFormSuccess(false);
          setActiveTab("painel");
        }, 3000);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Erro ao enviar caso:", error);
      toast.error("Erro ao enviar caso.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      // 1. Atualizar Nome e Telefone via API real
      const resProfile = await fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileForm.name,
          phone: profileForm.phone,
        }),
      });
      const dataProfile = await resProfile.json();

      if (!dataProfile.success) throw new Error(dataProfile.message);

      // 2. Atualizar Senha se preenchida
      if (profileForm.password) {
        const resPass = await updatePasswordAction(profileForm.password);
        if (!resPass.success) throw new Error(resPass.message);
      }

      toast.success("Perfil atualizado com sucesso!");
      setUserName(profileForm.name);
      loadProfile();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        "TEM CERTEZA? Esta ação é irreversível e excluirá todos os seus dados.",
      )
    )
      return;

    setFormLoading(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const response = await deleteAccountAction(user.id);
    if (response.success) {
      toast.success("Conta excluída. Sentiremos sua falta.");
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } else {
      toast.error(response.message);
      setFormLoading(false);
    }
  };

  const renderLawyerCard = (adv) => (
    <div
      key={adv.id}
      className={`${styles.lawyerCard} ${adv.is_premium ? styles.lawyerCardPro : ""}`}
      onClick={() => handleOpenLawyerProfile(adv)}
      style={{ cursor: "pointer" }}
    >
      {adv.is_premium && (
        <div className={styles.proLawyerBadge}>
          <Sparkles size={11} /> PRO
        </div>
      )}
      <div className={styles.statusBadge}>
        <div
          className={
            onlineLawyerIds.includes(adv.id)
              ? styles.onlineDot
              : styles.offlineDot
          }
        ></div>
        {onlineLawyerIds.includes(adv.id) ? "Online" : "Offline"}
      </div>

      {adv.avatar ? (
        <div className={styles.lawyerAvatarWrapper}>
          <Image
            src={adv.avatar}
            alt={adv.name}
            width={80}
            height={80}
            className={styles.lawyerAvatar}
            unoptimized
          />
        </div>
      ) : (
        <div className={styles.lawyerAvatar}>
          {adv.name.substring(0, 2).toUpperCase()}
        </div>
      )}

      <div className={styles.lawyerInfo}>
        <h3 className={styles.lawyerName}>{adv.name}</h3>
        {/* OAB - Comentado pois ainda não há verificação oficial no site */}
        {/* <div
          className={`${styles.oabStatusBadge} ${adv.verified ? styles.oabStatusVerified : styles.oabStatusPending}`}
        >
          {adv.verified ? (
            <ShieldCheck
              size={14}
              className={styles.verifiedIcon}
            />
          ) : null}
          {adv.verified
            ? "OAB verificada"
            : "OAB não verificada"}
        </div> */}
        <p className={styles.lawyerOab}>
          {adv.oab ? `OAB ${adv.oab}` : "OAB não informada"}
        </p>
        <p className={styles.lawyerSpecs}>
          {adv.specialties || "Clínico Geral"}
        </p>
        <div className={styles.consultaInfo}>
          {adv.consulta === "Paga" ? (
            <>
              <strong>Consulta paga</strong>
              <span>
                {adv.tempo ? adv.tempo : "Duração não informada"}
                {adv.valor
                  ? ` • R$ ${Number(adv.valor).toFixed(2)}`
                  : " • Valor sob consulta"}
              </span>
            </>
          ) : (
            <>
              <strong>Consulta gratuita</strong>
              <span>Primeiro contato sem custo informado.</span>
            </>
          )}
        </div>

        {adv.avg_rating > 0 && (
          <div className={styles.ratingRow}>
            <Star size={14} fill="var(--color-gold)" color="var(--color-gold)" />
            <span className={styles.ratingValue}>
              {(adv.avg_rating || 0).toFixed(1)}
            </span>
          </div>
        )}
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{adv.total_ratings || 0}</span>
          <span className={styles.statLabel}>Avaliações</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>100%</span>
          <span className={styles.statLabel}>Sucesso</span>
        </div>
      </div>

      {adv.is_premium ? (
        <button
          className={styles.contactBtn}
          onClick={(e) => handleStartChatRequest(e, adv)}
        >
          Falar com Advogado
        </button>
      ) : (
        <button
          className={`${styles.contactBtn} ${styles.contactBtnDisabled}`}
          disabled
          title="Apenas advogados PRO aceitam mensagens"
        >
          <Lock size={12} /> PRO necessário
        </button>
      )}
    </div>
  );

  return (
    <div
      className={`${styles.dashboardContainer} ${isSidebarCollapsed ? styles.sidebarCollapsed : ""}`}
    >
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <button
            className={styles.menuToggle}
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            {isSidebarCollapsed ? <Menu size={24} /> : <X size={24} />}
          </button>

          {!isSidebarCollapsed && (
            <Link href="/" className={styles.logoWrapper}>
              <div className={styles.logoIcon}>
                <Scale size={20} color="#1A1A1A" />
              </div>
              <span className={styles.logoText}>SocialJurídico</span>
            </Link>
          )}

          {isSidebarCollapsed && (
            <div className={styles.collapsedLogo}>
              <div className={styles.logoIconCompact}>
                <Scale size={20} color="#fff" />
              </div>
            </div>
          )}
        </div>

        <nav className={styles.nav}>
          <Link
            href="#"
            className={`${styles.navItem} ${activeTab === "painel" ? styles.activeNavItem : ""}`}
            onClick={() => setActiveTab("painel")}
            title="Painel"
          >
            <LayoutDashboard size={22} />
            {!isSidebarCollapsed && <span>Painel</span>}
          </Link>
          <Link
            href="#"
            className={`${styles.navItem} ${activeTab === "novo" ? styles.activeNavItem : ""}`}
            onClick={() => setActiveTab("novo")}
            title="Novo Caso"
          >
            <PlusCircle size={22} />
            {!isSidebarCollapsed && <span>Novo Caso</span>}
          </Link>
          <Link
            href="#"
            className={`${styles.navItem} ${activeTab === "notificacoes" ? styles.activeNavItem : ""}`}
            onClick={openNotificationsTab}
            title="Notificações"
          >
            <Bell size={22} />
            {!isSidebarCollapsed && <span>Notificações</span>}
          </Link>
          <Link
            href="#"
            className={`${styles.navItem} ${activeTab === "perfil" ? styles.activeNavItem : ""}`}
            onClick={() => setActiveTab("perfil")}
            title="Meu Perfil"
          >
            <User size={22} />
            {!isSidebarCollapsed && <span>Meu Perfil</span>}
          </Link>
          <Link
            href="#"
            className={`${styles.navItem} ${activeTab === "meus-casos" ? styles.activeNavItem : ""}`}
            onClick={() => setActiveTab("meus-casos")}
            title="Meus Casos"
          >
            <FileText size={22} />
            {!isSidebarCollapsed && <span>Meus Casos</span>}
          </Link>
          <Link
            href="#"
            className={`${styles.navItem} ${activeTab === "conversas" ? styles.activeNavItem : ""}`}
            onClick={() => setActiveTab("conversas")}
            title="Minhas Conversas"
          >
            <MessageSquare size={22} />
            {!isSidebarCollapsed && <span>Minhas Conversas</span>}
          </Link>
          <Link
            href="#"
            className={`${styles.navItem} ${activeTab === "links-uteis" ? styles.activeNavItem : ""}`}
            onClick={() => setActiveTab("links-uteis")}
            title="Links Úteis"
          >
            <Globe size={22} />
            {!isSidebarCollapsed && <span>Links Úteis</span>}
          </Link>
          <button
            className={`${styles.navItem} ${styles.logoutBtn}`}
            title="Sair"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
          >
            <LogOut size={22} />
            {!isSidebarCollapsed && <span>Sair</span>}
          </button>
        </nav>
      </aside>

      {/* MAIN */}
      <main className={styles.mainContent}>
        <header className={styles.topHeader}>
          <div className={styles.headerInfo}>
            <h1>
              {activeTab === "painel"
                ? "Painel"
                : activeTab === "novo"
                  ? "Novo Caso"
                  : activeTab === "notificacoes"
                    ? "Notificações"
                    : activeTab === "meus-casos"
                      ? "Meus Casos"
                      : activeTab === "links-uteis"
                        ? "Links Úteis"
                        : activeTab === "conversas"
                          ? "Minhas Conversas"
                          : "Meu Perfil"}
            </h1>
            <p>Bem-vindo, {userName}</p>
            {profileData && (
              <span
                style={{ fontSize: "10px", opacity: 0.5, display: "block" }}
              >
                ID: {profileData.id} | {profileData.email}
              </span>
            )}
          </div>
          <div className={styles.userProfile}>
            <div className={styles.avatarCircle}>
              {userName.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        <section className={styles.pageBody}>
          {activeTab === "painel" && (
            <div className={styles.contentGrid}>
              <div className={styles.listSection}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Meus Casos</h2>
                  <button
                    onClick={() => setActiveTab("novo")}
                    className={styles.addNewBtn}
                  >
                    + Novo
                  </button>
                </div>

                {loadingCasos ? (
                  <p style={{ padding: "20px" }}>Carregando seus casos...</p>
                ) : casos.length > 0 ? (
                  casos.map((caso) => (
                    <div
                      key={caso.id}
                      className={styles.caseCard}
                      onClick={() => handleOpenEditModal(caso)}
                    >
                      <div className={styles.cardTop}>
                        <span className={styles.badge}>{caso.status}</span>
                        <span className={styles.date}>
                          {new Date(caso.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3
                        className={styles.caseTitleCard}
                        style={{
                          color: "var(--color-gold)",
                          margin: "8px 0",
                          fontSize: "1rem",
                        }}
                      >
                        {caso.titulo}
                      </h3>
                      <p className={styles.caseDesc}>
                        {caso.descricao.substring(0, 100)}...
                      </p>
                      <button
                        className={styles.caseShareCardBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          shareCaseToFacebookGroup(caso);
                        }}
                        title="Compartilhar no Facebook"
                      >
                        <Globe size={14} /> Compartilhar no Facebook
                      </button>
                    </div>
                  ))
                ) : (
                  <div
                    className={styles.emptyStateMinimal}
                    style={{
                      padding: "40px 20px",
                      textAlign: "center",
                      opacity: 0.7,
                    }}
                  >
                    <FileText
                      size={48}
                      style={{
                        marginBottom: "12px",
                        color: "var(--color-gold)",
                      }}
                    />
                    <p>Você ainda não tem casos registrados.</p>
                  </div>
                )}
              </div>

              <div className={styles.lawyersSection}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Advogados Disponíveis</h2>
                </div>

                <div className={styles.lawyerSearchWrap}>
                  <Search size={16} className={styles.lawyerSearchIcon} />
                  <input
                    type="text"
                    className={styles.lawyerSearchInput}
                    placeholder="Buscar advogado por nome ou OAB..."
                    value={lawyerSearch}
                    onChange={(e) => setLawyerSearch(e.target.value)}
                  />
                </div>

                {/* INTERESSES PENDENTES */}
                {interesses.length > 0 && (
                  <div className={styles.interessesSection}>
                    <div className={styles.interessesHeader}>
                      <Bell size={18} color="var(--color-gold)" />
                      <h3 className={styles.interessesTitle}>
                        Advogados interessados nos seus casos (
                        {interesses.length})
                      </h3>
                    </div>
                    {interesses.map((interesse) => (
                      <div key={interesse.id} className={styles.interesseCard}>
                        <div className={styles.interesseInfo}>
                          <div className={styles.interesseAvatar}>
                            {(interesse.lawyer_name || "A")
                              .substring(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className={styles.interesseAdvName}>
                              <Sparkles
                                size={12}
                                className={styles.proIconSmall}
                              />
                              {interesse.lawyer_name || "Advogado"}
                            </p>
                            <p className={styles.interesseCasoName}>
                              Caso: {interesse.caso_titulo}
                            </p>
                            <p className={styles.interesseCasoArea}>
                              {interesse.caso_area}
                            </p>
                          </div>
                        </div>
                        <div className={styles.interesseActions}>
                          <button
                            className={styles.acceptBtn}
                            onClick={() =>
                              handleResponderInteresse(interesse.id, "ACCEPT")
                            }
                            disabled={processandoInteresse === interesse.id}
                          >
                            <Check size={14} />
                            {processandoInteresse === interesse.id
                              ? "Processando..."
                              : "Aceitar"}
                          </button>
                          <button
                            className={styles.declineBtn}
                            onClick={() =>
                              handleResponderInteresse(interesse.id, "DECLINE")
                            }
                            disabled={processandoInteresse === interesse.id}
                          >
                            <UserX size={14} /> Recusar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Seções de Especialidades */}
                {loadingAdvogados ? (
                  <p>Carregando advogados...</p>
                ) : Object.keys(groupedAdvogadosBySpecialty).length > 0 ? (
                  Object.keys(groupedAdvogadosBySpecialty).map((specialty) => {
                    const advsInSpecialty =
                      groupedAdvogadosBySpecialty[specialty];
                    const isExpanded = expandedSpecialties[specialty] || false;
                    const displayedAdvs = isExpanded
                      ? advsInSpecialty
                      : advsInSpecialty.slice(0, 5);
                    const hasMoreAdvs = advsInSpecialty.length > 5;

                    return (
                      <div key={specialty} className={styles.specialtySection}>
                        <div className={styles.specialtyHeader}>
                          <h3 className={styles.specialtyTitle}>
                            {specialty}
                            <span className={styles.specialtyCount}>
                              ({advsInSpecialty.length})
                            </span>
                          </h3>
                        </div>

                        <div className={styles.lawyersGrid}>
                          {displayedAdvs.map((adv) => renderLawyerCard(adv))}
                        </div>

                        {hasMoreAdvs && (
                          <div className={styles.viewMoreContainer}>
                            <button
                              className={styles.viewMoreBtn}
                              onClick={() =>
                                setExpandedSpecialties((prev) => ({
                                  ...prev,
                                  [specialty]: !isExpanded,
                                }))
                              }
                            >
                              {isExpanded
                                ? "Ver menos"
                                : `Ver mais (${advsInSpecialty.length - 5})`}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p>
                    Nenhum advogado com especialidade preenchida encontrado.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === "novo" && (
            <div className={styles.formContainer}>
              {formSuccess ? (
                <div className={styles.emptyState}>
                  <CheckCircle2
                    size={64}
                    color="var(--color-gold)"
                    className={styles.emptyIcon}
                  />
                  <h3 className={styles.sectionTitle}>
                    Caso Criado com Sucesso!
                  </h3>
                  <p className={styles.emptyText}>
                    Os advogados serão notificados imediatamente.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitCaso}>
                  <div className={styles.formGroup}>
                    <label>Título do Caso</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="Ex: Problema com contrato de aluguel"
                      required
                      value={formData.titulo}
                      onChange={(e) =>
                        setFormData({ ...formData, titulo: e.target.value })
                      }
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Área de Atuação</label>
                    <select
                      className={styles.formSelect}
                      required
                      value={formData.area}
                      onChange={(e) =>
                        setFormData({ ...formData, area: e.target.value })
                      }
                    >
                      <option value="">Selecione uma área</option>
                      <option value="Civil">Direito Civil</option>
                      <option value="Trabalhista">Direito Trabalhista</option>
                      <option value="Penal">Direito Penal</option>
                      <option value="Familia">Direito de Família</option>
                      <option value="Consumidor">Direito do Consumidor</option>
                      <option value="Nao sei">Não sei a área</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Descrição Detalhada</label>
                    <textarea
                      className={styles.formTextarea}
                      placeholder="Explique o que aconteceu da forma mais detalhada possível..."
                      required
                      value={formData.descricao}
                      onChange={(e) =>
                        setFormData({ ...formData, descricao: e.target.value })
                      }
                    ></textarea>
                  </div>


                  <div className={styles.formGroup}>
                    <label>Anexos (Opcional - Máx 5)</label>
                    <div
                      className={styles.uploadArea}
                      onClick={() => fileInputRef.current.click()}
                    >
                      <PlusCircle size={32} className={styles.uploadIcon} />
                      <p className={styles.uploadText}>
                        Clique para selecionar Imagens ou PDFs
                      </p>
                    </div>
                    <input
                      type="file"
                      multiple
                      hidden
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*,application/pdf"
                    />

                    {selectedFiles.length > 0 && (
                      <div className={styles.fileList}>
                        {selectedFiles.map((file, index) => (
                          <div key={index} className={styles.fileItem}>
                            <button
                              type="button"
                              className={styles.removeFile}
                              onClick={() => removeFile(index)}
                            >
                              <X size={12} />
                            </button>
                            {file.type.includes("image") ? (
                              <ImageIcon size={24} color="var(--color-gold)" />
                            ) : (
                              <FileText size={24} color="#ef4444" />
                            )}
                            <span className={styles.fileName}>{file.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={formLoading}
                  >
                    {formLoading ? "Enviando..." : "Publicar Solicitação"}
                  </button>
                </form>
              )}
            </div>
          )}

          {activeTab === "notificacoes" && (
            <div className={styles.notificationsContainer}>
              <div className={styles.notificationsHeader}>
                <h2 className={styles.sectionTitle}>Suas Notificações</h2>
                <span className={styles.unreadCount}>
                  {notificacoes.filter((n) => !n.lida).length} não lidas
                </span>
              </div>

              {loadingNotificacoes ? (
                <p style={{ padding: "24px", textAlign: "center" }}>
                  Carregando notificações...
                </p>
              ) : notificacoes.length > 0 ? (
                notificacoes.map((notif) => (
                  <div key={notif.id} className={styles.notificationItem}>
                    <div className={styles.notificationIcon}>
                      <Bell size={20} />
                    </div>
                    <div className={styles.notificationInfo}>
                      <div className={styles.notificationTop}>
                        <span className={styles.notifTitle}>
                          {notif.titulo}
                        </span>
                        <span className={styles.notifDate}>
                          {new Date(notif.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className={styles.notifDesc}>{notif.mensagem}</p>
                    </div>
                    {!notif.lida && <div className={styles.unreadDot}></div>}
                  </div>
                ))
              ) : (
                <div className={styles.emptyState} style={{ border: "none" }}>
                  <Bell size={48} className={styles.emptyIcon} />
                  <p className={styles.emptyText}>
                    Você não tem notificações no momento.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "perfil" && (
            <div className={styles.profileContainer}>
              {loadingProfile ? (
                <p style={{ textAlign: "center" }}>Carregando seu perfil...</p>
              ) : profileData ? (
                <>
                  <div className={styles.profileHeader}>
                    <div className={styles.profileAvatarLarge}>
                      {profileData.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className={styles.profileHeaderText}>
                      <h2>{profileData.name}</h2>
                      <p>
                        {profileData.role === "ADMIN"
                          ? "Administrador"
                          : profileData.role === "LAWYER"
                            ? "Advogado"
                            : "Cliente"}{" "}
                        SocialJurídico
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateProfile}>
                    <div className={styles.profileGrid}>
                      <div
                        className={`${styles.profileField} ${styles.editable}`}
                      >
                        <label>
                          <User size={14} style={{ marginRight: 6 }} /> Nome
                          Completo
                        </label>
                        <input
                          type="text"
                          className={styles.profileInput}
                          value={profileForm.name}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              name: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div
                        className={`${styles.profileField} ${styles.editable}`}
                      >
                        <label>
                          <Phone size={14} style={{ marginRight: 6 }} />{" "}
                          Telefone/WhatsApp
                        </label>
                        <input
                          type="text"
                          className={styles.profileInput}
                          value={profileForm.phone}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              phone: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className={styles.profileField}>
                        <label>
                          <Mail size={14} style={{ marginRight: 6 }} /> E-mail
                          (Inalterável)
                        </label>
                        <div className={styles.value}>{profileData.email}</div>
                      </div>

                      <div
                        className={`${styles.profileField} ${styles.editable}`}
                      >
                        <label>
                          <Lock size={14} style={{ marginRight: 6 }} /> Alterar
                          Senha
                        </label>
                        <input
                          type="password"
                          className={styles.profileInput}
                          placeholder="Deixe em branco para manter"
                          value={profileForm.password}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              password: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className={styles.profileField}>
                        <label>
                          <Calendar size={14} style={{ marginRight: 6 }} />{" "}
                          Membro desde
                        </label>
                        <div className={styles.value}>
                          {new Date(
                            profileData.created_at || Date.now(),
                          ).toLocaleDateString("pt-BR", {
                            month: "long",
                            year: "numeric",
                          })}
                        </div>
                      </div>

                      <div className={styles.profileField}>
                        <label>
                          <Scale size={14} style={{ marginRight: 6 }} /> Tipo de
                          Conta
                        </label>
                        <div className={styles.value}>{profileData.role}</div>
                      </div>
                    </div>

                    <div className={styles.profileActions}>
                      <button
                        type="submit"
                        className={styles.saveProfileBtn}
                        disabled={formLoading}
                      >
                        {formLoading ? "Salvando..." : "Salvar Alterações"}
                      </button>
                      <button
                        type="button"
                        className={styles.deleteAccountBtn}
                        onClick={handleDeleteAccount}
                        disabled={formLoading}
                      >
                        <Trash2 size={18} style={{ marginRight: 8 }} /> Excluir
                        Minha Conta
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className={styles.emptyState}>
                  <User size={48} className={styles.emptyIcon} />
                  <h3 className={styles.sectionTitle}>Perfil não encontrado</h3>
                  <p className={styles.emptyText}>
                    Não foi possível carregar os dados. Verifique sua conexão.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "meus-casos" && (
            <div className={styles.meusCasosPage}>
              <div
                className={styles.sectionHeader}
                style={{ marginBottom: "24px" }}
              >
                <h2 className={styles.sectionTitle}>Todos os Meus Casos</h2>
                <button
                  onClick={() => setActiveTab("novo")}
                  className={styles.addNewBtn}
                >
                  + Novo Caso
                </button>
              </div>
              {loadingCasos ? (
                <p style={{ padding: "20px", opacity: 0.6 }}>
                  Carregando seus casos...
                </p>
              ) : casos.length > 0 ? (
                <div className={styles.casosFullGrid}>
                  {casos.map((caso) => (
                    <div
                      key={caso.id}
                      className={styles.caseCardFull}
                      onClick={() => handleOpenEditModal(caso)}
                    >
                      <div className={styles.caseCardHeader}>
                        <span className={styles.badge}>{caso.status}</span>
                        <span className={styles.date}>
                          {new Date(caso.created_at).toLocaleDateString(
                            "pt-BR",
                          )}
                        </span>
                      </div>
                      <h3 className={styles.caseTitleCard}>{caso.titulo}</h3>
                      <p className={styles.caseAreaTag}>
                        {caso.area_atuacao || "Área não definida"}
                      </p>
                      <p className={styles.caseDesc}>
                        {caso.descricao?.substring(0, 150)}...
                      </p>
                      <div className={styles.caseCardFooter}>
                        <div className={styles.caseFooterLeft}>
                          {caso.advogado_id ? (
                            <span className={styles.advTag}>
                              ✔ Advogado vinculado
                            </span>
                          ) : (
                            <span className={styles.noAdvTag}>
                              ⏳ Aguardando advogado
                            </span>
                          )}
                          <button
                            className={styles.caseShareCardBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              shareCaseToFacebookGroup(caso);
                            }}
                            title="Compartilhar no Facebook"
                          >
                            <Globe size={14} /> Compartilhar
                          </button>
                        </div>
                        <span className={styles.editHint}>
                          Clique para editar →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className={styles.emptyStateMinimal}
                  style={{
                    padding: "60px 20px",
                    textAlign: "center",
                    opacity: 0.7,
                  }}
                >
                  <FileText
                    size={56}
                    style={{ marginBottom: "16px", color: "var(--color-gold)" }}
                  />
                  <p style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                    Nenhum caso registrado
                  </p>
                  <p style={{ marginTop: "8px", opacity: 0.6 }}>
                    Clique em &quot;Novo Caso&quot; para criar o seu primeiro
                    caso.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "conversas" && (
            <div className={styles.conversasPage}>
              <div
                className={styles.sectionHeader}
                style={{ marginBottom: "24px" }}
              >
                <h2 className={styles.sectionTitle}>Minhas Conversas</h2>
              </div>
              {loadingCasos ? (
                <p style={{ padding: "20px", opacity: 0.6 }}>Carregando...</p>
              ) : casos.filter((c) => c.advogado_id).length > 0 ? (
                <div className={styles.conversasList}>
                  {casos
                    .filter((caso) => caso.advogado_id)
                    .map((caso) => (
                      <div
                        key={caso.id}
                        className={styles.conversaItem}
                        onClick={() =>
                          (window.location.href = `/chat/${caso.id}`)
                        }
                      >
                        <div className={styles.conversaAvatar}>
                          <Scale size={20} />
                        </div>
                        <div className={styles.conversaInfo}>
                          <h3 className={styles.conversaTitulo}>
                            {caso.titulo}
                          </h3>
                          <p className={styles.conversaArea}>
                            {caso.area_atuacao || "Área não definida"}
                          </p>
                        </div>
                        <div className={styles.conversaStatus}>
                          <span className={styles.badge}>{caso.status}</span>
                          <span className={styles.conversaArrow}>→</span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div
                  className={styles.emptyStateMinimal}
                  style={{
                    padding: "60px 20px",
                    textAlign: "center",
                    opacity: 0.7,
                  }}
                >
                  <MessageSquare
                    size={56}
                    style={{ marginBottom: "16px", color: "var(--color-gold)" }}
                  />
                  <p style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                    Nenhuma conversa iniciada
                  </p>
                  <p style={{ marginTop: "8px", opacity: 0.6 }}>
                    Conversas aparecem quando um advogado é vinculado ao seu
                    caso.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "links-uteis" && (
            <div className={styles.linksPage}>
              <div
                className={styles.sectionHeader}
                style={{ marginBottom: "24px" }}
              >
                <h2 className={styles.sectionTitle}>Links Úteis</h2>
              </div>

              <div className={styles.usefulLinksGrid}>
                {USEFUL_LINKS.map((item) => (
                  <a
                    key={item.title}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.usefulLinkCard}
                  >
                    <div className={styles.usefulLinkHeader}>
                      <Globe size={18} />
                      <strong>{item.title}</strong>
                    </div>
                    <p>{item.description}</p>
                    <span>Abrir link</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* MODAL DE EDIÇÃO DE CASO */}
      {isEditModalOpen && selectedCaso && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className={styles.editModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>Editar Caso</h2>
              <button
                className={styles.closeBtn}
                onClick={() => setIsEditModalOpen(false)}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateCaso} className={styles.editForm}>
              <div className={styles.formGroup}>
                <label>Título do Caso</label>
                <input
                  type="text"
                  value={editFormData.titulo}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, titulo: e.target.value })
                  }
                  className={styles.modalInput}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Área de Atuação</label>
                <select
                  value={editFormData.area}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, area: e.target.value })
                  }
                  className={styles.modalSelect}
                  required
                >
                  <option value="">Selecione a área</option>
                  <option value="CIVIL">Direito Civil</option>
                  <option value="TRABALHISTA">Direito Trabalhista</option>
                  <option value="PENAL">Direito Penal</option>
                  <option value="FAMILIA">Direito de Família</option>
                  <option value="CONSUMIDOR">Direito do Consumidor</option>
                  <option value="NAO_SEI">Não sei a área</option>
                  <option value="OUTROS">Outros</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Descrição Detalhada</label>
                <textarea
                  value={editFormData.descricao}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      descricao: e.target.value,
                    })
                  }
                  className={styles.modalTextarea}
                  required
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="submit"
                  className={styles.saveChangesBtn}
                  disabled={formLoading}
                >
                  {formLoading ? "Salvando..." : "Salvar Alterações"}
                </button>
                {selectedCaso.advogado_id ? (
                  <Link
                    href={`/chat/${selectedCaso.id}`}
                    className={styles.chatBtn}
                    style={{
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MessageSquare size={18} style={{ marginRight: 8 }} />
                    Iniciar Chat com Advogado
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={styles.chatBtn}
                    disabled
                    title="Aguardando um advogado ser vinculado ao caso"
                  >
                    <MessageSquare size={18} style={{ marginRight: 8 }} />
                    Aguardando advogado...
                  </button>
                )}
              </div>

              <div className={styles.modalSecondaryActions}>
                {selectedCaso.status !== "FECHADO" && (
                  <button
                    type="button"
                    className={styles.finalizeBtn}
                    onClick={handleFinalizeCaso}
                    disabled={caseActionLoadingId === selectedCaso.id}
                  >
                    <CheckCircle2 size={18} style={{ marginRight: 8 }} />
                    {caseActionLoadingId === selectedCaso.id
                      ? "Processando..."
                      : "Finalizar caso"}
                  </button>
                )}
                <button
                  type="button"
                  className={styles.deleteCaseBtn}
                  onClick={handleDeleteCaso}
                  disabled={caseActionLoadingId === selectedCaso.id}
                >
                  <Trash2 size={18} style={{ marginRight: 8 }} />
                  {caseActionLoadingId === selectedCaso.id
                    ? "Processando..."
                    : "Apagar caso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL PERFIL DO ADVOGADO */}
      {isLawyerModalOpen && selectedLawyer && (
        <div className={styles.modalOverlay} onClick={() => setIsLawyerModalOpen(false)}>
          <div className={styles.lawyerProfileModal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeModalBtn} onClick={() => setIsLawyerModalOpen(false)}>
              <X size={24} />
            </button>
            <div className={styles.lpModalHeader}>
              {selectedLawyer.avatar ? (
                <div className={styles.lpModalAvatarWrapper}>
                  <Image src={selectedLawyer.avatar} alt={selectedLawyer.name} width={100} height={100} className={styles.lpModalAvatar} unoptimized />
                </div>
              ) : (
                <div className={styles.lpModalAvatarPlaceholder}>{selectedLawyer.name.substring(0, 2).toUpperCase()}</div>
              )}
              <div className={styles.lpModalMainInfo}>
                <h2>{selectedLawyer.name}</h2>
                <p className={styles.lpModalOab}>OAB: {selectedLawyer.oab || "Não informada"}</p>
                {selectedLawyer.is_premium && (
                  <span className={styles.proTagModal}><Sparkles size={12} /> Advogado PRO</span>
                )}
              </div>
            </div>

            <div className={styles.lpModalBody}>
              <div className={styles.lpModalSection}>
                <h3><User size={18} /> Apresentação</h3>
                <p className={styles.lpBioText}>{selectedLawyer.bio || "Este advogado ainda não preencheu sua apresentação pessoal."}</p>
              </div>

              {selectedLawyer.specialties && (
                <div className={styles.lpModalSection}>
                  <h3><Scale size={18} /> Especialidades</h3>
                  <div className={styles.lpModalSpecs}>
                    {selectedLawyer.specialties.split(',').map((spec, i) => (
                      <span key={i} className={styles.lpSpecTag}>{spec.trim()}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.lpModalStatsGrid}>
                <div className={styles.lpStatItem}>
                   <Star size={20} fill="var(--color-gold)" color="var(--color-gold)" />
                   <strong>{(selectedLawyer.avg_rating || 0).toFixed(1)}</strong>
                   <span>({selectedLawyer.total_ratings || 0} avaliações)</span>
                </div>
                <div className={styles.lpStatItem}>
                   <CheckCircle2 size={20} color="#10b981" />
                   <strong>100%</strong>
                   <span>Taxa de Sucesso</span>
                </div>
                {selectedLawyer.valor > 0 && (
                   <div className={styles.lpStatItem}>
                      <strong>R$ {selectedLawyer.valor}</strong>
                      <span>Valor da Consulta</span>
                   </div>
                )}
              </div>
            </div>

            <div className={styles.lpModalFooter}>
                {selectedLawyer.is_premium ? (
                  <button className={styles.lpContactBtn} onClick={(e) => { setIsLawyerModalOpen(false); handleStartChatRequest(e, selectedLawyer); }}>
                    Falar com Advogado
                  </button>
                ) : (
                  <p className={styles.lpNote}>Este advogado não aceita contatos diretos no momento.</p>
                )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL SELEÇÃO DE CASO PARA CHAT */}
      {isCaseSelectOpen && selectedLawyer && (
        <div className={styles.modalOverlay} onClick={() => setIsCaseSelectOpen(false)}>
          <div className={styles.caseSelectModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.caseSelectHeader}>
               <h3>Sobre qual caso deseja falar?</h3>
               <p>Selecione um dos seus casos abaixo para iniciar o atendimento com <strong>{selectedLawyer.name}</strong>.</p>
            </div>
            <div className={styles.caseSelectList}>
              {casos.filter(c => c.status === 'ABERTO' && !c.advogado_id).map(caso => (
                <div key={caso.id} className={styles.caseSelectItem} onClick={() => handleConfirmStartChat(caso.id)}>
                   <div className={styles.csItemInfo}>
                      <strong>{caso.titulo}</strong>
                      <span>{caso.area_atuacao}</span>
                   </div>
                   <MessageSquare size={18} color="var(--color-gold)" />
                </div>
              ))}
            </div>
            <button className={styles.cancelCaseSelectBtn} onClick={() => setIsCaseSelectOpen(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
