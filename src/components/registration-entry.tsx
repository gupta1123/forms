"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PiArrowLeft, PiArrowRight, PiMagnifyingGlass } from "react-icons/pi";

import {
  lookupPaidRegistration,
  type PaidLookupState,
} from "@/app/actions";
import { CorporateRegistrationForm } from "@/components/corporate-registration-form";
import { RegistrationForm } from "@/components/registration-form";
import type {
  CorporateRegistrationValues,
  RegistrationValues,
} from "@/lib/summit/validation";

const initialLookupState: PaidLookupState = {};

export function RegistrationEntry({
  initialValues,
  corporateInitialValues,
  lookupMode,
  registrationType,
}: {
  initialValues?: Partial<RegistrationValues> | null;
  corporateInitialValues?: Partial<CorporateRegistrationValues> | null;
  lookupMode: boolean;
  registrationType: "individual" | "corporate";
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

      <div className="mb-8 grid gap-3 sm:grid-cols-2" aria-label="Registration type">
        <RegistrationTypeLink
          active={registrationType === "individual"}
          description="Register one attendee with the existing full form."
          href="/?registration=individual"
          title="Individual registration"
        />
        <RegistrationTypeLink
          active={registrationType === "corporate"}
          description="Register a company group of two or more people."
          href="/?registration=corporate"
          title="Corporate registration"
        />
      </div>

      {registrationType === "corporate" ? (
        <CorporateRegistrationForm initialValues={corporateInitialValues} />
      ) : (
        <RegistrationForm initialValues={initialValues} />
      )}
    </>
  );
}

function RegistrationTypeLink({
  active,
  description,
  href,
  title,
}: {
  active: boolean;
  description: string;
  href: string;
  title: string;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`border p-5 transition ${
        active
          ? "border-[var(--navy)] bg-[var(--navy)] text-white"
          : "border-[var(--ink-16)] bg-white text-[var(--ink)] hover:border-[var(--navy)]"
      }`}
      href={href}
    >
      <span className="font-semibold">{title}</span>
      <span className={`mt-1 block text-sm leading-6 ${active ? "text-white/75" : "text-[var(--ink-72)]"}`}>
        {description}
      </span>
    </Link>
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
          Enter the phone number used during registration to check whether the
          payment is already complete.
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
          <div className="max-w-[520px]">
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
            You may enter the number with or without +91.
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
