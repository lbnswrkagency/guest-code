'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher';
import styles from './Header.module.scss';

export default function Header() {
  const t = useTranslations('header');

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoGuest}>Guest</span>
          <span className={styles.logoCode}>Code</span>
        </Link>

        <div className={styles.actions}>
          <LanguageSwitcher />
          <ThemeToggle />
          <button className={styles.iconBtn} aria-label={t('search')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <Link href="/" className={styles.loginBtn}>
            {t('login')}
          </Link>
        </div>
      </div>
    </header>
  );
}
