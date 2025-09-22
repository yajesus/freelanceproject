export type Locale = (typeof locales)[number];

export const locales = [
  "ar",
  "bn",
  "ch",
  "de",
  "en",
  "es",
  "fr",
  "hi",
  "id",
  "it",
  "ja",
  "ko",
  "ms",
  "nl",
  "pl",
  "pt",
  "ru",
  "th",
  "tr",
  "uk",
  "ur",
  "vi",
] as const;
export const defaultLocale: Locale = "en";
