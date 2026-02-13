'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import styles from './LanguageSwitcher.module.scss';

const localeLabels: Record<string, string> = {
  en: 'EN',
  de: 'DE',
  gr: 'GR',
  es: 'ES',
};

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.replace(pathname, { locale: e.target.value });
  };

  return (
    <select
      className={styles.select}
      value={locale}
      onChange={handleChange}
      aria-label="Language"
    >
      {Object.entries(localeLabels).map(([code, label]) => (
        <option key={code} value={code}>
          {label}
        </option>
      ))}
    </select>
  );
}
