import AdvogadoProviderBoundary from "./AdvogadoProviderBoundary";

export default function AdvogadoLayout({ children }) {
  return <AdvogadoProviderBoundary>{children}</AdvogadoProviderBoundary>;
}
