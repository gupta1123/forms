function optionalSetting(name: string) {
  const value = process.env[name]?.trim();
  return value || null;
}

export const summitSite = {
  name: "Jalna Investment Summit",
  organizer:
    optionalSetting("EVENT_ORGANIZER_NAME") ?? "Jalna Investment Summit Organiser",
  supportEmail:
    optionalSetting("EVENT_SUPPORT_EMAIL") ?? "office@jalnafirst.in",
  supportPhone: optionalSetting("EVENT_SUPPORT_PHONE"),
  eventDate:
    optionalSetting("EVENT_DATE") ??
    "The confirmed schedule will be shared with registered attendees.",
  eventLocation:
    optionalSetting("EVENT_LOCATION") ??
    "The confirmed venue or access details will be shared with registered attendees.",
} as const;
