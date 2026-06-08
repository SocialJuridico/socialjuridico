"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/trackEvent";

export default function TrackedLink({
  href,
  event,
  properties,
  children,
  ...props
}) {
  function handleClick() {
    trackEvent(event, properties);
  }

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}