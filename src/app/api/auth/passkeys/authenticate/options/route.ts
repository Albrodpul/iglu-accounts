import { NextResponse, type NextRequest } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import {
  getChallengeCookieOptions,
  PASSKEY_AUTH_CHALLENGE_COOKIE,
  getRpId,
} from "@/lib/passkeys";

export async function POST(request: NextRequest) {
  const rpID = getRpId(request);

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: [],
  });

  const response = NextResponse.json({ options });
  response.cookies.set(
    PASSKEY_AUTH_CHALLENGE_COOKIE,
    options.challenge,
    getChallengeCookieOptions()
  );

  return response;
}
