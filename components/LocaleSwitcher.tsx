import { useLocale } from 'next-intl';
import LocaleSwitcherSelect from './LoccaleSwitcherSelect';
import { useEffect } from 'react';
import { setUserLocale } from '@/src/services/locale';
import { Locale } from '@/src/i18n/config';

export default function LocaleSwitcher() {
  const locale = useLocale();

  useEffect(() => {
    async function detectLanguage() {
      const WebApp = (await import('@twa-dev/sdk')).default;
      WebApp.ready();
      const locale = WebApp.initDataUnsafe?.user?.language_code as Locale;

      setUserLocale(locale || 'en');
    }

    detectLanguage();
  }, []);

  return (
    <LocaleSwitcherSelect
      defaultValue={locale}
      items={[
        {
          value: 'ar',
          label: 'العربية'
        },
        {
          value: 'bn',
          label: 'বাংলা'
        },
        {
          value: 'ch',
          label: '中文'
        },
        {
          value: 'de',
          label: 'Deutsch'
        },
        {
          value: 'en',
          label: 'English'
        },
        {
          value: 'es',
          label: 'Español'
        },
        {
          value: 'fr',
          label: 'Français'
        },
        {
          value: 'hi',
          label: 'हिन्दी'
        },
        {
          value: 'id',
          label: 'Bahasa Indonesia'
        },
        {
          value: 'it',
          label: 'Italiano'
        },
        {
          value: 'ja',
          label: '日本語'
        },
        {
          value: 'ko',
          label: '한국어'
        },
        {
          value: 'ms',
          label: 'Bahasa Melayu'
        },
        {
          value: 'nl',
          label: 'Nederlands'
        },
        {
          value: 'pl',
          label: 'Polski'
        },
        {
          value: 'pt',
          label: 'Português'
        },
        {
          value: 'ru',
          label: 'Русский'
        },
        {
          value: 'th',
          label: 'ไทย'
        },
        {
          value: 'tr',
          label: 'Türkçe'
        },
        {
          value: 'uk',
          label: 'Українська'
        },
        {
          value: 'ur',
          label: 'اردو'
        },
        {
          value: 'vi',
          label: 'Tiếng Việt'
        }
      ]}
      label={'Language'}
    />
  );
}
