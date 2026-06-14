import NotificationPreviewDashboard from "./NotificationPreviewDashboard";

export const metadata = {
  title: "Visualização da Notificação | Social Jurídico",
  description:
    "Visualização interna autenticada da notificação extrajudicial sem registrar ciência do destinatário.",
};

export default async function NotificationPreviewPage({ params }) {
  const { notificationId } = await params;
  return <NotificationPreviewDashboard notificationId={notificationId} />;
}
