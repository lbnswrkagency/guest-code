'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import EventCard from '@/components/EventCard/EventCard';
import GenreFilter from '@/components/GenreFilter/GenreFilter';
import { getPublicEvents, type EventData } from '@/lib/api';
import styles from './page.module.scss';

interface EventFeedProps {
  initialEvents: EventData[];
  initialPagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  categories: { _id: string; name: string; color?: string }[];
}

export default function EventFeed({
  initialEvents,
  initialPagination,
  categories,
}: EventFeedProps) {
  const t = useTranslations('home');
  const [events, setEvents] = useState(initialEvents);
  const [pagination, setPagination] = useState(initialPagination);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async (genre: string | null, offset = 0) => {
    setLoading(true);
    try {
      const res = await getPublicEvents(20, offset, genre || undefined);
      if (offset === 0) {
        setEvents(res.events);
      } else {
        setEvents((prev) => [...prev, ...res.events]);
      }
      setPagination(res.pagination);
    } catch {
      // API error
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGenreSelect = (genre: string | null) => {
    setSelectedGenre(genre);
    fetchEvents(genre, 0);
  };

  const handleLoadMore = () => {
    if (!pagination.hasMore || loading) return;
    fetchEvents(selectedGenre, pagination.offset + pagination.limit);
  };

  return (
    <main className={styles.main}>
      <GenreFilter
        genres={categories}
        selected={selectedGenre}
        onSelect={handleGenreSelect}
      />

      <div className={styles.feed}>
        {events.length === 0 && !loading ? (
          <div className={styles.empty}>
            <p>{t('noEvents')}</p>
          </div>
        ) : (
          events.map((event) => (
            <EventCard key={event._id} event={event} />
          ))
        )}

        {loading && (
          <div className={styles.loader}>
            <div className={styles.spinner} />
          </div>
        )}

        {pagination.hasMore && !loading && (
          <button className={styles.loadMore} onClick={handleLoadMore}>
            {t('loadMore')}
          </button>
        )}
      </div>
    </main>
  );
}
