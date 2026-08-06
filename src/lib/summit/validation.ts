import { z } from "zod";

const requiredText = (label: string, maximum = 120) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(maximum, `${label} must be ${maximum} characters or fewer.`);

export const summitRegistrationSchema = z.object({
  first_name: requiredText("First name", 80),
  last_name: requiredText("Last name", 80),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number.")
    .max(30, "Enter a valid phone number.")
    .regex(/^[0-9+() .-]+$/, "Enter a valid phone number."),
  email: z.string().trim().email("Enter a valid email address.").max(320),
  industry: requiredText("Industry"),
  profession: requiredText("Profession"),
  designation: requiredText("Designation"),
  place: requiredText("Place"),
  summit_expectations: z
    .string()
    .trim()
    .max(2000, "Please keep your response within 2,000 characters."),
  website: z.string().max(0).optional(),
});

export const redeemCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "Enter a valid redeem code.")
    .max(40, "Enter a valid redeem code.")
    .regex(/^[A-Za-z0-9_-]+$/, "Enter a valid redeem code."),
});

export type RegistrationValues = Omit<
  z.infer<typeof summitRegistrationSchema>,
  "website"
>;
