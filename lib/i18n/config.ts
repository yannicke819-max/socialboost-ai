export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';
export const LOCALE_COOKIE = 'sb_locale';

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
};

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
