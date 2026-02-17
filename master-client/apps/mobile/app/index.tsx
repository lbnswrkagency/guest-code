import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EventCard from '../src/components/EventCard';
import { getPublicEvents, type EventData } from '../src/lib/api';
import { colors, spacing } from '../src/theme/tokens';

export default function HomeScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const t = scheme === 'light' ? colors.light : colors.dark;

  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const fetchEvents = useCallback(async (offset = 0) => {
    try {
      const res = await getPublicEvents(20, offset);
      if (offset === 0) {
        setEvents(res.events);
      } else {
        setEvents((prev) => [...prev, ...res.events]);
      }
      setHasMore(res.pagination.hasMore);
    } catch {
      // API unavailable
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents(0);
  };

  const onEndReached = () => {
    if (hasMore && !loading) {
      fetchEvents(events.length);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>
          <Text style={{ color: t.text }}>Guest</Text>
          <Text style={{ color: colors.gold }}>Code</Text>
        </Text>
      </View>

      {loading && events.length === 0 ? (
        <ActivityIndicator
          size="large"
          color={colors.gold}
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <EventCard event={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.gold}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: t.textMuted }]}>
              No upcoming events
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  logo: {
    fontSize: 22,
    fontWeight: '800',
  },
  list: {
    padding: spacing.md,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  empty: {
    textAlign: 'center',
    paddingVertical: 80,
    fontSize: 15,
  },
});
