'use server';

import { cookies } from 'next/headers';
import { defaultLocale, Locale, locales } from '../i18n/config';

const COOKIE_NAME = 'NEXT_LOCALE';

export async function getUserLocale() {
  let userLocale = cookies().get(COOKIE_NAME)?.value;
  console.log('userLocale', userLocale);
  if (userLocale && !locales.includes(userLocale as Locale)) {
    userLocale = defaultLocale;
  }

  return userLocale || defaultLocale;
}

export async function setUserLocale(locale: Locale) {
  cookies().set(COOKIE_NAME, locale);
}
