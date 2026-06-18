import SignaturePortalClient from "./SignaturePortalClient";

export const metadata = {
  title: "Revisar e assinar documento",
  robots: { index: false, follow: false, nocache: true },
};

export default async function SignaturePortalPage({ params }) {
  const { token } = await params;
  return <SignaturePortalClient token={String(token || "")} />;
}
