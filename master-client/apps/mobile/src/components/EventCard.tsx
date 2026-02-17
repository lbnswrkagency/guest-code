import {
  View,
  Text,
  Image,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { colors, spacing, fontSize } from '../theme/tokens';
import type { EventData } from '../lib/api';

function getFlyerUrl(event: EventData): string | null {
  const flyer = event.flyer;
  if (!flyer) return null;
  const format = flyer.portrait || flyer.landscape || flyer.square;
  if (!format) return null;
  return format.medium || format.full || format.thumbnail || null;
}

function formatDay(dateStr: string): string {
  return String(new Date(dateStr).getDate()).padStart(2, '0');
}

function formatMonth(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}

export default function EventCard({ event }: { event: EventData }) {
  const scheme = useColorScheme() ?? 'dark';
  const t = scheme === 'light' ? colors.light : colors.dark;
  const flyerUrl = getFlyerUrl(event);

  const timeRange = event.startTime
    ? `${event.startTime.slice(0, 5)}${event.endTime ? ` - ${event.endTime.slice(0, 5)}` : ''}`
    : null;

  return (
    <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
      {/* Flyer */}
      <View style={styles.flyerWrap}>
        {flyerUrl ? (
          <Image source={{ uri: flyerUrl }} style={styles.flyerImg} />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: t.bgSurface }]}>
            <Text style={[styles.placeholderText, { color: t.textMuted }]}>
              {event.brand?.name?.[0] || 'G'}
            </Text>
          </View>
        )}
        <View style={styles.dateBadge}>
          <Text style={styles.dateDay}>{formatDay(event.startDate)}</Text>
          <Text style={styles.dateMonth}>{formatMonth(event.startDate)}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.title, { color: t.text }]}>{event.title}</Text>
        {event.subTitle ? (
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>{event.subTitle}</Text>
        ) : null}
        {timeRange ? (
          <Text style={styles.time}>{timeRange}</Text>
        ) : null}
        {event.location ? (
          <Text style={[styles.location, { color: t.textMuted }]}>
            📍 {event.location}{event.city ? `, ${event.city}` : ''}
          </Text>
        ) : null}

        {event.genres && event.genres.length > 0 && (
          <View style={styles.genres}>
            {event.genres.map((g) => (
              <View key={g._id} style={[styles.genreTag, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
                <Text style={[styles.genreText, { color: t.textSecondary }]}>{g.name}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: t.border }]} />

        <View style={styles.brandRow}>
          {event.brand?.logo ? (
            <Image source={{ uri: event.brand.logo }} style={styles.brandLogo} />
          ) : (
            <View style={[styles.brandLogoPlaceholder, { backgroundColor: t.bgSurface }]}>
              <Text style={{ color: t.textMuted, fontSize: 12, fontWeight: '700' }}>
                {event.brand?.name?.[0] || '?'}
              </Text>
            </View>
          )}
          <Text style={[styles.brandName, { color: t.textSecondary }]}>{event.brand?.name}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  flyerWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#1a1a1a',
  },
  flyerImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 64,
    fontWeight: '800',
    opacity: 0.3,
  },
  dateBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: colors.gold,
    minWidth: 44,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
    textTransform: 'uppercase',
  },
  info: {
    padding: spacing.md,
    gap: 6,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: fontSize.sm,
  },
  time: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gold,
  },
  location: {
    fontSize: 13,
  },
  genres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  genreTag: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  genreText: {
    fontSize: 11,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  brandLogoPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 13,
    fontWeight: '500',
  },
});
