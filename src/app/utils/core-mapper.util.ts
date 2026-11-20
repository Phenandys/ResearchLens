import {
  CoreProxySearchResponse,
  CoreRawIdentifier,
  CoreRawWork,
} from '../models/core-response.model';
import {ResearchPaper, SearchResultsEnvelope} from '../models/paper.model';

const MIN_VALID_YEAR = 1600;
const MAX_VALID_YEAR = new Date().getFullYear() + 1;

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const collapsed = value.replace(/\s+/g, ' ').trim();
  return collapsed.length > 0 ? collapsed : null;
}

function isValidHttpUrl(value: string | null): value is string {
  if (!value) {
    return false;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extracts a reliable 4-digit publication year from CORE's yearPublished or publishedDate fields.
 * Rejects impossible or malformed values rather than guessing.
 */
export function extractPublicationYear(work: CoreRawWork): number | null {
  if (work.yearPublished !== null && work.yearPublished !== undefined) {
    const numeric =
      typeof work.yearPublished === 'number'
        ? work.yearPublished
        : Number.parseInt(String(work.yearPublished).trim(), 10);
    if (
      Number.isInteger(numeric) &&
      numeric >= MIN_VALID_YEAR &&
      numeric <= MAX_VALID_YEAR
    ) {
      return numeric;
    }
  }

  const rawDate = cleanText(work.publishedDate);
  if (rawDate) {
    const yearMatch = /^(\d{4})/.exec(rawDate);
    if (yearMatch) {
      const parsedYear = Number.parseInt(yearMatch[1], 10);
      if (parsedYear >= MIN_VALID_YEAR && parsedYear <= MAX_VALID_YEAR) {
        return parsedYear;
      }
    }
    const parsedTimestamp = Date.parse(rawDate);
    if (!Number.isNaN(parsedTimestamp)) {
      const year = new Date(parsedTimestamp).getUTCFullYear();
      if (year >= MIN_VALID_YEAR && year <= MAX_VALID_YEAR) {
        return year;
      }
    }
  }

  return null;
}

function normalizeDoi(rawDoi: string | null): string | null {
  if (!rawDoi) {
    return null;
  }
  const stripped = rawDoi
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .trim();

  if (/^10\.\d{4,9}\/\S+$/i.test(stripped)) {
    return stripped;
  }
  return null;
}

function extractDoi(work: CoreRawWork): string | null {
  const direct = normalizeDoi(cleanText(work.doi));
  if (direct) {
    return direct;
  }

  if (Array.isArray(work.identifiers)) {
    for (const item of work.identifiers) {
      if (typeof item === 'string') {
        const candidate = normalizeDoi(item);
        if (candidate) {
          return candidate;
        }
      } else if (item && typeof item === 'object') {
        const typedItem = item as CoreRawIdentifier;
        const candidate = normalizeDoi(cleanText(typedItem.identifier));
        if (candidate) {
          return candidate;
        }
      }
    }
  }

  return null;
}

function extractAuthors(work: CoreRawWork): string[] {
  if (!Array.isArray(work.authors)) {
    return [];
  }

  const seen = new Set<string>();
  const names: string[] = [];

  for (const author of work.authors) {
    let rawName: string | null = null;
    if (typeof author === 'string') {
      rawName = cleanText(author);
    } else if (author && typeof author === 'object') {
      rawName = cleanText(author.name);
    }

    if (rawName && !seen.has(rawName.toLowerCase())) {
      seen.add(rawName.toLowerCase());
      names.push(rawName);
    }
  }

  return names;
}

function extractPublisherOrJournal(work: CoreRawWork): string | null {
  if (Array.isArray(work.journals)) {
    for (const journal of work.journals) {
      const title = cleanText(journal?.title);
      if (title) {
        return title;
      }
    }
  }

  const publisher = cleanText(work.publisher);
  if (publisher) {
    return publisher;
  }

  if (Array.isArray(work.dataProviders)) {
    for (const provider of work.dataProviders) {
      const name = cleanText(provider?.name);
      if (name) {
        return name;
      }
    }
  }

  return null;
}

function extractUrls(
  work: CoreRawWork,
  doi: string | null,
): {paperUrl: string | null; downloadUrl: string | null} {
  const downloadCandidate = cleanText(work.downloadUrl);
  const downloadUrl = isValidHttpUrl(downloadCandidate) ? downloadCandidate : null;

  const candidates: (string | null)[] = [];

  if (Array.isArray(work.sourceFulltextUrls)) {
    for (const url of work.sourceFulltextUrls) {
      candidates.push(cleanText(url));
    }
  }

  candidates.push(cleanText(work.sourceFullTextUrl));

  if (Array.isArray(work.links)) {
    for (const link of work.links) {
      if (link?.type === 'display' || link?.type === 'reader' || link?.type === 'download') {
        candidates.push(cleanText(link.url));
      }
    }
    for (const link of work.links) {
      candidates.push(cleanText(link?.url));
    }
  }

  candidates.push(downloadUrl);

  if (doi) {
    candidates.push(`https://doi.org/${encodeURIComponent(doi).replace(/%2F/gi, '/')}`);
  }

  if (work.id !== null && work.id !== undefined && String(work.id).trim().length > 0) {
    candidates.push(`https://core.ac.uk/works/${encodeURIComponent(String(work.id).trim())}`);
  }

  const paperUrl = candidates.find((candidate): candidate is string => isValidHttpUrl(candidate)) ?? null;

  return {paperUrl, downloadUrl};
}

function formatDocumentType(rawType: string | null): string | null {
  if (!rawType) {
    return null;
  }
  const normalized = rawType.replace(/[_-]+/g, ' ').trim();
  if (!normalized) {
    return null;
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

function extractLanguage(work: CoreRawWork): string | null {
  if (typeof work.language === 'string') {
    return cleanText(work.language);
  }
  if (work.language && typeof work.language === 'object') {
    return cleanText(work.language.name) ?? cleanText(work.language.code);
  }
  return null;
}

/**
 * Maps a single raw CORE API v3 work record into a normalized ResearchPaper.
 * Never fabricates missing metadata; unavailable fields remain null or empty arrays.
 */
export function mapCoreWorkToPaper(work: CoreRawWork, index: number): ResearchPaper {
  const id =
    work.id !== null && work.id !== undefined && String(work.id).trim().length > 0
      ? String(work.id).trim()
      : `core-work-${index}`;

  const title = cleanText(work.title) ?? 'Untitled research work';
  const doi = extractDoi(work);
  const {paperUrl, downloadUrl} = extractUrls(work, doi);

  return {
    id,
    title,
    authors: extractAuthors(work),
    publicationYear: extractPublicationYear(work),
    publishedDateRaw: cleanText(work.publishedDate),
    abstract: cleanText(work.abstract),
    doi,
    publisherOrJournal: extractPublisherOrJournal(work),
    paperUrl,
    downloadUrl,
    documentType: formatDocumentType(cleanText(work.documentType)),
    language: extractLanguage(work),
  };
}

export function mapCoreSearchResponse(
  response: CoreProxySearchResponse,
): SearchResultsEnvelope {
  const rawResults = Array.isArray(response.results) ? response.results : [];
  const papers = rawResults.map((work, idx) => mapCoreWorkToPaper(work, idx));

  return {
    query: response.query,
    totalHits: Number.isFinite(response.totalHits) ? response.totalHits : papers.length,
    limit: response.limit,
    offset: response.offset,
    papers,
    authenticated: Boolean(response.authenticated),
    rateLimit: response.rateLimit ?? {limit: null, remaining: null, retryAfter: null},
  };
}
