"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, Scale, Mail } from "lucide-react";
import styles from "./ConfirmarEmail.module.css";
import { confirmEmailAction } from "@/app/actions/authActions";

function ConfirmarEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") || "signup";

  const [status, setStatus] = useState("idle"); // "idle" | "loading" | "success" | "error"
  const [message, setMessage] = useState("");

  const handleConfirm = async () => {
    if (!token_hash) {
      setStatus("error");
      setMessage("Link de confirmação inválido ou incompleto.");
      return;
    }

    setStatus("loading");
    try {
      const result = await confirmEmailAction({ token_hash, type });
      if (result.success) {
        setStatus("success");
        setMessage(result.message || "Sua conta foi ativada com sucesso!");
        // Redireciona para o login após 3 segundos
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setStatus("error");
        setMessage(result.message || "Erro ao confirmar e-mail. O link pode ter expirado.");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Erro de conexão ao tentar confirmar o e-mail.");
    }
  };

  // Se o token estiver presente, podemos iniciar a confirmação automaticamente ou esperar clique.
  // Para evitar robôs de antivírus de consumirem o token em requests GET automáticas de e-mail,
  // nós NÃO confirmamos automaticamente no mount, mas sim exigimos que o usuário CLIQUE no botão.
  // Isso garante 100% de taxa de sucesso e evita a expiração silenciosa.
  
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logoRow}>
          <Scale size={32} color="var(--color-gold)" />
          <span className={styles.logoText}>SocialJurídico</span>
        </div>

        {status === "idle" && (
          <div className={styles.stateContent}>
            <div className={styles.iconWrapper}>
              <Mail size={48} className={styles.pulseIcon} />
            </div>
            <h2 className={styles.title}>Ative sua conta</h2>
            <p className={styles.description}>
              Clique no botão abaixo para confirmar seu endereço de e-mail e desbloquear seu acesso à plataforma.
            </p>
            <button className={styles.actionBtn} onClick={handleConfirm}>
              Confirmar minha conta
            </button>
          </div>
        )}

        {status === "loading" && (
          <div className={styles.stateContent}>
            <div className={styles.iconWrapperLoading}>
              <Loader2 size={48} className={styles.spinIcon} />
            </div>
            <h2 className={styles.title}>Confirmando...</h2>
            <p className={styles.description}>
              Estamos validando sua credencial de segurança junto ao servidor. Por favor, aguarde.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className={styles.stateContent}>
            <div className={styles.iconWrapperSuccess}>
              <CheckCircle2 size={48} color="#10b981" />
            </div>
            <h2 className={styles.title} style={{ color: "#10b981" }}>Conta Ativada!</h2>
            <p className={styles.description}>
              {message}
            </p>
            <p className={styles.subtext}>
              Redirecionando você para a página de login...
            </p>
            <button className={styles.actionBtn} onClick={() => router.push("/login")}>
              Ir para o Login agora
            </button>
          </div>
        )}

        {status === "error" && (
          <div className={styles.stateContent}>
            <div className={styles.iconWrapperError}>
              <AlertCircle size={48} color="#ef4444" />
            </div>
            <h2 className={styles.title} style={{ color: "#ef4444" }}>Ops! Algo deu errado</h2>
            <p className={styles.description}>
              {message}
            </p>
            <p className={styles.subtext}>
              Isso geralmente ocorre se o link já foi utilizado ou se expirou (validade de 24 horas).
            </p>
            <div className={styles.buttonGroup}>
              <button className={styles.actionBtn} onClick={() => router.push("/login")}>
                Voltar ao Login
              </button>
              <a 
                href="https://wa.me/5515992653066?text=Olá, tive um problema ao confirmar meu e-mail de cadastro no SocialJurídico e gostaria de ajuda."
                target="_blank"
                rel="noopener noreferrer"
                className={styles.supportBtn}
              >
                Falar com Suporte
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConfirmarEmail() {
  return (
    <Suspense
      fallback={
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.logoRow}>
              <Scale size={32} color="var(--color-gold)" />
              <span className={styles.logoText}>SocialJurídico</span>
            </div>
            <div className={styles.stateContent}>
              <Loader2 size={48} className={styles.spinIcon} />
              <p className={styles.description}>Carregando componentes de segurança...</p>
            </div>
          </div>
        </div>
      }
    >
      <ConfirmarEmailContent />
    </Suspense>
  );
}
