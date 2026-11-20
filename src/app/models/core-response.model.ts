export interface CoreRawAuthor {
  name?: string | null;
}

export interface CoreRawJournal {
  title?: string | null;
  identifiers?: (string | null)[] | null;
}

export interface CoreRawLink {
  type?: string | null;
  url?: string | null;
}

export interface CoreRawIdentifier {
  identifier?: string | null;
  type?: string | null;
}

export interface CoreRawLanguage {
  code?: string | null;
  id?: string | null;
  name?: string | null;
}

export interface CoreRawDataProvider {
  id?: number | string | null;
  name?: string | null;
  url?: string | null;
}

/**
 * Reflects the real CORE API v3 Work schema where fields may be null, absent, or variably shaped.
 */
export interface CoreRawWork {
  id?: number | string | null;
  title?: string | null;
  authors?: (CoreRawAuthor | string | null)[] | null;
  abstract?: string | null;
  yearPublished?: number | string | null;
  publishedDate?: string | null;
  createdDate?: string | null;
  doi?: string | null;
  identifiers?: (CoreRawIdentifier | string | null)[] | null;
  publisher?: string | null;
  journals?: (CoreRawJournal | null)[] | null;
  dataProviders?: (CoreRawDataProvider | null)[] | null;
  downloadUrl?: string | null;
  sourceFulltextUrls?: (string | null)[] | null;
  sourceFullTextUrl?: string | null;
  links?: (CoreRawLink | null)[] | null;
  documentType?: string | null;
  language?: CoreRawLanguage | string | null;
}

export interface CoreRateLimitInfo {
  limit: number | null;
  remaining: number | null;
  retryAfter: string | null;
}

export interface CoreProxySearchResponse {
  query: string;
  totalHits: number;
  limit: number;
  offset: number;
  results: CoreRawWork[];
  authenticated: boolean;
  rateLimit: CoreRateLimitInfo;
}

export interface CoreApiErrorPayload {
  code?: string;
  error?: string;
  rateLimit?: CoreRateLimitInfo | null;
}

export interface CoreHealthResponse {
  status: 'ok';
  provider: string;
  apiKeyConfigured: boolean;
}

export interface CoreSearchParams {
  query: string;
  limit: number;
  offset?: number;
}
