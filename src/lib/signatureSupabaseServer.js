import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const SIGNATURE_AUTH_COOKIE_NAME = "sj-signature-auth";

export function createSignatureClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: {
        name: SIGNATURE_AUTH_COOKIE_NAME,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
      cookies: {
        async getAll() {
          const store = await cookieStore;
          return store.getAll();
        },
        async setAll(cookiesToSet) {
          try {
            const store = await cookieStore;
            cookiesToSet.forEach(({ name, value, options }) =>
              store.set(name, value, options),
            );
          } catch {
            // Server Components cannot persist refreshed cookies.
          }
        },
      },
    },
  );
}
