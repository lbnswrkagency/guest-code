export interface Brand {
  _id: string;
  name: string;
  username: string;
  logo?: string;
  colors?: {
    primary?: string;
  };
  description?: string;
  isVerified?: boolean;
  isFeatured?: boolean;
}

export interface Genre {
  _id: string;
  name: string;
  color?: string;
}

export interface Lineup {
  _id: string;
  name: string;
  avatar?: string;
  category?: string;
}

export interface FlyerFormat {
  thumbnail?: string;
  medium?: string;
  full?: string;
  timestamp?: number;
}

export interface Event {
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
  street?: string;
  postalCode?: string;
  flyer?: {
    portrait?: FlyerFormat;
    landscape?: FlyerFormat;
    square?: FlyerFormat;
  };
  brand: Brand;
  genres?: Genre[];
  lineups?: Lineup[];
  isLive?: boolean;
  isWeekly?: boolean;
  slug?: string;
  link?: string;
}

export interface PublicEventsResponse {
  success: boolean;
  events: Event[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
