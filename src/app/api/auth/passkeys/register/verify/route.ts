import { NextResponse, type NextRequest } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { createClient } from "@/lib/supabase/server";
import {
  getChallengeCookieOptions,
  getExpectedOrigin,
  getRpId,
  PASSKEY_REGISTRATION_CHALLENGE_COOKIE,
} from "@/lib/passkeys";

type RegistrationResponseBody = Parameters<
  typeof verifyRegistrationResponse
>[0]["response"];

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const expectedChallenge = request.cookies.get(PASSKEY_REGISTRATION_CHALLENGE_COOKIE)?.value;

  if (!expectedChallenge) {
    return NextResponse.json({ error: "Desafío expirado" }, { status: 400 });
  }

  let body: RegistrationResponseBody;
  try {
    body = (await request.json()) as RegistrationResponseBody;
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const rpID = getRpId(request);
  const expectedOrigin = getExpectedOrigin(request);

  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin,
    expectedRPID: rpID,
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "No se pudo validar la passkey" }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;

  const { error } = await supabase.from("user_passkeys").insert({
    user_id: user.id,
    credential_id: credential.id,
    public_key: Buffer.from(credential.publicKey).toString("base64url"),
    counter: credential.counter,
    transports: credential.transports ?? [],
    label: request.headers.get("user-agent")?.slice(0, 120) ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response = NextResponse.json({ verified: true });
  response.cookies.set(PASSKEY_REGISTRATION_CHALLENGE_COOKIE, "", {
    ...getChallengeCookieOptions(),
    maxAge: 0,
  });

  return response;
}
