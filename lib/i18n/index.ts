import { cookies, headers } from 'next/headers';
import { fr } from './fr';
import { en } from './en';

export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';
export const LOCALE_COOKIE = 'sb_locale';

export type Dict = typeof fr;

const dictionaries: Record<Locale, Dict> = { fr, en };

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
};

function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function getLocale(): Locale {
  const cookie = cookies().get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;

  const accept = headers().get('accept-language') ?? '';
  for (const part of accept.split(',')) {
    const code = part.split(/[-;]/)[0]?.trim().toLowerCase();
    if (isLocale(code)) return code;
  }
  return DEFAULT_LOCALE;
}

export function getDict(locale?: Locale): Dict {
  const loc = locale ?? getLocale();
  return dictionaries[loc] ?? dictionaries[DEFAULT_LOCALE];
}
