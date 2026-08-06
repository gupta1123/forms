import type { RegistrationValues } from "@/lib/summit/validation";

export const PARTICIPATION_PURPOSES = [
  "Exploring a new facility in Jalna",
  "Expanding an existing operation",
  "Finding local partners or suppliers",
  "Understanding policy, land and incentives",
  "Financing or investment opportunities",
  "Representing a government or industry body",
  "General participation",
] as const;

export const SECTOR_OPTIONS = [
  "Seeds & agri-biotechnology",
  "Steel & engineering",
  "Agro & food processing",
  "Logistics & warehousing",
  "Automotive & allied",
  "MSME & manufacturing technology",
  "Banking, finance & investment",
  "Infrastructure & real estate",
  "Government or industry body",
  "Education & skilling",
  "Other",
] as const;

export const MEETING_OPTIONS = [
  {
    value: "B2G — government representatives",
    label: "B2G meeting",
    description: "Government & facilitation officers",
  },
  {
    value: "B2B — local industry",
    label: "B2B meeting",
    description: "Local industry & suppliers",
  },
  {
    value: "Investor roundtable",
    label: "Investor roundtable",
    description: "Sector-specific discussion",
  },
  {
    value: "Banking & finance desk",
    label: "Finance desk",
    description: "Banks, funds & institutions",
  },
] as const;

const PREFERENCES_PREFIX = "JIS_FORM_V1:";

export type SummitPreferences = {
  purpose: string;
  meetings: string[];
  notes: string;
};

export function encodeSummitPreferences({
  purpose,
  meetings,
  notes,
}: SummitPreferences) {
  return `${PREFERENCES_PREFIX}${JSON.stringify({
    p: purpose,
    m: meetings,
    n: notes,
  })}`;
}

export function decodeSummitPreferences(
  storedValue: string | null | undefined,
): SummitPreferences {
  const fallback = {
    purpose: "",
    meetings: [],
    notes: storedValue?.trim() ?? "",
  };

  if (!storedValue?.startsWith(PREFERENCES_PREFIX)) return fallback;

  try {
    const parsed = JSON.parse(storedValue.slice(PREFERENCES_PREFIX.length)) as {
      p?: unknown;
      m?: unknown;
      n?: unknown;
    };

    return {
      purpose: typeof parsed.p === "string" ? parsed.p : "",
      meetings: Array.isArray(parsed.m)
        ? parsed.m.filter((value): value is string => typeof value === "string")
        : [],
      notes: typeof parsed.n === "string" ? parsed.n : "",
    };
  } catch {
    return fallback;
  }
}

type StoredRegistrationValues = Omit<
  RegistrationValues,
  "participation_purpose" | "meeting_requests"
>;

export function registrationValuesFromStored(
  stored: Partial<StoredRegistrationValues>,
): Partial<RegistrationValues> {
  const preferences = decodeSummitPreferences(stored.summit_expectations);

  return {
    ...stored,
    participation_purpose: preferences.purpose,
    meeting_requests: preferences.meetings,
    summit_expectations: preferences.notes,
  };
}
