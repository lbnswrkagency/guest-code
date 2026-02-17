'use client';

import { useTranslations } from 'next-intl';
import styles from './GenreFilter.module.scss';

interface Genre {
  _id: string;
  name: string;
  color?: string;
}

interface GenreFilterProps {
  genres: Genre[];
  selected: string | null;
  onSelect: (genre: string | null) => void;
}

export default function GenreFilter({ genres, selected, onSelect }: GenreFilterProps) {
  const t = useTranslations('home');

  return (
    <div className={styles.wrapper}>
      <div className={styles.scroll}>
        <button
          className={`${styles.chip} ${selected === null ? styles.active : ''}`}
          onClick={() => onSelect(null)}
        >
          {t('allGenres')}
        </button>
        {genres.map((genre) => (
          <button
            key={genre._id}
            className={`${styles.chip} ${selected === genre.name ? styles.active : ''}`}
            onClick={() => onSelect(genre.name)}
          >
            {genre.name}
          </button>
        ))}
      </div>
    </div>
  );
}
