export interface AnimeItem {
  title: string;
  slug: string;
  seriesSlug: string;
  poster: string;
  episode: string;
  type: string;
  isEpisode: boolean;
}

export interface Pagination {
  hasNext: boolean;
  hasPrev: boolean;
  currentPage: number;
}

export interface AnimeListResult {
  items: AnimeItem[];
  pagination: Pagination;
}

export interface Episode {
  title: string;
  slug: string;
  number: number;
  date?: string;
}

export interface AnimeDetail {
  title: string;
  seriesSlug: string;
  poster: string;
  synopsis: string;
  status: string;
  type: string;
  studio?: string;
  season?: string;
  released?: string;
  duration?: string;
  totalEpisode?: string;
  score?: string;
  batchUrl?: string;
  genres: string[];
  episodes: Episode[];
  recommendations: AnimeItem[];
}

export interface Genre {
  title: string;
  slug: string;
}

export interface ScheduleDay {
  day: string;
  items: AnimeItem[];
}

export interface StreamSource {
  name: string;
  url: string;
}

export interface DownloadLink {
  host: string;
  quality: string;
  url: string;
}

export interface EpisodeDetail {
  title: string;
  animeSlug: string;
  streams: StreamSource[];
  downloads: DownloadLink[];
}