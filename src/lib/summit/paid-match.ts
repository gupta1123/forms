import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { PAID_MATCH_COOKIE_MAX_AGE } from "@/lib/summit/constants";

export type PaidMatchKind = "email" | "phone";

export type PaidMatch = {
  kind: PaidMatchKind;
  maskedEmail: string;
  maskedPhone: string;
  registrationType: "individual" | "corporate";
  companyName: string | null;
  attendeeCount: number;
};

type SignedPaidMatch = PaidMatch & {
  expiresAt: number;
  version: 1;
};

export function createPaidMatchCookieValue(match: PaidMatch) {
  const payload: SignedPaidMatch = {
    ...match,
    expiresAt: Date.now() + PAID_MATCH_COOKIE_MAX_AGE * 1000,
    version: 1,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return encodedPayload + "." + sign(encodedPayload);
}

export function readPaidMatchCookieValue(value: string | undefined): PaidMatch | null {
  if (!value) return null;

  const [encodedPayload, suppliedSignature, extra] = value.split(".");
  if (!encodedPayload || !suppliedSignature || extra) return null;

  const expectedSignature = sign(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const suppliedBuffer = Buffer.from(suppliedSignature);

  if (
    expectedBuffer.length !== suppliedBuffer.length ||
    !timingSafeEqual(expectedBuffer, suppliedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<SignedPaidMatch>;

    if (
      payload.version !== 1 ||
      (payload.kind !== "email" && payload.kind !== "phone") ||
      typeof payload.maskedEmail !== "string" ||
      typeof payload.maskedPhone !== "string" ||
      (payload.registrationType !== "individual" && payload.registrationType !== "corporate") ||
      (payload.companyName !== null && typeof payload.companyName !== "string") ||
      typeof payload.attendeeCount !== "number" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }

    return {
      kind: payload.kind,
      maskedEmail: payload.maskedEmail,
      maskedPhone: payload.maskedPhone,
      registrationType: payload.registrationType,
      companyName: payload.companyName,
      attendeeCount: payload.attendeeCount,
    };
  } catch {
    return null;
  }
}

export function maskEmail(value: string) {
  const [localPart, domain] = value.trim().toLowerCase().split("@");
  if (!localPart || !domain) return "Registered email";

  const visibleCharacters = localPart.slice(0, Math.min(2, localPart.length));
  return visibleCharacters + "***@" + domain;
}

export function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "Registered phone";

  return "*".repeat(Math.max(6, digits.length - 4)) + digits.slice(-4);
}

function sign(value: string) {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!secret) throw new Error("Paid-registration matching is not configured.");

  return createHmac("sha256", secret).update(value).digest("base64url");
}
