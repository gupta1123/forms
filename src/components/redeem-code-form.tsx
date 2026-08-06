"use client";

import { useActionState } from "react";

import {
  applyRedeemCode,
  type RedeemCodeState,
} from "@/app/plans/actions";

export function RedeemCodeForm({
  applied,
  locked,
  paid = false,
}: {
  applied: boolean;
  locked: boolean;
  paid?: boolean;
}) {
  const initialState: RedeemCodeState = {};
  const [state, formAction, pending] = useActionState(
    applyRedeemCode,
    initialState,
  );

  if (locked) {
    return (
      <div className="border border-[var(--ink-16)] bg-[var(--paper)] p-4">
        <p className="text-sm font-semibold text-[var(--ink)]">{paid ? "Payment completed" : "Price locked"}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--ink-48)]">
          {paid
            ? "The final price and redeem code are recorded with this payment."
            : "Redeem codes cannot be changed after payment has started."}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <label className="field-label" htmlFor="code">
        Have a redeem code?
      </label>
      <div className="flex gap-2">
        <input
          className="field-input uppercase"
          id="code"
          name="code"
          type="text"
          autoComplete="off"
          placeholder="ENTER CODE"
          maxLength={40}
          required
        />
        <button
          className="button-secondary shrink-0 px-5"
          type="submit"
          disabled={pending}
        >
          {pending ? "Checking..." : applied ? "Apply another" : "Apply"}
        </button>
      </div>
      {state.message && (
        <p className="summit-error" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
