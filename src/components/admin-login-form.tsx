"use client";

import { useActionState } from "react";

import {
  adminSignIn,
  type AdminLoginState,
} from "@/app/admin/actions";

export function AdminLoginForm() {
  const initialState: AdminLoginState = {};
  const [state, formAction, pending] = useActionState(adminSignIn, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {state.message && (
        <div
          role="alert"
          className="rounded-xl border border-[#f0c4b8] bg-[#fff5f2] px-4 py-3 text-sm text-[#9a3828]"
        >
          {state.message}
        </div>
      )}
      <div>
        <label className="field-label" htmlFor="identifier">
          Admin username or email
        </label>
        <input
          className="field-input"
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          placeholder="Enter username"
          defaultValue={state.identifier}
          required
        />
      </div>
      <div>
        <label className="field-label" htmlFor="password">
          Password
        </label>
        <input
          className="field-input"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
        />
      </div>
      <button
        className="button-primary h-12 w-full text-[15px] disabled:cursor-wait disabled:opacity-70"
        type="submit"
        disabled={pending}
      >
        {pending ? "Checking access..." : "Open admin dashboard"}
        {!pending && <span aria-hidden="true">→</span>}
      </button>
    </form>
  );
}
