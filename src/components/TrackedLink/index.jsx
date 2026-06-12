"use client";

import Link from "next/link";

import { trackEvent } from "@/lib/trackEvent";

export default function TrackedLink({
  href,
  event,
  properties,
  children,
  onClick,
  ...props
}) {
  function handleClick(clickEvent) {
    onClick?.(clickEvent);

    if (clickEvent.defaultPrevented || !event) return;

    void trackEvent(event, properties);
  }

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
