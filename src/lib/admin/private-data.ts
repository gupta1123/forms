import "server-only";

import type { AdminPagination, PrivateAdminFilters, PrivateAdminRegistration } from "@/lib/admin/types";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const PAGE_SIZE = 20;
const columns = "id, submission_token, first_name, last_name, phone, email, industry, profession, designation, place, participation_purpose, summit_expectations, source, created_at, updated_at";

export async function getPrivateRegistrationPage(filters: PrivateAdminFilters): Promise<{
  registrations: PrivateAdminRegistration[];
  pagination: AdminPagination;
}> {
  const supabase = createSupabaseServiceClient();
  const searchPattern = filters.search ? `%${filters.search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%` : "";
  let pageQuery = supabase.from("summit_private_registrations").select(columns);
  let countQuery = supabase.from("summit_private_registrations").select("id", { count: "exact", head: true });

  if (searchPattern) {
    const expression = ["first_name", "last_name", "email", "phone", "industry", "profession", "designation", "place", "participation_purpose", "summit_expectations"]
      .map((column) => `${column}.ilike.${searchPattern}`)
      .join(",");
    pageQuery = pageQuery.or(expression);
    countQuery = countQuery.or(expression);
  }

  const displayAscending = filters.sort === "oldest";
  const queryAscending = filters.direction === "previous" ? !displayAscending : displayAscending;

  if (filters.cursor) {
    const wantsLowerIds = (filters.direction === "next" && !displayAscending) || (filters.direction === "previous" && displayAscending);
    pageQuery = wantsLowerIds ? pageQuery.lt("id", filters.cursor) : pageQuery.gt("id", filters.cursor);
  }

  pageQuery = pageQuery.order("id", { ascending: queryAscending }).limit(PAGE_SIZE + 1);
  const [{ data, error }, countResult] = await Promise.all([pageQuery, countQuery]);

  if (error || countResult.error) throw new Error("The private registration list could not be loaded. Run the private-registration migration in the linked Supabase project.");

  const fetched = (data ?? []) as PrivateAdminRegistration[];
  const hasExtraPage = fetched.length > PAGE_SIZE;
  let registrations = fetched.slice(0, PAGE_SIZE);
  if (filters.direction === "previous") registrations = registrations.reverse();

  return {
    registrations,
    pagination: {
      totalMatches: countResult.count ?? 0,
      pageSize: PAGE_SIZE,
      hasPrevious: filters.direction === "previous" ? hasExtraPage : Boolean(filters.cursor),
      hasNext: filters.direction === "previous" ? Boolean(filters.cursor) : hasExtraPage,
      previousCursor: registrations[0]?.id ?? null,
      nextCursor: registrations.at(-1)?.id ?? null,
    },
  };
}

export async function getPrivateRegistrationDetail(id: number) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("summit_private_registrations").select(columns).eq("id", id).maybeSingle();
  if (error) throw new Error("The private registration could not be loaded.");
  return (data as PrivateAdminRegistration | null) ?? null;
}

export async function getPrivateRegistrationExportRows() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("summit_private_registrations")
    .select(columns)
    .order("id", { ascending: false })
    .limit(1000);

  if (error) {
    throw new Error("The private registration export could not be loaded.");
  }

  return (data ?? []) as PrivateAdminRegistration[];
}
