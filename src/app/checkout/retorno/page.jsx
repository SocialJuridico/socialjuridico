"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import HybridCheckoutModal from "@/components/TransparentCheckout/HybridCheckoutModal";
function ReturnCheckout() {
  const params=useSearchParams();const router=useRouter();
  return <HybridCheckoutModal isOpen checkoutId={params.get("checkout")} onClose={()=>router.push("/dashboard/advogado")} />;
}
export default function CheckoutReturnPage(){return <Suspense fallback={<p>Consultando pagamento…</p>}><ReturnCheckout/></Suspense>;}
