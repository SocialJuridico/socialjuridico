import AssinaturaClient from './AssinaturaClient';

export const metadata = {
  title: "Portal Seguro de Assinatura Eletrônica | SocialJurídico",
  description: "Ambiente criptografado de assinaturas digitais com validade legal de acordo com a legislação federal.",
};

export default async function AssinaturaPage(props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  
  const id = params.id;
  const role = searchParams.role || 'client'; // 'lawyer' ou 'client'

  return (
    <main style={{ minHeight: '100vh', background: '#09090b', padding: '40px 20px 80px 20px' }}>
      <AssinaturaClient signatureId={id} initialRole={role} />
    </main>
  );
}
