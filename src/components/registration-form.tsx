"use client";

import { useActionState } from "react";
import { PiArrowRight, PiCaretDown } from "react-icons/pi";

import {
  submitRegistration,
  type RegistrationState,
} from "@/app/actions";
import {
  PARTICIPATION_PURPOSES,
  SECTOR_OPTIONS,
} from "@/lib/summit/preferences";
import type { RegistrationValues } from "@/lib/summit/validation";

const emptyValues: RegistrationValues = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  industry: "",
  profession: "",
  designation: "",
  place: "",
  participation_purpose: "",
  meeting_requests: [],
  summit_expectations: "",
};

export function RegistrationForm({
  initialValues,
}: {
  initialValues?: Partial<RegistrationValues> | null;
}) {
  const initialState: RegistrationState = {
    values: { ...emptyValues, ...initialValues },
  };
  const [state, formAction, pending] = useActionState(
    submitRegistration,
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

      <fieldset className="summit-fieldset">
        <legend className="summit-legend">Contact</legend>
        <div className="summit-field-grid">
          <Field
            label="First name"
            name="first_name"
            autoComplete="given-name"
            placeholder="Your first name"
            defaultValue={values.first_name}
            errors={state.errors?.first_name}
          />
          <Field
            label="Last name"
            name="last_name"
            autoComplete="family-name"
            placeholder="Your last name"
            defaultValue={values.last_name}
            errors={state.errors?.last_name}
          />
          <Field
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            hint="Your pass and payment confirmation are sent here."
            defaultValue={values.email}
            errors={state.errors?.email}
          />
          <Field
            label="Phone number"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            hint="Used for registration coordination only."
            defaultValue={values.phone}
            errors={state.errors?.phone}
          />
        </div>
      </fieldset>

      <fieldset className="summit-fieldset">
        <legend className="summit-legend">Organisation</legend>
        <div className="summit-field-grid">
          <Field
            label="Organisation"
            name="profession"
            autoComplete="organization"
            placeholder="Company or institution"
            defaultValue={values.profession}
            errors={state.errors?.profession}
          />
          <Field
            label="Designation"
            name="designation"
            autoComplete="organization-title"
            placeholder="e.g. Managing Director"
            defaultValue={values.designation}
            errors={state.errors?.designation}
          />
          <SelectField
            label="Sector"
            name="industry"
            placeholder="Select your sector"
            options={SECTOR_OPTIONS}
            defaultValue={values.industry}
            errors={state.errors?.industry}
          />
          <Field
            label="City"
            name="place"
            autoComplete="address-level2"
            placeholder="City, State"
            defaultValue={values.place}
            errors={state.errors?.place}
          />
        </div>
      </fieldset>

      <fieldset className="summit-fieldset">
        <legend className="summit-legend">What you want from the day</legend>
        <div className="summit-field-grid">
          <div className="summit-field-full">
            <SelectField
              label="Purpose of participation"
              name="participation_purpose"
              placeholder="Select a purpose"
              options={PARTICIPATION_PURPOSES}
              defaultValue={values.participation_purpose}
              errors={state.errors?.participation_purpose}
            />
          </div>

          <div className="summit-field-full">
            <div className="summit-field-label-row">
              <label className="field-label mb-0" htmlFor="summit_expectations">
                Anything the organisers should know
              </label>
              <span className="summit-optional">Optional</span>
            </div>
            <p className="summit-field-hint mb-3">
              Share land requirements, sector specifics, or people you would
              particularly like to meet.
            </p>
            <textarea
              className="field-textarea"
              id="summit_expectations"
              name="summit_expectations"
              maxLength={1200}
              rows={5}
              placeholder="Tell us what would make this summit valuable for you..."
              defaultValue={values.summit_expectations}
            />
            {state.errors?.summit_expectations?.map((error) => (
              <p className="summit-error" key={error}>
                {error}
              </p>
            ))}
          </div>
        </div>
      </fieldset>

      <div className="absolute -left-[10000px] top-auto size-px overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="summit-actions">
        <p className="summit-actions-note">
          By continuing, you agree to provide these details for summit
          registration and payment processing.
        </p>
        <button
          className="button-primary min-w-56 px-7 text-[15px]"
          type="submit"
          disabled={pending}
        >
          {pending ? "Saving details..." : "Continue to your pass"}
          {!pending && <PiArrowRight aria-hidden="true" />}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  placeholder,
  hint,
  defaultValue,
  errors,
}: {
  label: string;
  name: keyof RegistrationValues;
  type?: string;
  autoComplete?: string;
  placeholder: string;
  hint?: string;
  defaultValue: string;
  errors?: string[];
}) {
  return (
    <div>
      <label className="field-label" htmlFor={name}>
        {label} <span className="summit-required">*</span>
      </label>
      <input
        aria-invalid={Boolean(errors?.length)}
        aria-describedby={errors?.length ? `${name}-error` : undefined}
        className="field-input"
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required
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

function SelectField({
  label,
  name,
  placeholder,
  options,
  defaultValue,
  errors,
}: {
  label: string;
  name: keyof RegistrationValues;
  placeholder: string;
  options: readonly string[];
  defaultValue: string;
  errors?: string[];
}) {
  return (
    <div>
      <label className="field-label" htmlFor={name}>
        {label} <span className="summit-required">*</span>
      </label>
      <div className="summit-select-wrap">
        <select
          aria-describedby={errors?.length ? `${name}-error` : undefined}
          aria-invalid={Boolean(errors?.length)}
          className="field-input field-select"
          defaultValue={defaultValue}
          id={name}
          name={name}
          required
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <PiCaretDown aria-hidden="true" />
      </div>
      {errors?.map((error) => (
        <p className="summit-error" id={`${name}-error`} key={error}>
          {error}
        </p>
      ))}
    </div>
  );
}
