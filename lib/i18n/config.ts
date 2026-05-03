export const LOCALES = ['fr', 'en', 'es', 'it', 'de'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';
export const LOCALE_COOKIE = 'sb_locale';

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  it: 'Italiano',
  de: 'Deutsch',
};

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
