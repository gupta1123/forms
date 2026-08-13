"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createAdminAuthClient } from "@/lib/supabase/admin-server";
import type {
  AdminListFilters,
  AdminRegistration,
} from "@/lib/admin/types";
import { decodeSummitPreferences } from "@/lib/summit/preferences";
import { getAdminRegistrationExportRows } from "@/lib/admin/data";

const adminLoginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your username or email."),
  password: z.string().min(1, "Enter your password."),
});

const exportFiltersSchema = z.object({
  search: z.string().trim().max(80),
  payment: z.enum(["all", "awaiting", "paid", "cancelled"]),
  pricing: z.enum(["all", "redeemed", "standard"]),
  sort: z.enum(["recent", "oldest"]),
});

export type AdminLoginState = {
  message?: string;
  identifier?: string;
};

export async function adminSignIn(
  _previousState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const parsed = adminLoginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      message: parsed.error.issues[0]?.message ?? "Enter your login details.",
      identifier:
        typeof formData.get("identifier") === "string"
          ? String(formData.get("identifier"))
          : "",
    };
  }

  const localUsername = process.env.LOCAL_ADMIN_USERNAME;
  const isLocalUsername = parsed.data.identifier === localUsername;
  const isValidLocalAlias =
    isLocalUsername &&
    parsed.data.password === process.env.LOCAL_ADMIN_PASSWORD &&
    Boolean(process.env.LOCAL_ADMIN_SUPABASE_EMAIL) &&
    Boolean(process.env.LOCAL_ADMIN_SUPABASE_PASSWORD);

  if (isLocalUsername && !isValidLocalAlias) {
    return {
      message: "The username or password is incorrect.",
      identifier: parsed.data.identifier,
    };
  }

  const email = isValidLocalAlias
    ? process.env.LOCAL_ADMIN_SUPABASE_EMAIL!
    : z.string().email().safeParse(parsed.data.identifier).success
      ? parsed.data.identifier
      : null;
  const password = isValidLocalAlias
    ? process.env.LOCAL_ADMIN_SUPABASE_PASSWORD!
    : parsed.data.password;

  if (!email) {
    return {
      message: "Enter a valid administrator username or email.",
      identifier: parsed.data.identifier,
    };
  }

  const supabase = await createAdminAuthClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return {
      message: "The username or password is incorrect.",
      identifier: parsed.data.identifier,
    };
  }

  const { data: isAdmin, error: accessError } = await supabase.rpc(
    "is_summit_admin",
  );

  if (accessError || !isAdmin) {
    await supabase.auth.signOut();
    return {
      message: "This account does not have administrator access.",
      identifier: parsed.data.identifier,
    };
  }

  revalidatePath("/admin", "layout");
  redirect("/admin");
}

export async function adminSignOut() {
  const supabase = await createAdminAuthClient();
  await supabase.auth.signOut();
  revalidatePath("/admin", "layout");
  redirect("/admin/login");
}

export async function getAdminRegistrationExport(
  input: Pick<AdminListFilters, "search" | "payment" | "pricing" | "sort">,
) {
  const filters = exportFiltersSchema.parse(input);
  const supabase = await createAdminAuthClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) {
    throw new Error("Your administrator session has expired.");
  }

  const { data: isAdmin, error: accessError } = await supabase.rpc(
    "is_summit_admin",
  );
  if (accessError || !isAdmin) {
    throw new Error("Administrator access is required.");
  }

  const registrations: AdminRegistration[] = await getAdminRegistrationExportRows();
  const normalisedSearch = filters.search.toLowerCase();

  return registrations
    .filter((registration) => {
      const preferences = decodeSummitPreferences(
        registration.summit_expectations,
      );
      const matchesSearch =
        !normalisedSearch ||
        [
          registration.first_name,
          registration.last_name,
          registration.email ?? "",
          registration.company_name ?? "",
          registration.phone,
          registration.industry,
          registration.profession,
          registration.designation,
          registration.place,
          preferences.purpose,
          registration.redeem_code ?? "",
        ].some((value) => value.toLowerCase().includes(normalisedSearch));
      const matchesPayment =
        filters.payment === "all" ||
        (filters.payment === "awaiting" &&
          ["details_submitted", "payment_pending"].includes(
            registration.payment_status,
          )) ||
        registration.payment_status === filters.payment;
      const matchesPricing =
        filters.pricing === "all" ||
        (filters.pricing === "redeemed" && Boolean(registration.redeem_code)) ||
        (filters.pricing === "standard" && !registration.redeem_code);

      return matchesSearch && matchesPayment && matchesPricing;
    })
    .sort((left, right) => {
      const difference = left.application_id - right.application_id;
      return filters.sort === "recent" ? -difference : difference;
    });
}
