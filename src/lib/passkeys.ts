import type { NextRequest } from "next/server";

export function getRpId(request: NextRequest): string {
  return request.nextUrl.hostname;
}

export function getExpectedOrigin(request: NextRequest): string {
  return request.nextUrl.origin;
}

export const PASSKEY_REGISTRATION_CHALLENGE_COOKIE = "pk_reg_challenge";
export const PASSKEY_AUTH_CHALLENGE_COOKIE = "pk_auth_challenge";

export function getChallengeCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 5,
  };
}
