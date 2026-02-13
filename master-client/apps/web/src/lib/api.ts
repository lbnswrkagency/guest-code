const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number>;
}

async function fetchAPI<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOpts } = options;

  let url = `${API_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.set(key, String(value));
    });
    url += `?${searchParams.toString()}`;
  }

  const res = await fetch(url, {
    ...fetchOpts,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOpts.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export interface PublicEventsResponse {
  success: boolean;
  events: EventData[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface EventData {
  _id: string;
  title: string;
  subTitle?: string;
  description?: string;
  startDate: string;
  endDate?: string;
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
    colors?: { primary?: string };
  };
  genres?: { _id: string; name: string; color?: string }[];
  lineups?: { _id: string; name: string; avatar?: string }[];
  slug?: string;
  link?: string;
}

export interface CategoriesResponse {
  success: boolean;
  categories: { _id: string; name: string; color?: string }[];
}

export async function getPublicEvents(
  limit = 20,
  offset = 0,
  category?: string,
  location?: string
): Promise<PublicEventsResponse> {
  const params: Record<string, string | number> = { limit, offset };
  if (category && category !== 'all') params.category = category;
  if (location) params.location = location;

  return fetchAPI<PublicEventsResponse>('/events/public', {
    params,
    next: { revalidate: 60 },
  });
}

export async function getCategories(): Promise<CategoriesResponse> {
  return fetchAPI<CategoriesResponse>('/events/public/categories', {
    next: { revalidate: 300 },
  });
}
