import { Resend } from 'resend';

const resend = new Resend('re_bh6iGBRE_CGwwRhEKutL9svfj6kDFZip7');

async function testEmail() {
  try {
    const data = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'socialjuridico3@gmail.com',
      subject: 'Hello World - Teste do Resend',
      html: '<p>Congrats on sending your <strong>first email</strong> via Resend API directly!</p>'
    });

    console.log("Email enviado com sucesso! Resposta do Resend:");
    console.log(data);
  } catch (error) {
    console.error("Erro ao enviar email:");
    console.error(error);
  }
}

testEmail();
