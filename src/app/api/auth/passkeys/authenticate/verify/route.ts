import { NextResponse, type NextRequest } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { createServiceClient } from "@/lib/supabase/service";
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
  const serviceClient = createServiceClient();

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

  const { data: passkey, error: passkeyError } = await serviceClient
    .from("user_passkeys")
    .select("user_id, credential_id, public_key, counter, transports")
    .eq("credential_id", body.id)
    .maybeSingle();

  if (passkeyError || !passkey) {
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

  await serviceClient
    .from("user_passkeys")
    .update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq("credential_id", passkey.credential_id);

  const { data: userResult, error: userError } = await serviceClient.auth.admin.getUserById(
    passkey.user_id
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

  const actionLink = linkResult.properties?.action_link;

  if (linkError || !actionLink) {
    return NextResponse.json({ error: "No se pudo crear la sesión" }, { status: 500 });
  }

  const response = NextResponse.json({ verified: true, actionLink });
  response.cookies.set(PASSKEY_AUTH_CHALLENGE_COOKIE, "", {
    ...getChallengeCookieOptions(),
    maxAge: 0,
  });

  return response;
}
