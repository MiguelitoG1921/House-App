import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "greenhouse_access";
const COOKIE_VALUE = "greenhouse-members";

function sessionToken() {
  const secret = process.env.HOUSEHOLD_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("HOUSEHOLD_SESSION_SECRET must be at least 32 characters.");
  return createHmac("sha256", secret).update(COOKIE_VALUE).digest("hex");
}

export function verifyHouseholdCode(code: string) {
  const expected = process.env.HOUSEHOLD_ACCESS_CODE;
  if (!expected) throw new Error("HOUSEHOLD_ACCESS_CODE is not configured.");
  const actualBuffer = Buffer.from(code);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function hasHouseholdAccess() {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value) return false;
  const expected = sessionToken();
  const actualBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function grantHouseholdAccess() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function revokeHouseholdAccess() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
