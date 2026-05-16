import { DashboardProvider } from "./DashboardContext";

export default function AdvogadoLayout({ children }) {
  return (
    <DashboardProvider>
      {children}
    </DashboardProvider>
  );
}
