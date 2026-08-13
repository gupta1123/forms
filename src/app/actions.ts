"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  CHECKOUT_COOKIE_MAX_AGE,
  CHECKOUT_COOKIE_NAME,
  PAID_MATCH_COOKIE_MAX_AGE,
  PAID_MATCH_COOKIE_NAME,
  isCheckoutToken,
} from "@/lib/summit/constants";
import {
  createPaidMatchCookieValue,
  maskEmail,
  maskPhone,
} from "@/lib/summit/paid-match";
import {
  corporateRegistrationSchema,
  summitRegistrationSchema,
  type CorporateRegistrationValues,
  type RegistrationValues,
} from "@/lib/summit/validation";
import { encodeSummitPreferences } from "@/lib/summit/preferences";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type RegistrationState = {
  message?: string;
  errors?: Partial<Record<keyof RegistrationValues, string[]>>;
  values?: Partial<RegistrationValues>;
};

export type CorporateRegistrationState = {
  message?: string;
  errors?: Partial<Record<keyof CorporateRegistrationValues, string[]>>;
  values?: Partial<CorporateRegistrationValues>;
};

export type PaidLookupState = {
  message?: string;
  errors?: {
    phone?: string[];
  };
  values?: {
    phone?: string;
  };
};

type PaidCandidate = {
  checkout_token: string | null;
  email: string | null;
  phone: string;
  registration_type: "individual" | "corporate";
  company_name: string | null;
  attendee_count: number;
};

function formValue(formData: FormData, name: string) {
  const input = formData.get(name);
  return typeof input === "string" ? input : "";
}

function formValues(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .filter((value): value is string => typeof value === "string");
}

function normalizedPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }

  return digits;
}

function setCheckoutCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  checkoutToken: string,
) {
  cookieStore.set(CHECKOUT_COOKIE_NAME, checkoutToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CHECKOUT_COOKIE_MAX_AGE,
  });
}

function setPaidMatchCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  match: Parameters<typeof createPaidMatchCookieValue>[0],
) {
  cookieStore.set(PAID_MATCH_COOKIE_NAME, createPaidMatchCookieValue(match), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PAID_MATCH_COOKIE_MAX_AGE,
  });
}

async function loadPaidCandidates(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
) {
  const { data, error } = await supabase
    .from("summit_applications")
    .select("checkout_token, email, phone, registration_type, company_name, attendee_count")
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(1000);

  return {
    candidates: (data ?? []) as PaidCandidate[],
    error,
  };
}

function findPaidMatches(
  candidates: PaidCandidate[],
  submittedEmail: string,
  submittedPhone: string,
) {
  const emailMatch = submittedEmail
    ? candidates.find(
        (candidate) =>
          candidate.email?.trim().toLowerCase() === submittedEmail,
      )
    : undefined;
  const phoneMatch = submittedPhone
    ? candidates.find(
        (candidate) => normalizedPhone(candidate.phone) === submittedPhone,
      )
    : undefined;
  const exactMatch =
    submittedEmail && submittedPhone
      ? candidates.find(
          (candidate) =>
            candidate.email?.trim().toLowerCase() === submittedEmail &&
            normalizedPhone(candidate.phone) === submittedPhone,
        )
      : undefined;

  return { emailMatch, exactMatch, phoneMatch };
}

function redirectForPaidMatch(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  matches: ReturnType<typeof findPaidMatches>,
) {
  if (
    matches.exactMatch &&
    isCheckoutToken(matches.exactMatch.checkout_token)
  ) {
    cookieStore.delete(PAID_MATCH_COOKIE_NAME);
    setCheckoutCookie(cookieStore, matches.exactMatch.checkout_token);
    redirect("/plans");
  }

  const partialMatch = matches.emailMatch ?? matches.phoneMatch;
  if (!partialMatch) return;

  cookieStore.delete(CHECKOUT_COOKIE_NAME);
  const matchedByEmail = Boolean(matches.emailMatch);
  setPaidMatchCookie(cookieStore, {
    kind: matchedByEmail ? "email" : "phone",
    maskedEmail: partialMatch.email
      ? matchedByEmail
        ? partialMatch.email
        : maskEmail(partialMatch.email)
      : "Not collected for corporate registration",
    maskedPhone: matchedByEmail
      ? maskPhone(partialMatch.phone)
      : partialMatch.phone,
    registrationType: partialMatch.registration_type,
    companyName: partialMatch.company_name,
    attendeeCount: partialMatch.attendee_count,
  });
  redirect("/plans");
}

export async function lookupPaidRegistration(
  _previousState: PaidLookupState,
  formData: FormData,
): Promise<PaidLookupState> {
  const phone = formValue(formData, "lookup_phone").trim();
  const errors: PaidLookupState["errors"] = {};

  if (!phone) {
    return {
      message: "Enter your registered phone number.",
      errors: {
        phone: ["Enter your registered phone number."],
      },
      values: { phone },
    };
  }

  const submittedPhone = phone ? normalizedPhone(phone) : "";
  if (phone && (submittedPhone.length < 7 || submittedPhone.length > 15)) {
    errors.phone = ["Enter a valid phone number."];
  }

  if (errors.phone) {
    return {
      message: "Please check the highlighted field.",
      errors,
      values: { phone },
    };
  }

  const cookieStore = await cookies();
  const supabase = createSupabaseServiceClient();
  const { candidates, error } = await loadPaidCandidates(supabase);

  if (error) {
    console.error("Unable to look up summit registration:", error.message);
    return {
      message: "We could not check your registration. Please try again.",
      values: { phone },
    };
  }

  const matches = findPaidMatches(candidates, "", submittedPhone);
  redirectForPaidMatch(cookieStore, matches);

  cookieStore.delete(CHECKOUT_COOKIE_NAME);
  cookieStore.delete(PAID_MATCH_COOKIE_NAME);

  return {
    message:
      "No paid registration was found with that phone number. You can register as a new attendee.",
    values: { phone },
  };
}

export async function submitRegistration(
  _previousState: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const submittedValues = {
    first_name: formValue(formData, "first_name"),
    last_name: formValue(formData, "last_name"),
    phone: formValue(formData, "phone"),
    email: formValue(formData, "email"),
    industry: formValue(formData, "industry"),
    industry_other: formValue(formData, "industry_other"),
    profession: formValue(formData, "profession"),
    designation: formValue(formData, "designation"),
    place: formValue(formData, "place"),
    participation_purpose: formValue(formData, "participation_purpose"),
    meeting_requests: formValues(formData, "meeting_requests"),
    summit_expectations: formValue(formData, "summit_expectations"),
    website: formValue(formData, "website"),
  };

  const parsed = summitRegistrationSchema.safeParse(submittedValues);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const errors: RegistrationState["errors"] = {
      first_name: fieldErrors.first_name,
      last_name: fieldErrors.last_name,
      phone: fieldErrors.phone,
      email: fieldErrors.email,
      industry: fieldErrors.industry,
      industry_other: fieldErrors.industry_other,
      profession: fieldErrors.profession,
      designation: fieldErrors.designation,
      place: fieldErrors.place,
      participation_purpose: fieldErrors.participation_purpose,
      meeting_requests: fieldErrors.meeting_requests,
      summit_expectations: fieldErrors.summit_expectations,
    };
    const values: RegistrationValues = {
      first_name: submittedValues.first_name,
      last_name: submittedValues.last_name,
      phone: submittedValues.phone,
      email: submittedValues.email,
      industry: submittedValues.industry,
      industry_other: submittedValues.industry_other,
      profession: submittedValues.profession,
      designation: submittedValues.designation,
      place: submittedValues.place,
      participation_purpose: submittedValues.participation_purpose,
      meeting_requests: submittedValues.meeting_requests,
      summit_expectations: submittedValues.summit_expectations,
    };

    return {
      message: "Please check the highlighted fields.",
      errors,
      values,
    };
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CHECKOUT_COOKIE_NAME)?.value;
  const existingToken = isCheckoutToken(cookieToken) ? cookieToken : null;
  const supabase = createSupabaseServiceClient();
  let editableToken: string | null = null;

  if (existingToken) {
    const { data: existingApplication } = await supabase
      .from("summit_applications")
      .select("status, registration_type")
      .eq("checkout_token", existingToken)
      .maybeSingle();

    if (existingApplication?.status === "payment_pending") redirect("/plans");
    if (
      existingApplication?.status === "details_submitted" &&
      existingApplication.registration_type !== "corporate"
    ) {
      editableToken = existingToken;
    }
  }

  const registration: RegistrationValues = {
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    phone: parsed.data.phone,
    email: parsed.data.email,
    industry: parsed.data.industry,
    industry_other: parsed.data.industry_other,
    profession: parsed.data.profession,
    designation: parsed.data.designation,
    place: parsed.data.place,
    participation_purpose: parsed.data.participation_purpose,
    meeting_requests: parsed.data.meeting_requests,
    summit_expectations: parsed.data.summit_expectations,
  };

  const { candidates: paidCandidates, error: paidLookupError } =
    await loadPaidCandidates(supabase);

  if (paidLookupError) {
    console.error("Unable to check existing summit payment:", paidLookupError.message);
    return {
      message: "We could not check your payment status. Please try again.",
      values: registration,
    };
  }

  const submittedEmail = registration.email.trim().toLowerCase();
  const submittedPhone = normalizedPhone(registration.phone);
  const matches = findPaidMatches(
    paidCandidates,
    submittedEmail,
    submittedPhone,
  );
  redirectForPaidMatch(cookieStore, matches);

  cookieStore.delete(PAID_MATCH_COOKIE_NAME);

  const { data, error } = await supabase.rpc("save_summit_application", {
    p_first_name: registration.first_name,
    p_last_name: registration.last_name,
    p_phone: registration.phone,
    p_email: registration.email,
    p_industry:
      registration.industry === "Other"
        ? registration.industry_other
        : registration.industry,
    p_profession: registration.profession,
    p_designation: registration.designation,
    p_place: registration.place,
    p_summit_expectations: encodeSummitPreferences({
      purpose: registration.participation_purpose,
      meetings: registration.meeting_requests,
      notes: registration.summit_expectations,
    }),
    p_checkout_token: editableToken,
  });

  if (error || typeof data !== "string") {
    console.error("Unable to save summit registration:", error?.message);
    return {
      message: "We could not save your registration. Please try again.",
      values: registration,
    };
  }

  setCheckoutCookie(cookieStore, data);

  redirect("/plans");
}

export async function submitCorporateRegistration(
  _previousState: CorporateRegistrationState,
  formData: FormData,
): Promise<CorporateRegistrationState> {
  const submittedValues = {
    contact_name: formValue(formData, "contact_name"),
    phone: formValue(formData, "phone"),
    company_name: formValue(formData, "company_name"),
    attendee_count: formValue(formData, "attendee_count"),
    website: formValue(formData, "website"),
  };
  const parsed = corporateRegistrationSchema.safeParse(submittedValues);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      message: "Please check the highlighted fields.",
      errors: {
        contact_name: fieldErrors.contact_name,
        phone: fieldErrors.phone,
        company_name: fieldErrors.company_name,
        attendee_count: fieldErrors.attendee_count,
      },
      values: {
        contact_name: submittedValues.contact_name,
        phone: submittedValues.phone,
        company_name: submittedValues.company_name,
        attendee_count: Number(submittedValues.attendee_count) || 2,
      },
    };
  }

  const registration: CorporateRegistrationValues = {
    contact_name: parsed.data.contact_name,
    phone: parsed.data.phone,
    company_name: parsed.data.company_name,
    attendee_count: parsed.data.attendee_count,
  };
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CHECKOUT_COOKIE_NAME)?.value;
  const existingToken = isCheckoutToken(cookieToken) ? cookieToken : null;
  const supabase = createSupabaseServiceClient();
  let editableToken: string | null = null;

  if (existingToken) {
    const { data: existingApplication } = await supabase
      .from("summit_applications")
      .select("status, registration_type")
      .eq("checkout_token", existingToken)
      .maybeSingle();

    if (existingApplication?.status === "payment_pending") redirect("/plans");
    if (
      existingApplication?.status === "details_submitted" &&
      existingApplication.registration_type === "corporate"
    ) {
      editableToken = existingToken;
    }
  }

  const { candidates, error: paidLookupError } = await loadPaidCandidates(supabase);
  if (paidLookupError) {
    console.error("Unable to check existing summit payment:", paidLookupError.message);
    return {
      message: "We could not check your payment status. Please try again.",
      values: registration,
    };
  }

  const matches = findPaidMatches(candidates, "", normalizedPhone(registration.phone));
  redirectForPaidMatch(cookieStore, matches);
  cookieStore.delete(PAID_MATCH_COOKIE_NAME);

  const { data, error } = await supabase.rpc("save_summit_corporate_application", {
    p_contact_name: registration.contact_name,
    p_phone: registration.phone,
    p_company_name: registration.company_name,
    p_attendee_count: registration.attendee_count,
    p_checkout_token: editableToken,
  });

  if (error || typeof data !== "string") {
    console.error("Unable to save corporate summit registration:", error?.message);
    return {
      message: "We could not save your registration. Please try again.",
      values: registration,
    };
  }

  setCheckoutCookie(cookieStore, data);
  redirect("/plans");
}
