import { grantHouseholdAccess, hasHouseholdAccess, revokeHouseholdAccess, verifyHouseholdCode } from "@/lib/household-access";

function configured() {
  return Boolean(process.env.DATABASE_URL && process.env.HOUSEHOLD_ACCESS_CODE && process.env.HOUSEHOLD_SESSION_SECRET?.length && process.env.HOUSEHOLD_SESSION_SECRET.length >= 32);
}

export async function GET() {
  try {
    return Response.json({ configured: configured(), authorized: configured() && await hasHouseholdAccess() });
  } catch {
    return Response.json({ configured: false, authorized: false });
  }
}

export async function POST(request: Request) {
  if (!configured()) return Response.json({ error: "Shared storage is not configured yet." }, { status: 503 });
  try {
    const body = await request.json() as { code?: unknown };
    if (typeof body.code !== "string" || body.code.length > 200 || !verifyHouseholdCode(body.code)) {
      return Response.json({ error: "That household access code didn’t match." }, { status: 401 });
    }
    await grantHouseholdAccess();
    return Response.json({ authorized: true });
  } catch {
    return Response.json({ error: "Could not start the household session." }, { status: 500 });
  }
}

export async function DELETE() {
  await revokeHouseholdAccess();
  return Response.json({ authorized: false });
}
