import Link from 'next/link';

export async function generateMetadata({ searchParams }) {
  const title = searchParams.t || "Caso Jurídico - SocialJurídico";
  const description = searchParams.d || "Confira este novo caso no nosso marketplace jurídico.";
  const siteUrl = "https://socialjuridico.com.br";

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      url: `${siteUrl}/compartilhar`,
      siteName: 'SocialJurídico',
      images: [
        {
          url: `${siteUrl}/img/banner_share.png`, 
          width: 1200,
          height: 630,
        },
      ],
      locale: 'pt-BR',
      type: 'website',
    },
  };
}

export default function SharePage() {
  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#000',
      color: '#fff',
      fontFamily: 'sans-serif'
    }}>
      <h1 style={{ color: '#D4AF37' }}>SocialJurídico</h1>
      <p>Redirecionando para o marketplace...</p>
      <Link href="/" style={{ 
        padding: '12px 24px', 
        backgroundColor: '#D4AF37', 
        color: '#000', 
        borderRadius: '8px',
        textDecoration: 'none',
        fontWeight: 'bold'
      }}>
        Acessar Marketplace
      </Link>
    </div>
  );
}
