"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  CHECKOUT_COOKIE_NAME,
  isCheckoutToken,
} from "@/lib/summit/constants";
import { redeemCodeSchema } from "@/lib/summit/validation";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type RedeemCodeState = {
  message?: string;
};

export async function applyRedeemCode(
  _previousState: RedeemCodeState,
  formData: FormData,
): Promise<RedeemCodeState> {
  const parsed = redeemCodeSchema.safeParse({ code: formData.get("code") });

  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Enter a valid code." };
  }

  const cookieStore = await cookies();
  const checkoutToken = cookieStore.get(CHECKOUT_COOKIE_NAME)?.value;

  if (!isCheckoutToken(checkoutToken)) {
    redirect("/");
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.rpc("apply_summit_redeem_code", {
    p_checkout_token: checkoutToken,
    p_code: parsed.data.code,
  });

  if (error) {
    return { message: "That redeem code is invalid or has expired." };
  }

  revalidatePath("/plans");
  redirect("/plans?redeemed=1");
}
