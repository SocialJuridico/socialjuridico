"use client";

import HybridCheckoutModal from "./HybridCheckoutModal";

// Mantido apenas como adaptador para os pontos de entrada existentes.
// Cartão na Stripe e Pix no Mercado Pago, dentro do site.
export default function StableTransparentCheckoutModal(props) {
  return <HybridCheckoutModal {...props} />;
}
