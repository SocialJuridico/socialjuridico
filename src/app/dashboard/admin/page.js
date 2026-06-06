"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  Users,
  Scale,
  FileText,
  Bell,
  MessageSquare,
  LogOut,
  Image as ImageIcon,
  UserCog,
  Trash2,
  Ticket,
  Star,
  DollarSign,
  Megaphone,
  Building,
  Mail,
} from "lucide-react";
import toast from "react-hot-toast";
import styles from "./AdminDashboard.module.css";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState({
    totalClientes: 0,
    totalAdvogados: 0,
    totalCasos: 0,
    totalNotificacoes: 0,
    totalRadarPendente: 0,
  });
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [reportPeriod, setReportPeriod] = useState(7);
  const [includeLawyers, setIncludeLawyers] = useState(true);
  const [includeClients, setIncludeClients] = useState(true);
  const [includeDbTotals, setIncludeDbTotals] = useState(true);
  const [includeSatisfaction, setIncludeSatisfaction] = useState(true);

  const mergeData = (accessesList = [], lawyersList = [], clientsList = [], limit = 7) => {
    const map = {};
    
    accessesList.forEach(item => {
      map[item.date] = { date: item.date, accesses: item.count, lawyers: 0, clients: 0 };
    });

    lawyersList.forEach(item => {
      if (!map[item.date]) {
        map[item.date] = { date: item.date, accesses: 0, lawyers: item.count, clients: 0 };
      } else {
        map[item.date].lawyers = item.count;
      }
    });

    clientsList.forEach(item => {
      if (!map[item.date]) {
        map[item.date] = { date: item.date, accesses: 0, lawyers: 0, clients: item.count };
      } else {
        map[item.date].clients = item.count;
      }
    });

    return Object.values(map)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-limit);
  };

  const translateMonth = (monthStr) => {
    if (!monthStr) return "";
    const [year, month] = monthStr.split('-');
    const months = {
      '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
      '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
      '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
    };
    return `${months[month] || month} de ${year}`;
  };

  const translateWeek = (weekStr) => {
    if (!weekStr) return "";
    const [year, week] = weekStr.split('-W');
    return `Semana ${week} (${year})`;
  };

  const translateDay = (dayStr) => {
    if (!dayStr) return "";
    const [year, month, day] = dayStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const generatePDFReport = async () => {
    if (generatingPDF) return;
    if (!includeLawyers && !includeClients) {
      toast.error("Selecione pelo menos um público-alvo (Advogados ou Clientes).");
      return;
    }
    setGeneratingPDF(true);
    const toastId = toast.loading("Buscando dados de acesso...");

    try {
      const res = await fetch("/api/admin/reports/usage", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Erro ao buscar dados do relatório");
      }

      toast.loading("Renderizando documento PDF...", { id: toastId });

      // Importar jspdf dinamicamente para evitar problemas de build com window/document
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();
      const reportData = json.data;

      // ── CONSOLIDAR DADOS ──
      const dailyMerged = mergeData(reportData.accesses.daily, reportData.lawyers.daily, reportData.clients.daily, reportPeriod);
      const weeklyMerged = mergeData(reportData.accesses.weekly, reportData.lawyers.weekly, reportData.clients.weekly, 4);
      const monthlyMerged = mergeData(reportData.accesses.monthly, reportData.lawyers.monthly, reportData.clients.monthly, 6);

      // Calcular resumos com base no período selecionado
      const totalAccessesPeriod = (reportData.accesses.daily || [])
        .slice(-reportPeriod)
        .reduce((sum, item) => sum + item.count, 0);
      
      const totalLawyerLoginsPeriod = (reportData.lawyers.daily || [])
        .slice(-reportPeriod)
        .reduce((sum, item) => sum + item.count, 0);
      
      const totalClientLoginsPeriod = (reportData.clients.daily || [])
        .slice(-reportPeriod)
        .reduce((sum, item) => sum + item.count, 0);

      // ── PÁGINA 1: CABEÇALHO E HISTÓRICO DIÁRIO ──
      // Banner
      doc.setFillColor(15, 19, 24); // #0F1318
      doc.rect(0, 0, 210, 40, 'F');

      // Título
      doc.setTextColor(212, 175, 55); // Ouro
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("SOCIALJURÍDICO", 14, 20);

      // Subtítulo
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("RELATÓRIO CONSOLIDADO DE TELEMETRIA E USO", 14, 28);
      doc.text("AUDITORIA ADMINISTRATIVA E ACESSOS DE USUÁRIOS", 14, 33);

      // Metadados
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(9);
      doc.text(`Gerado por: ${admin?.name || 'Administrador'}`, 14, 50);
      doc.text(`E-mail: ${admin?.email || ''}`, 14, 55);
      doc.text(`Data de Emissão: ${new Date().toLocaleString('pt-BR')}`, 14, 60);

      let classification = "Classificação: CONFIDENCIAL / USO ADMINISTRATIVO RESTRITO";
      if (!includeLawyers || !includeClients) {
        const activeRoles = [];
        if (includeLawyers) activeRoles.push("ADVOGADOS");
        if (includeClients) activeRoles.push("CLIENTES");
        classification += ` (Filtro: Apenas ${activeRoles.join(", ")})`;
      }
      doc.text(classification, 14, 65);

      // Linha Gold
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.75);
      doc.line(14, 70, 196, 70);

      // Resumo Executivo
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 19, 24);
      doc.text(`Resumo de Atividade (Últimos ${reportPeriod} dias)`, 14, 78);

      // Cards dinâmicos
      const cards = [];
      cards.push({ title: "ACESSOS TOTAIS", value: totalAccessesPeriod.toLocaleString('pt-BR') });
      if (includeLawyers) {
        cards.push({ title: "LOGINS DE ADVOGADOS", value: totalLawyerLoginsPeriod.toLocaleString('pt-BR') });
      }
      if (includeClients) {
        cards.push({ title: "LOGINS DE CLIENTES", value: totalClientLoginsPeriod.toLocaleString('pt-BR') });
      }

      const cardWidth = cards.length === 3 ? 56 : (cards.length === 2 ? 85 : 182);
      const cardGap = cards.length === 3 ? 7 : (cards.length === 2 ? 12 : 0);

      cards.forEach((card, idx) => {
        const cardX = 14 + idx * (cardWidth + cardGap);
        doc.setFillColor(245, 247, 250);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(cardX, 83, cardWidth, 22, 2, 2, 'FD');

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(card.title, cardX + 4, 90);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(15, 19, 24);
        doc.text(card.value, cardX + 4, 99);
      });

      // Segunda fileira de cards (opcional: Totais e Satisfação)
      const secondRowCards = [];
      if (includeDbTotals) {
        secondRowCards.push({ title: "TOTAL DE ADVOGADOS", value: (reportData.totals?.lawyers || 0).toLocaleString('pt-BR') });
        secondRowCards.push({ title: "TOTAL DE CLIENTES", value: (reportData.totals?.clients || 0).toLocaleString('pt-BR') });
      }
      if (includeSatisfaction) {
        secondRowCards.push({ title: "SATISFAÇÃO GERAL", value: `${(reportData.satisfaction?.overallAvg || 0).toFixed(1)} / 5.0` });
        secondRowCards.push({ title: "TOTAL DE AVALIAÇÕES", value: (reportData.satisfaction?.totalSurveys || 0).toLocaleString('pt-BR') });
      }

      let nextY = 116;
      let tableStartY = 120;

      if (secondRowCards.length > 0) {
        const row2CardWidth = secondRowCards.length === 4 ? 41 : (secondRowCards.length === 3 ? 56 : (secondRowCards.length === 2 ? 85 : 182));
        const row2CardGap = secondRowCards.length === 4 ? 6 : (secondRowCards.length === 3 ? 7 : (secondRowCards.length === 2 ? 12 : 0));

        secondRowCards.forEach((card, idx) => {
          const cardX = 14 + idx * (row2CardWidth + row2CardGap);
          doc.setFillColor(245, 247, 250);
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(cardX, 112, row2CardWidth, 22, 2, 2, 'FD');

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(card.title, cardX + 4, 119);

          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.setTextColor(15, 19, 24);
          doc.text(card.value, cardX + 4, 128);
        });

        nextY = 142;
        tableStartY = 146;
      }

      // Tabela Diária
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 19, 24);
      doc.text(`1. Métricas Diárias (Últimos ${reportPeriod} dias)`, 14, nextY);

      const dailyHeaders = ['Data', 'Acessos Totais (Hits)'];
      if (includeLawyers) dailyHeaders.push('Advogados Ativos');
      if (includeClients) dailyHeaders.push('Clientes Ativos');

      const dailyBody = dailyMerged.map(item => {
        const row = [translateDay(item.date), item.accesses.toLocaleString('pt-BR')];
        if (includeLawyers) row.push(item.lawyers.toLocaleString('pt-BR'));
        if (includeClients) row.push(item.clients.toLocaleString('pt-BR'));
        return row;
      });

      autoTable(doc, {
        startY: tableStartY,
        head: [dailyHeaders],
        body: dailyBody,
        theme: 'striped',
        headStyles: { fillColor: [15, 19, 24], textColor: [212, 175, 55], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8.5 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 }
      });

      const hasSecondPage = reportPeriod === 30;
      const pageCount = hasSecondPage ? 2 : 1;

      if (!hasSecondPage) {
        // Rodapé da página 1
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text("Plataforma SocialJurídico - Telemetria de Uso", 14, 287);
        doc.text(`Página 1 de 1`, 196, 287, { align: "right" });

        // Considerações e Segurança
        let nextY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 12 : 120;
        
        // Evita que a assinatura quebre ou saia da folha
        if (nextY > 230) {
          doc.addPage();
          doc.setFillColor(15, 19, 24);
          doc.rect(0, 0, 210, 12, 'F');
          doc.setTextColor(212, 175, 55);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text("SOCIALJURÍDICO - RELATÓRIO DE TELEMETRIA E USO DA PLATAFORMA", 14, 8);
          nextY = 24;
        }

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, nextY, 182, 22, 1, 1, 'FD');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text("DECLARAÇÃO DE AUDITORIA E PRIVACIDADE", 18, nextY + 5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.2);
        doc.setTextColor(100, 116, 139);
        const decText = "Este documento de telemetria foi gerado de forma automatizada com base nos logs de auditoria e segurança armazenados de forma criptografada nos servidores da plataforma SocialJurídico. A coleta de dados obedece estritamente aos preceitos da Lei Geral de Proteção de Dados (LGPD) e às políticas de confidencialidade da plataforma. O compartilhamento deste relatório sem autorização expressa é estritamente proibido.";
        const splitText = doc.splitTextToSize(decText, 174);
        doc.text(splitText, 18, nextY + 10);

        // Assinatura
        nextY = nextY + 38;
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.5);
        doc.line(65, nextY, 145, nextY);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text("Assinatura do Administrador Responsável", 105, nextY + 4, { align: "center" });
        doc.setFont("helvetica", "bold");
        doc.text(admin?.name || "Administrador", 105, nextY + 8, { align: "center" });
      } else {
        // Rodapé da página 1 (se tiver página 2)
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text("Plataforma SocialJurídico - Telemetria de Uso", 14, 287);
        doc.text(`Página 1 de ${pageCount}`, 196, 287, { align: "right" });

        // ── PÁGINA 2: HISTÓRICO SEMANAL, MENSAL E ASSINATURA ──
        doc.addPage();

        // Top mini header
        doc.setFillColor(15, 19, 24);
        doc.rect(0, 0, 210, 12, 'F');
        doc.setTextColor(212, 175, 55);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("SOCIALJURÍDICO - RELATÓRIO DE TELEMETRIA E USO DA PLATAFORMA", 14, 8);

        // Tabela Semanal
        doc.setFontSize(11);
        doc.setTextColor(15, 19, 24);
        doc.text("2. Métricas Semanais (Últimas 4 semanas)", 14, 24);

        const weeklyHeaders = ['Semana', 'Acessos Totais (Hits)'];
        if (includeLawyers) weeklyHeaders.push('Advogados Ativos');
        if (includeClients) weeklyHeaders.push('Clientes Ativos');

        const weeklyBody = weeklyMerged.map(item => {
          const row = [translateWeek(item.date), item.accesses.toLocaleString('pt-BR')];
          if (includeLawyers) row.push(item.lawyers.toLocaleString('pt-BR'));
          if (includeClients) row.push(item.clients.toLocaleString('pt-BR'));
          return row;
        });

        autoTable(doc, {
          startY: 28,
          head: [weeklyHeaders],
          body: weeklyBody,
          theme: 'striped',
          headStyles: { fillColor: [15, 19, 24], textColor: [212, 175, 55], fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 8.5 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 14, right: 14 }
        });

        // Tabela Mensal
        let nextY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 12 : 80;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 19, 24);
        doc.text("3. Métricas Mensais (Últimos 6 meses)", 14, nextY);

        const monthlyHeaders = ['Mês', 'Acessos Totais (Hits)'];
        if (includeLawyers) monthlyHeaders.push('Advogados Ativos');
        if (includeClients) monthlyHeaders.push('Clientes Ativos');

        const monthlyBody = monthlyMerged.map(item => {
          const row = [translateMonth(item.date), item.accesses.toLocaleString('pt-BR')];
          if (includeLawyers) row.push(item.lawyers.toLocaleString('pt-BR'));
          if (includeClients) row.push(item.clients.toLocaleString('pt-BR'));
          return row;
        });

        autoTable(doc, {
          startY: nextY + 4,
          head: [monthlyHeaders],
          body: monthlyBody,
          theme: 'striped',
          headStyles: { fillColor: [15, 19, 24], textColor: [212, 175, 55], fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 8.5 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 14, right: 14 }
        });

        // Considerações e Segurança
        nextY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 14 : 150;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, nextY, 182, 22, 1, 1, 'FD');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text("DECLARAÇÃO DE AUDITORIA E PRIVACIDADE", 18, nextY + 5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.2);
        doc.setTextColor(100, 116, 139);
        const decText = "Este documento de telemetria foi gerado de forma automatizada com base nos logs de auditoria e segurança armazenados de forma criptografada nos servidores da plataforma SocialJurídico. A coleta de dados obedece estritamente aos preceitos da Lei Geral de Proteção de Dados (LGPD) e às políticas de confidencialidade da plataforma. O compartilhamento deste relatório sem autorização expressa é estritamente proibido.";
        const splitText = doc.splitTextToSize(decText, 174);
        doc.text(splitText, 18, nextY + 10);

        // Assinatura
        nextY = nextY + 40;
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.5);
        doc.line(65, nextY, 145, nextY);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text("Assinatura do Administrador Responsável", 105, nextY + 4, { align: "center" });
        doc.setFont("helvetica", "bold");
        doc.text(admin?.name || "Administrador", 105, nextY + 8, { align: "center" });

        // Rodapé da página 2
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text("Plataforma SocialJurídico - Telemetria de Uso", 14, 287);
        doc.text(`Página 2 de 2`, 196, 287, { align: "right" });
      }

      // Salvar
      doc.save(`relatorio_uso_socialjuridico_${new Date().toISOString().slice(0,10)}.pdf`);
      toast.success("Relatório gerado com sucesso!", { id: toastId });
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast.error(error.message || "Erro ao gerar PDF do relatório.", { id: toastId });
    } finally {
      setGeneratingPDF(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const meRes = await fetch("/api/admin/me", { cache: "no-store" });
        const meData = await meRes.json();

        if (!meRes.ok || !meData.success) {
          toast.error("Acesso restrito: área administrativa.");
          router.replace("/dashboard/cliente");
          return;
        }

        setAdmin(meData.data);

        const statsRes = await fetch("/api/admin/stats", { cache: "no-store" });
        const statsData = await statsRes.json();
        if (statsRes.ok && statsData.success) {
          setStats(statsData.data);
        }
      } catch (error) {
        console.error("Erro ao carregar dashboard admin:", error);
        toast.error("Erro ao carregar dashboard administrativo.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <p>Carregando painel administrativo...</p>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}>
          <Shield size={18} />
          SocialJuridico Admin
        </Link>
        <div className={styles.adminCard}>
          <p className={styles.adminName}>{admin.name || "Administrador"}</p>
          <p className={styles.adminEmail}>{admin.email}</p>
        </div>
        <button
          type="button"
          className={styles.logoutBtn}
          onClick={handleLogout}
        >
          <LogOut size={15} /> Sair
        </button>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <h1>Dashboard Administrativo</h1>
          <p>Visão geral da plataforma para usuários com perfil ADMIN.</p>
        </header>

        <div className={styles.sectionsWrapper}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}><Users size={20} /> Usuários & Perfis</h2>
            <div className={styles.grid}>
              <Link href="/dashboard/admin/clientes" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`}>
                  <div className={styles.cardTop}><Users size={16} /> Clientes</div>
                  <strong>{stats.totalClientes}</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/advogados" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`}>
                  <div className={styles.cardTop}><Scale size={16} /> Advogados</div>
                  <strong>{stats.totalAdvogados}</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/escritorios" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`} style={{ borderLeft: "4px solid #00b4d8", background: "rgba(0, 180, 216, 0.03)" }}>
                  <div className={styles.cardTop}><Building size={16} color="#00b4d8" /> Escritórios (Enterprise)</div>
                  <strong>Gerenciar</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/admins" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`}>
                  <div className={styles.cardTop}><UserCog size={16} /> Admins</div>
                  <strong>Gerenciar</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/avaliacoes" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`} style={{ borderLeft: `4px solid #d4af37` }}>
                  <div className={styles.cardTop}><Star size={16} fill="#d4af37" color="#d4af37" /> Avaliações (Casos)</div>
                  <strong>Ver Notas</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/pesquisas" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`} style={{ borderLeft: `4px solid #d4af37` }}>
                  <div className={styles.cardTop}><Star size={16} fill="transparent" color="#d4af37" /> Pesquisas (Plataforma)</div>
                  <strong>Gerenciar</strong>
                </article>
              </Link>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}><Megaphone size={20} /> Comunicação & Marketing</h2>
            <div className={styles.grid}>
              <Link href="/dashboard/admin/push" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`} style={{ borderLeft: "4px solid #3b82f6", background: 'rgba(59, 130, 246, 0.03)' }}>
                  <div className={styles.cardTop}><Megaphone size={16} color="#3b82f6" /> Push Notifications</div>
                  <strong>Disparar Alerta</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/notificacoes" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`}>
                  <div className={styles.cardTop}><Bell size={16} /> Minhas Mensagens</div>
                  <strong>Recebidas</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/comunicados" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`}>
                  <div className={styles.cardTop}><Bell size={16} /> Comunicados Gerais</div>
                  <strong>{stats.totalNotificacoes}</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/mensagens" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`}>
                  <div className={styles.cardTop}><MessageSquare size={16} /> Mensagens de Casos</div>
                  <strong>Conversas</strong>
                </article>
              </Link>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}><FileText size={20} /> Operacional & Financeiro</h2>
            <div className={styles.grid}>
              <Link href="/dashboard/admin/casos" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`}>
                  <div className={styles.cardTop}><FileText size={16} /> Gestão de Casos</div>
                  <strong>{stats.totalCasos}</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/transacoes" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`} style={{ borderLeft: "4px solid #10b981", background: 'rgba(16, 185, 129, 0.03)' }}>
                  <div className={styles.cardTop}><DollarSign size={16} color="#10b981" /> Gestão Financeira</div>
                  <strong>Ver Vendas</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/anunciantes" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`} style={{ borderLeft: "4px solid #8b5cf6", background: 'rgba(139, 92, 246, 0.03)' }}>
                  <div className={styles.cardTop}><Megaphone size={16} color="#8b5cf6" /> Anunciantes de Serviços</div>
                  <strong>Gerenciar</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/afiliados" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`} style={{ borderLeft: "4px solid var(--color-gold)" }}>
                  <div className={styles.cardTop}><Scale size={16} color="var(--color-gold)" /> Gestão de Afiliados</div>
                  <strong>Ver Indicações</strong>
                </article>
              </Link>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}><FileText size={20} /> Relatórios & Auditoria</h2>
            <div className={styles.grid}>
              <div 
                className={`${styles.card} ${styles.cardClickable}`} 
                style={{ borderLeft: "4px solid var(--color-gold)", background: "rgba(212, 175, 55, 0.03)" }}
                onClick={() => setShowConfigModal(true)}
              >
                <div className={styles.cardTop}>
                  <FileText size={16} color="var(--color-gold)" /> Relatório PDF de Uso
                </div>
                {generatingPDF ? (
                  <strong style={{ fontSize: "1.2rem", color: "#9ca3af" }}>Gerando...</strong>
                ) : (
                  <strong>Gerar PDF</strong>
                )}
              </div>

              <Link href="/dashboard/admin/casos?tab=FUNNEL" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`} style={{ borderLeft: "4px solid var(--color-gold)", background: "rgba(212, 175, 55, 0.03)" }}>
                  <div className={styles.cardTop}>
                    <Mail size={16} color="var(--color-gold)" /> Funil de Reengajamento (E-mails)
                  </div>
                  <strong>Ver Métricas e Conversões</strong>
                </article>
              </Link>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}><Shield size={20} /> Sistema & Configurações</h2>
            <div className={styles.grid}>
              <Link href="/dashboard/admin/banners" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`}>
                  <div className={styles.cardTop}><ImageIcon size={16} /> Banners do App</div>
                  <strong>Gerenciar</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/advogado-mes" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`} style={{ borderLeft: "4px solid var(--color-gold)" }}>
                  <div className={styles.cardTop}><Star size={16} color="var(--color-gold)" /> Advogado do Mês</div>
                  <strong>Gerenciar Popup</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/cupons" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`} style={{ borderLeft: "4px solid #10b981" }}>
                  <div className={styles.cardTop}><Ticket size={16} color="#10b981" /> Gestão de Cupons</div>
                  <strong>Gerenciar</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/avisos" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`} style={{ borderLeft: "4px solid #f59e0b" }}>
                  <div className={styles.cardTop}><Bell size={16} color="#f59e0b" /> Configurar Avisos </div>
                  <strong>Gerenciar</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/solicitacoes-exclusao" className={styles.cardLink}>
                <article className={`${styles.card} ${styles.cardClickable}`} style={{ borderLeft: "4px solid #ef4444" }}>
                  <div className={styles.cardTop}><Trash2 size={16} color="#ef4444" /> LGPD: Exclusões</div>
                  <strong>Ver Pedidos</strong>
                </article>
              </Link>
              <Link href="/dashboard/admin/radar" className={styles.cardLink}>
                <article 
                  className={`${styles.card} ${styles.cardClickable} ${stats.totalRadarPendente > 0 ? styles.radarCardHighlight : ""}`} 
                  style={{ borderLeft: "4px solid #00b4d8", background: "rgba(0, 180, 216, 0.03)" }}
                >
                  <div className={styles.cardTop}><Shield size={16} color="#00b4d8" /> Radar Jurídico</div>
                  <strong>
                    {stats.totalRadarPendente > 0 
                      ? `${stats.totalRadarPendente} Pendente${stats.totalRadarPendente !== 1 ? "s" : ""}`
                      : "Sem Pendências"}
                  </strong>
                </article>
              </Link>
            </div>
          </section>
        </div>
      </main>

      {showConfigModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <FileText size={20} color="var(--color-gold)" />
              <span>Configuração do Relatório PDF</span>
            </div>

            <div className={styles.modalGroup}>
              <label className={styles.modalLabel}>Período do Relatório</label>
              <select 
                className={styles.modalSelect} 
                value={reportPeriod} 
                onChange={(e) => setReportPeriod(Number(e.target.value))}
              >
                <option value={7}>Últimos 7 dias</option>
                <option value={15}>Últimos 15 dias</option>
                <option value={30}>Últimos 30 dias (Completo)</option>
              </select>
            </div>

            <div className={styles.modalGroup}>
              <label className={styles.modalLabel}>Público-Alvo (Incluir no Relatório)</label>
              <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    className={styles.checkboxInput} 
                    checked={includeLawyers} 
                    onChange={(e) => setIncludeLawyers(e.target.checked)} 
                  />
                  <span>Logins de Advogados</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    className={styles.checkboxInput} 
                    checked={includeClients} 
                    onChange={(e) => setIncludeClients(e.target.checked)} 
                  />
                  <span>Logins de Clientes</span>
                </label>
              </div>
            </div>

            <div className={styles.modalGroup}>
              <label className={styles.modalLabel}>Métricas Gerais (Opcionais)</label>
              <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    className={styles.checkboxInput} 
                    checked={includeDbTotals} 
                    onChange={(e) => setIncludeDbTotals(e.target.checked)} 
                  />
                  <span>Totais de Cadastros (Banco de Dados)</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    className={styles.checkboxInput} 
                    checked={includeSatisfaction} 
                    onChange={(e) => setIncludeSatisfaction(e.target.checked)} 
                  />
                  <span>Nota de Satisfação Geral da Plataforma</span>
                </label>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button 
                className={styles.btnCancel} 
                onClick={() => setShowConfigModal(false)}
                disabled={generatingPDF}
              >
                Cancelar
              </button>
              <button 
                className={styles.btnConfirm} 
                onClick={async () => {
                  setShowConfigModal(false);
                  await generatePDFReport();
                }}
                disabled={generatingPDF || (!includeLawyers && !includeClients)}
              >
                {generatingPDF ? "Gerando..." : "Gerar PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
