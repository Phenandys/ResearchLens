import {CoreRateLimitInfo} from './core-response.model';

export interface ResearchPaper {
  id: string;
  title: string;
  authors: string[];
  publicationYear: number | null;
  publishedDateRaw: string | null;
  abstract: string | null;
  doi: string | null;
  publisherOrJournal: string | null;
  paperUrl: string | null;
  downloadUrl: string | null;
  documentType: string | null;
  language: string | null;
}

export interface SearchResultsEnvelope {
  query: string;
  totalHits: number;
  limit: number;
  offset: number;
  papers: ResearchPaper[];
  authenticated: boolean;
  rateLimit: CoreRateLimitInfo;
}

export interface PublicationYearBucket {
  year: number;
  count: number;
}

export interface PublicationAggregation {
  buckets: PublicationYearBucket[];
  datedCount: number;
  undatedCount: number;
  totalRetrieved: number;
  minYear: number | null;
  maxYear: number | null;
  peakYear: PublicationYearBucket | null;
}

export type SortOption = 'relevance' | 'year-desc' | 'year-asc';

export interface SearchHistoryEntry {
  query: string;
  limit: number;
  timestamp: number;
}

export interface ExampleBooleanQuery {
  label: string;
  query: string;
  description: string;
}

export const EXAMPLE_BOOLEAN_QUERIES: readonly ExampleBooleanQuery[] = [
  {
    label: 'Single keyword',
    query: 'drone',
    description: 'Broad search for unmanned aerial vehicle research',
  },
  {
    label: 'AND conjunction',
    query: 'drone AND delivery',
    description: 'Papers matching both drone and delivery concepts',
  },
  {
    label: 'Nested Boolean',
    query: '(drone AND (package OR delivery))',
    description: 'Grouped OR clause nested inside an AND expression',
  },
  {
    label: 'Multi-term clinical',
    query: '(artificial intelligence OR machine learning) AND healthcare',
    description: 'Combines two synonyms with a domain constraint',
  },
];

export const RESULT_LIMIT_OPTIONS: readonly number[] = [10, 20, 50, 100];
