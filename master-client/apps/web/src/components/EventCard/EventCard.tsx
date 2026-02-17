'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { EventData } from '@/lib/api';
import styles from './EventCard.module.scss';

interface EventCardProps {
  event: EventData;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  };
  return date.toLocaleDateString('en-US', options).toUpperCase();
}

function formatDay(dateStr: string): string {
  const date = new Date(dateStr);
  return String(date.getDate()).padStart(2, '0');
}

function formatMonth(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}

function formatTimeRange(startTime?: string, endTime?: string): string | null {
  if (!startTime) return null;
  const parts = [startTime.slice(0, 5)];
  if (endTime) parts.push(endTime.slice(0, 5));
  return parts.join(' - ');
}

function getFlyerUrl(event: EventData): string | null {
  const flyer = event.flyer;
  if (!flyer) return null;
  // Priority: portrait > landscape > square, quality: medium > full > thumbnail
  const format = flyer.portrait || flyer.landscape || flyer.square;
  if (!format) return null;
  return format.medium || format.full || format.thumbnail || null;
}

export default function EventCard({ event }: EventCardProps) {
  const t = useTranslations('event');
  const flyerUrl = getFlyerUrl(event);
  const timeRange = formatTimeRange(event.startTime, event.endTime);

  return (
    <article className={styles.card}>
      {/* Flyer image */}
      <div className={styles.flyerWrap}>
        {flyerUrl ? (
          <Image
            src={flyerUrl}
            alt={event.title}
            fill
            sizes="(max-width: 600px) 100vw, 600px"
            className={styles.flyerImg}
          />
        ) : (
          <div className={styles.flyerPlaceholder}>
            <span className={styles.placeholderText}>
              {event.brand?.name?.[0] || 'G'}
            </span>
          </div>
        )}

        {/* Date badge */}
        <div className={styles.dateBadge}>
          <span className={styles.dateDay}>{formatDay(event.startDate)}</span>
          <span className={styles.dateMonth}>{formatMonth(event.startDate)}</span>
        </div>
      </div>

      {/* Event info */}
      <div className={styles.info}>
        <h3 className={styles.title}>{event.title}</h3>

        {event.subTitle && (
          <p className={styles.subtitle}>{event.subTitle}</p>
        )}

        {timeRange && (
          <span className={styles.time}>{timeRange}</span>
        )}

        {event.location && (
          <div className={styles.location}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{event.location}{event.city ? `, ${event.city}` : ''}</span>
          </div>
        )}

        {/* Genre tags */}
        {event.genres && event.genres.length > 0 && (
          <div className={styles.genres}>
            {event.genres.map((genre) => (
              <span key={genre._id} className={styles.genreTag}>
                {genre.name}
              </span>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className={styles.divider} />

        {/* Brand footer */}
        <div className={styles.brandRow}>
          {event.brand?.logo?.thumbnail ? (
            <Image
              src={event.brand.logo.thumbnail}
              alt={event.brand.name}
              width={28}
              height={28}
              className={styles.brandLogo}
            />
          ) : (
            <div className={styles.brandLogoPlaceholder}>
              {event.brand?.name?.[0] || '?'}
            </div>
          )}
          <span className={styles.brandName}>{event.brand?.name}</span>
        </div>
      </div>
    </article>
  );
}
