import type { NextRequest } from "next/server";

import { refreshAdminSession } from "@/lib/supabase/admin-proxy";

export async function proxy(request: NextRequest) {
  return refreshAdminSession(request);
}

export const config = {
  matcher: ["/admin/:path*"],
};
