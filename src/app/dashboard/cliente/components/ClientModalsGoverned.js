"use client";

import ClientModals from "./ClientModals";
import ClientRatingModal from "./ClientRatingModal";

export default function ClientModalsGoverned({ controller }) {
  if (controller.modal?.type === "rating") {
    return <ClientRatingModal controller={controller} />;
  }

  return <ClientModals controller={controller} />;
}
