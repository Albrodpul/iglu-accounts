import { NextResponse, type NextRequest } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { createClient } from "@/lib/supabase/server";
import {
  getChallengeCookieOptions,
  getExpectedOrigin,
  getRpId,
  PASSKEY_REGISTRATION_CHALLENGE_COOKIE,
} from "@/lib/passkeys";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: credentials } = await supabase
    .from("user_passkeys")
    .select("credential_id")
    .eq("user_id", user.id);

  const rpID = getRpId(request);
  const origin = getExpectedOrigin(request);

  const options = await generateRegistrationOptions({
    rpName: "Iglu Management",
    rpID,
    userName: user.email ?? user.id,
    userDisplayName: user.email ?? "Usuario",
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "required",
      userVerification: "required",
    },
    excludeCredentials: (credentials ?? []).map((item) => ({
      id: item.credential_id,
      type: "public-key" as const,
      transports: ["internal" as const],
    })),
    supportedAlgorithmIDs: [-7, -257],
  });

  const response = NextResponse.json({ options, origin });
  response.cookies.set(
    PASSKEY_REGISTRATION_CHALLENGE_COOKIE,
    options.challenge,
    getChallengeCookieOptions()
  );

  return response;
}
