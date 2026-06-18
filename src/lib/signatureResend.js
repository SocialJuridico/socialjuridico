import { Resend } from "resend";

let signatureResendClient = null;

export function getSignatureResend() {
  if (!signatureResendClient) {
    signatureResendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return signatureResendClient;
}
