import { Resend } from 'resend';
import 'dotenv/config';

const resend = new Resend(process.env.RESEND_API_KEY);

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
