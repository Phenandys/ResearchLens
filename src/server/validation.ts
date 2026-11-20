export interface ValidatedSearchQuery {
  q: string;
  limit: number;
  offset: number;
}

export interface ValidationResult {
  valid: boolean;
  data?: ValidatedSearchQuery;
  error?: string;
  code?: string;
}

export const MIN_LIMIT = 1;
export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 20;
export const MAX_OFFSET = 10000;
export const MAX_QUERY_LENGTH = 500;

/**
 * Validates Boolean search syntax without altering or rewriting the user's expression.
 * Checks balanced parentheses, unmatched quotes, and malformed binary operator positions.
 */
export function validateBooleanExpression(rawQuery: string): string | null {
  const query = rawQuery.trim();

  if (!query) {
    return 'Please enter a search term or Boolean expression.';
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return `Search query cannot exceed ${MAX_QUERY_LENGTH} characters.`;
  }

  // Track quotes and parentheses balance outside of quoted string literals.
  let depth = 0;
  let inQuotes = false;

  for (let i = 0; i < query.length; i++) {
    const ch = query[i];
    const prev = i > 0 ? query[i - 1] : '';

    if (ch === '"' && prev !== '\\') {
      inQuotes = !inQuotes;
      continue;
    }

    if (inQuotes) {
      continue;
    }

    if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth < 0) {
        return 'Unmatched closing parenthesis ")" found in your Boolean expression.';
      }
    }
  }

  if (inQuotes) {
    return 'Unclosed quotation mark found. Close every quoted phrase with a matching ".';
  }

  if (depth !== 0) {
    return 'Unclosed opening parenthesis "(" found. Balance all parentheses before searching.';
  }

  if (/\(\s*\)/.test(query)) {
    return 'Empty parentheses "()" are not valid. Include terms inside parentheses.';
  }

  // Strip quoted phrases to inspect standalone Boolean operators cleanly.
  const withoutQuotes = query.replace(/"(?:[^"\\]|\\.)*"/g, ' QUOTED_PHRASE ');
  const spaced = withoutQuotes.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ');
  const tokens = spaced.trim().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return 'Please enter at least one search keyword.';
  }

  const isBinaryOp = (token: string): boolean => token === 'AND' || token === 'OR';

  if (isBinaryOp(tokens[0])) {
    return `Boolean expression cannot start with "${tokens[0]}".`;
  }

  if (isBinaryOp(tokens[tokens.length - 1]) || tokens[tokens.length - 1] === 'NOT') {
    return `Boolean expression cannot end with "${tokens[tokens.length - 1]}".`;
  }

  for (let i = 0; i < tokens.length - 1; i++) {
    const curr = tokens[i];
    const next = tokens[i + 1];

    if (isBinaryOp(curr) && isBinaryOp(next)) {
      return `Consecutive Boolean operators "${curr} ${next}" are not allowed.`;
    }

    if (curr === '(' && isBinaryOp(next)) {
      return `Unexpected "${next}" immediately after "(".`;
    }

    if ((isBinaryOp(curr) || curr === 'NOT') && next === ')') {
      return `Unexpected "${curr}" immediately before ")".`;
    }
  }

  return null;
}

/**
 * Validates and parses query string parameters for GET /api/core/search.
 */
export function validateSearchParams(rawParams: {
  q?: unknown;
  limit?: unknown;
  offset?: unknown;
}): ValidationResult {
  if (typeof rawParams.q !== 'string') {
    return {
      valid: false,
      code: 'INVALID_QUERY',
      error: 'Query parameter "q" is required and must be a string.',
    };
  }

  const trimmedQuery = rawParams.q.trim();
  const syntaxError = validateBooleanExpression(trimmedQuery);
  if (syntaxError) {
    return {
      valid: false,
      code: 'INVALID_BOOLEAN_QUERY',
      error: syntaxError,
    };
  }

  let limit = DEFAULT_LIMIT;
  if (rawParams.limit !== undefined && rawParams.limit !== '') {
    const parsedLimit = Number(rawParams.limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < MIN_LIMIT || parsedLimit > MAX_LIMIT) {
      return {
        valid: false,
        code: 'INVALID_LIMIT',
        error: `Parameter "limit" must be an integer between ${MIN_LIMIT} and ${MAX_LIMIT}.`,
      };
    }
    limit = parsedLimit;
  }

  let offset = 0;
  if (rawParams.offset !== undefined && rawParams.offset !== '') {
    const parsedOffset = Number(rawParams.offset);
    if (!Number.isInteger(parsedOffset) || parsedOffset < 0 || parsedOffset > MAX_OFFSET) {
      return {
        valid: false,
        code: 'INVALID_OFFSET',
        error: `Parameter "offset" must be an integer between 0 and ${MAX_OFFSET}.`,
      };
    }
    offset = parsedOffset;
  }

  return {
    valid: true,
    data: {
      q: trimmedQuery,
      limit,
      offset,
    },
  };
}
