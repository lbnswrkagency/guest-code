import { getPublicEvents, getCategories, type EventData } from '@/lib/api';
import Header from '@/components/Header/Header';
import EventFeed from './EventFeed';

export default async function HomePage() {
  let initialEvents: { events: EventData[]; pagination: { total: number; limit: number; offset: number; hasMore: boolean } } = {
    events: [],
    pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
  };
  let categories: { _id: string; name: string; color?: string }[] = [];

  try {
    const [eventsRes, catsRes] = await Promise.all([
      getPublicEvents(20, 0),
      getCategories(),
    ]);
    initialEvents = { events: eventsRes.events, pagination: eventsRes.pagination };
    categories = catsRes.categories || [];
  } catch {
    // API unavailable - render with empty state
  }

  return (
    <>
      <Header />
      <EventFeed
        initialEvents={initialEvents.events}
        initialPagination={initialEvents.pagination}
        categories={categories}
      />
    </>
  );
}
