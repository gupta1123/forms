"use client";

import { useActionState } from "react";
import { PiArrowRight, PiInfo } from "react-icons/pi";

import {
  submitCorporateRegistration,
  type CorporateRegistrationState,
} from "@/app/actions";
import type { CorporateRegistrationValues } from "@/lib/summit/validation";

const emptyValues: CorporateRegistrationValues = {
  first_name: "",
  last_name: "",
  phone: "",
  company_name: "",
  attendee_count: 2,
};

export function CorporateRegistrationForm({
  initialValues,
}: {
  initialValues?: Partial<CorporateRegistrationValues> | null;
}) {
  const initialState: CorporateRegistrationState = {
    values: { ...emptyValues, ...initialValues },
  };
  const [state, formAction, pending] = useActionState(
    submitCorporateRegistration,
    initialState,
  );
  const values = { ...emptyValues, ...initialValues, ...state.values };
  return (
    <form action={formAction} noValidate>
      {state.message && (
        <div className="summit-alert" role="alert">
          {state.message}
        </div>
      )}

      <div
        className="mb-7 flex items-start gap-3.5 rounded-[6px] bg-[var(--paper-deep)] px-[15px] py-2.5 text-[15px] leading-6 text-[var(--ink)]"
        data-testid="corporate-terms"
      >
        <PiInfo className="shrink-0 text-sm text-[var(--brass)]" aria-hidden="true" />
        <ul className="flex min-w-0 flex-wrap gap-x-3.5 gap-y-1.5">
          <li>One registration per company</li>
          <li className="flex items-center gap-3.5 before:size-[3px] before:shrink-0 before:rounded-full before:bg-[var(--brass)] before:opacity-50">
            <span>Minimum <b className="font-semibold text-[var(--navy)]">2</b> people</span>
          </li>
        </ul>
      </div>

      <fieldset className="summit-fieldset">
        <legend className="summit-legend">Corporate contact</legend>
        <div className="summit-field-grid">
          <CorporateField
            autoComplete="given-name"
            defaultValue={values.first_name}
            errors={state.errors?.first_name}
            label="First name"
            name="first_name"
            placeholder="Primary contact first name"
          />
          <CorporateField
            autoComplete="family-name"
            defaultValue={values.last_name}
            errors={state.errors?.last_name}
            label="Last name"
            name="last_name"
            placeholder="Primary contact last name"
          />
          <CorporateField
            autoComplete="tel"
            defaultValue={values.phone}
            errors={state.errors?.phone}
            label="Phone number"
            name="phone"
            placeholder="+91 98765 43210"
            type="tel"
          />
          <CorporateField
            autoComplete="organization"
            defaultValue={values.company_name}
            errors={state.errors?.company_name}
            label="Company name"
            name="company_name"
            placeholder="Company or institution"
          />
          <CorporateField
            defaultValue={String(values.attendee_count)}
            errors={state.errors?.attendee_count}
            hint="Minimum 2. Enter the full number of people attending."
            label="Number of people"
            min={2}
            name="attendee_count"
            placeholder="2"
            step={1}
            type="number"
          />
        </div>
      </fieldset>

      <div className="absolute -left-[10000px] top-auto size-px overflow-hidden" aria-hidden="true">
        <label htmlFor="corporate_website">Website</label>
        <input id="corporate_website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="summit-actions">
        <p className="summit-actions-note">
          Corporate registrations are charged at the full pass price per person.
          Redeem codes do not apply.
        </p>
        <button
          className="button-primary min-w-56 px-7 text-[15px]"
          type="submit"
          disabled={pending}
        >
          {pending ? "Saving details..." : "Continue to corporate passes"}
          {!pending && <PiArrowRight aria-hidden="true" />}
        </button>
      </div>
    </form>
  );
}

function CorporateField({
  autoComplete,
  defaultValue,
  errors,
  hint,
  label,
  min,
  name,
  placeholder,
  step,
  type = "text",
}: {
  autoComplete?: string;
  defaultValue: string;
  errors?: string[];
  hint?: string;
  label: string;
  min?: number;
  name: keyof CorporateRegistrationValues;
  placeholder: string;
  step?: number;
  type?: string;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={name}>
        {label} <span className="summit-required">*</span>
      </label>
      <input
        aria-describedby={errors?.length ? `${name}-error` : undefined}
        aria-invalid={Boolean(errors?.length)}
        autoComplete={autoComplete}
        className="field-input"
        defaultValue={defaultValue}
        id={name}
        min={min}
        name={name}
        placeholder={placeholder}
        required
        step={step}
        type={type}
      />
      {hint && <p className="summit-field-hint">{hint}</p>}
      {errors?.map((error) => (
        <p className="summit-error" id={`${name}-error`} key={error}>
          {error}
        </p>
      ))}
    </div>
  );
}
