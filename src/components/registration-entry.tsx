"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PiArrowLeft, PiArrowRight, PiMagnifyingGlass } from "react-icons/pi";

import {
  lookupPaidRegistration,
  type PaidLookupState,
} from "@/app/actions";
import { RegistrationForm } from "@/components/registration-form";
import type { RegistrationValues } from "@/lib/summit/validation";

const initialLookupState: PaidLookupState = {};

export function RegistrationEntry({
  initialValues,
  lookupMode,
}: {
  initialValues?: Partial<RegistrationValues> | null;
  lookupMode: boolean;
}) {
  if (lookupMode) return <PaidRegistrationLookup />;

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 border border-[var(--ink-16)] bg-[var(--paper-deep)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-[var(--navy)]">
            Have you already registered and paid?
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--ink-72)]">
            Check your registration before submitting a new payment.
          </p>
        </div>
        <Link
          className="button-secondary inline-flex h-11 shrink-0 items-center justify-center gap-2 px-5"
          href="/?mode=lookup"
        >
          <PiMagnifyingGlass aria-hidden="true" />
          Already registered?
        </Link>
      </div>

      <RegistrationForm initialValues={initialValues} />
    </>
  );
}

function PaidRegistrationLookup() {
  const [state, formAction, pending] = useActionState(
    lookupPaidRegistration,
    initialLookupState,
  );

  return (
    <div>
      <Link
        className="summit-quiet-link mb-7 inline-flex items-center gap-2"
        href="/"
      >
        <PiArrowLeft aria-hidden="true" />
        Register a new attendee
      </Link>

      <div className="mb-8 max-w-[760px]">
        <p className="summit-kicker">Already registered?</p>
        <h2 className="mt-3 font-serif text-4xl leading-tight text-[var(--navy)]">
          Check your payment status.
        </h2>
        <p className="mt-3 leading-7 text-[var(--ink-72)]">
          Enter your registered email address, phone number, or both. Entering
          both matching details gives access to the complete confirmation.
        </p>
      </div>

      <form action={formAction} className="max-w-[760px]" noValidate>
        {state.message && (
          <div className="summit-alert mb-6" role="status">
            {state.message}
          </div>
        )}

        <fieldset className="summit-fieldset">
          <legend className="summit-legend">Find your registration</legend>
          <div className="summit-field-grid">
            <LookupField
              autoComplete="email"
              defaultValue={state.values?.email}
              errors={state.errors?.email}
              label="Email address"
              name="lookup_email"
              placeholder="you@company.com"
              type="email"
            />
            <LookupField
              autoComplete="tel"
              defaultValue={state.values?.phone}
              errors={state.errors?.phone}
              label="Phone number"
              name="lookup_phone"
              placeholder="+91 98765 43210"
              type="tel"
            />
          </div>
          <p className="summit-field-hint mt-4">
            At least one field is required. Use both to view the full
            registration confirmation.
          </p>
        </fieldset>

        <div className="summit-actions">
          <button
            className="button-primary min-w-56 px-7 text-[15px]"
            disabled={pending}
            type="submit"
          >
            {pending ? "Checking registration..." : "Check registration"}
            {!pending && <PiArrowRight aria-hidden="true" />}
          </button>
        </div>
      </form>
    </div>
  );
}

function LookupField({
  autoComplete,
  defaultValue,
  errors,
  label,
  name,
  placeholder,
  type,
}: {
  autoComplete: string;
  defaultValue?: string;
  errors?: string[];
  label: string;
  name: string;
  placeholder: string;
  type: string;
}) {
  const errorId = `${name}-error`;

  return (
    <div>
      <label className="field-label" htmlFor={name}>
        {label}
      </label>
      <input
        aria-describedby={errors?.length ? errorId : undefined}
        aria-invalid={Boolean(errors?.length)}
        autoComplete={autoComplete}
        className="field-input"
        defaultValue={defaultValue}
        id={name}
        name={name}
        placeholder={placeholder}
        type={type}
      />
      {errors?.map((error) => (
        <p className="summit-error" id={errorId} key={error}>
          {error}
        </p>
      ))}
    </div>
  );
}
