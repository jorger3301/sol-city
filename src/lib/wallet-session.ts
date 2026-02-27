import { cookies } from "next/headers";

const COOKIE_NAME = "sol_wallet";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Read the wallet address from the session cookie (server-side).
 * Returns null if no wallet session exists.
 */
export async function getWalletSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  return cookie?.value ?? null;
}

/**
 * Set the wallet session cookie (server-side, in Route Handlers only).
 */
export async function setWalletSession(address: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, address, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

/**
 * Clear the wallet session cookie (server-side, in Route Handlers only).
 */
export async function clearWalletSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
