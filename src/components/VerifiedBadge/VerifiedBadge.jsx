import React from "react";
import Image from "next/image";

export default function VerifiedBadge({ size = 26, style = {} }) {
  return (
    <div
      title="Advogado Verificado"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
        ...style,
      }}
    >
      <Image 
        src="/verificado.svg" 
        alt="Verificado" 
        width={size} 
        height={size} 
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        unoptimized
      />
    </div>
  );
}
