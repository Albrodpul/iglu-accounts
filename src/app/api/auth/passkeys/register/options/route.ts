import { NextResponse, type NextRequest } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/db/auth";
import {
  getChallengeCookieOptions,
  getExpectedOrigin,
  getRpId,
  PASSKEY_REGISTRATION_CHALLENGE_COOKIE,
} from "@/lib/passkeys";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const db = await getDb();
  const credentials = await db.passkeys.findCredentialIdsByUser(user.id);

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
    excludeCredentials: credentials.map((item) => ({
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
    getChallengeCookieOptions(),
  );

  return response;
}
