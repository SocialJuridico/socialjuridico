import ValidarClient from './ValidarClient';

export const metadata = {
  title: "Verificador de Assinaturas Digitais | SocialJurídico",
  description: "Valide a autenticidade, autoria e integridade de documentos com assinaturas eletrônicas do SocialJurídico.",
};

export default function ValidarPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#09090b', padding: '40px 20px 80px 20px' }}>
      <ValidarClient />
    </main>
  );
}
