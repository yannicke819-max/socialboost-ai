import { cookies, headers } from 'next/headers';
import { fr } from './fr';
import { en } from './en';
import { es } from './es';
import { it } from './it';
import { de } from './de';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './config';

export {
  LOCALES,
  LOCALE_LABELS,
  LOCALE_COOKIE,
  DEFAULT_LOCALE,
  isLocale,
  type Locale,
} from './config';

export type Dict = typeof fr;

const dictionaries: Record<Locale, Dict> = { fr, en, es, it, de };

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
