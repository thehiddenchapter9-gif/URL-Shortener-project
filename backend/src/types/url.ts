export interface UrlRecord {
  id: number;
  shortCode: string;
  originalUrl: string;
  clicks: number;
  createdAt: Date;
}

export interface ShortenRequestBody {
  originalUrl: string;
}

export interface ShortenResponseBody {
  shortCode: string;
  shortUrl: string;
}

export interface StatsResponseBody {
  originalUrl: string;
  shortCode: string;
  clicks: number;
  createdAt: string;
}
