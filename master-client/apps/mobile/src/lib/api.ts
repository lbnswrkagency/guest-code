import { Platform } from 'react-native';

const API_URL = Platform.OS === 'web'
  ? 'http://localhost:8080/api'
  : 'http://10.0.2.2:8080/api'; // Android emulator localhost

export interface EventData {
  _id: string;
  title: string;
  subTitle?: string;
  startDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  city?: string;
  flyer?: {
    portrait?: { thumbnail?: string; medium?: string; full?: string };
    landscape?: { thumbnail?: string; medium?: string; full?: string };
    square?: { thumbnail?: string; medium?: string; full?: string };
  };
  brand: {
    _id: string;
    name: string;
    username: string;
    logo?: string;
  };
  genres?: { _id: string; name: string }[];
}

interface PublicEventsResponse {
  success: boolean;
  events: EventData[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export async function getPublicEvents(
  limit = 20,
  offset = 0,
  category?: string
): Promise<PublicEventsResponse> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (category) params.set('category', category);

  const res = await fetch(`${API_URL}/events/public?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
