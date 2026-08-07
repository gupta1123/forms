"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  CHECKOUT_COOKIE_NAME,
  PAID_MATCH_COOKIE_NAME,
} from "@/lib/summit/constants";

export async function startAnotherRegistration() {
  const cookieStore = await cookies();
  cookieStore.delete(CHECKOUT_COOKIE_NAME);
  cookieStore.delete(PAID_MATCH_COOKIE_NAME);
  redirect("/");
}
