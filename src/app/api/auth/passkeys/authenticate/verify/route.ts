import { NextResponse, type NextRequest } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getServiceDb } from "@/lib/db/service";
import {
  getChallengeCookieOptions,
  getExpectedOrigin,
  getRpId,
  PASSKEY_AUTH_CHALLENGE_COOKIE,
} from "@/lib/passkeys";

type AuthenticationResponseBody = Parameters<
  typeof verifyAuthenticationResponse
>[0]["response"];

export async function POST(request: NextRequest) {
  // Service DB for passkey table operations (no auth context needed)
  const db = getServiceDb();
  // Service client needed for Supabase Admin auth operations (admin.getUserById, admin.generateLink)
  const serviceClient = createServiceClient();
  // Server client for verifyOtp (needs cookie context)
  const supabase = await createClient();

  const expectedChallenge = request.cookies.get(PASSKEY_AUTH_CHALLENGE_COOKIE)?.value;

  if (!expectedChallenge) {
    return NextResponse.json({ error: "Desafío expirado" }, { status: 400 });
  }

  let body: AuthenticationResponseBody;
  try {
    body = (await request.json()) as AuthenticationResponseBody;
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const passkey = await db.passkeys.findByCredentialId(body.id);

  if (!passkey) {
    return NextResponse.json({ error: "Passkey no encontrada" }, { status: 404 });
  }

  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: getExpectedOrigin(request),
    expectedRPID: getRpId(request),
    credential: {
      id: passkey.credential_id,
      publicKey: Buffer.from(passkey.public_key, "base64url"),
      counter: Number(passkey.counter),
      transports: (passkey.transports ?? []) as AuthenticatorTransport[],
    },
    requireUserVerification: true,
  });

  if (!verification.verified) {
    return NextResponse.json({ error: "Verificación fallida" }, { status: 401 });
  }

  await db.passkeys.updateCounter(
    passkey.credential_id,
    verification.authenticationInfo.newCounter,
    new Date().toISOString(),
  );

  // Supabase Admin auth — specific to Supabase Auth provider
  const { data: userResult, error: userError } = await serviceClient.auth.admin.getUserById(
    passkey.user_id,
  );

  const email = userResult.user?.email;

  if (userError || !email) {
    return NextResponse.json({ error: "No se pudo obtener el usuario" }, { status: 500 });
  }

  const { data: linkResult, error: linkError } = await serviceClient.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${getExpectedOrigin(request)}/select-account`,
    },
  });

  const tokenHash = linkResult.properties?.hashed_token;

  if (linkError || !tokenHash) {
    return NextResponse.json({ error: "No se pudo crear la sesión" }, { status: 500 });
  }

  const { error: otpError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });

  if (otpError) {
    return NextResponse.json(
      { error: `No se pudo iniciar sesión: ${otpError.message}` },
      { status: 500 },
    );
  }

  const response = NextResponse.json({ verified: true, redirectTo: "/select-account" });
  response.cookies.set(PASSKEY_AUTH_CHALLENGE_COOKIE, "", {
    ...getChallengeCookieOptions(),
    maxAge: 0,
  });

  return response;
}
