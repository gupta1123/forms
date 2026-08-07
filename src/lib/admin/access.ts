import "server-only";

import { redirect } from "next/navigation";

import { createAdminAuthClient } from "@/lib/supabase/admin-server";

export async function requireSummitAdmin() {
  const supabase = await createAdminAuthClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims?.sub) redirect("/admin/login");

  const { data: isAdmin, error } = await supabase.rpc("is_summit_admin");
  if (error || !isAdmin) redirect("/admin/login");

  const email =
    typeof claimsData.claims.email === "string"
      ? claimsData.claims.email
      : "Administrator";

  return { email, supabase };
}
