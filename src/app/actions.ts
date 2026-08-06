"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  CHECKOUT_COOKIE_MAX_AGE,
  CHECKOUT_COOKIE_NAME,
  isCheckoutToken,
} from "@/lib/summit/constants";
import {
  summitRegistrationSchema,
  type RegistrationValues,
} from "@/lib/summit/validation";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type RegistrationState = {
  message?: string;
  errors?: Partial<Record<keyof RegistrationValues, string[]>>;
  values?: Partial<RegistrationValues>;
};

function formValue(formData: FormData, name: string) {
  const input = formData.get(name);
  return typeof input === "string" ? input : "";
}

function normalizedPhone(value: string) {
  return value.replace(/\D/g, "");
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
    profession: formValue(formData, "profession"),
    designation: formValue(formData, "designation"),
    place: formValue(formData, "place"),
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
      profession: fieldErrors.profession,
      designation: fieldErrors.designation,
      place: fieldErrors.place,
      summit_expectations: fieldErrors.summit_expectations,
    };
    const values: RegistrationValues = {
      first_name: submittedValues.first_name,
      last_name: submittedValues.last_name,
      phone: submittedValues.phone,
      email: submittedValues.email,
      industry: submittedValues.industry,
      profession: submittedValues.profession,
      designation: submittedValues.designation,
      place: submittedValues.place,
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
      .select("status")
      .eq("checkout_token", existingToken)
      .maybeSingle();

    if (existingApplication?.status === "payment_pending") redirect("/plans");
    if (existingApplication?.status === "details_submitted") {
      editableToken = existingToken;
    }
  }

  const registration: RegistrationValues = {
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    phone: parsed.data.phone,
    email: parsed.data.email,
    industry: parsed.data.industry,
    profession: parsed.data.profession,
    designation: parsed.data.designation,
    place: parsed.data.place,
    summit_expectations: parsed.data.summit_expectations,
  };

  const { data: paidCandidates, error: paidLookupError } = await supabase
    .from("summit_applications")
    .select("checkout_token, phone")
    .eq("email", registration.email.trim().toLowerCase())
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(10);

  if (paidLookupError) {
    console.error("Unable to check existing summit payment:", paidLookupError.message);
    return {
      message: "We could not check your payment status. Please try again.",
      values: registration,
    };
  }

  const submittedPhone = normalizedPhone(registration.phone);
  const paidRegistration = paidCandidates?.find(
    (candidate) => normalizedPhone(candidate.phone) === submittedPhone,
  );

  if (paidRegistration && isCheckoutToken(paidRegistration.checkout_token)) {
    setCheckoutCookie(cookieStore, paidRegistration.checkout_token);
    redirect("/plans");
  }

  const { data, error } = await supabase.rpc("save_summit_application", {
    p_first_name: registration.first_name,
    p_last_name: registration.last_name,
    p_phone: registration.phone,
    p_email: registration.email,
    p_industry: registration.industry,
    p_profession: registration.profession,
    p_designation: registration.designation,
    p_place: registration.place,
    p_summit_expectations: registration.summit_expectations || null,
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
