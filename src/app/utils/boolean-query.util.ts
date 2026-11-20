import {AbstractControl, ValidationErrors, ValidatorFn} from '@angular/forms';

export const MAX_BOOLEAN_QUERY_LENGTH = 500;

export interface BooleanQueryValidation {
  valid: boolean;
  error: string | null;
  operatorsUsed: string[];
  hasNesting: boolean;
}

/**
 * Validates a CORE API Boolean search expression without mutating the query.
 * Detects empty strings, unbalanced parentheses/quotes, empty groups, and stray operators.
 */
export function inspectBooleanQuery(rawQuery: string): BooleanQueryValidation {
  const query = rawQuery.trim();

  if (!query) {
    return {
      valid: false,
      error: 'Enter a keyword or Boolean expression to search CORE.',
      operatorsUsed: [],
      hasNesting: false,
    };
  }

  if (query.length > MAX_BOOLEAN_QUERY_LENGTH) {
    return {
      valid: false,
      error: `Query cannot exceed ${MAX_BOOLEAN_QUERY_LENGTH} characters.`,
      operatorsUsed: [],
      hasNesting: false,
    };
  }

  let depth = 0;
  let maxDepth = 0;
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
      if (depth > maxDepth) {
        maxDepth = depth;
      }
    } else if (ch === ')') {
      depth--;
      if (depth < 0) {
        return {
          valid: false,
          error: 'Unmatched closing parenthesis ")". Check your grouping.',
          operatorsUsed: [],
          hasNesting: maxDepth > 0,
        };
      }
    }
  }

  if (inQuotes) {
    return {
      valid: false,
      error: 'Unclosed quotation mark. Close every exact phrase with ".',
      operatorsUsed: [],
      hasNesting: maxDepth > 0,
    };
  }

  if (depth !== 0) {
    return {
      valid: false,
      error: 'Unclosed opening parenthesis "(". Add a matching ")".',
      operatorsUsed: [],
      hasNesting: maxDepth > 0,
    };
  }

  if (/\(\s*\)/.test(query)) {
    return {
      valid: false,
      error: 'Empty parentheses "()" are not allowed.',
      operatorsUsed: [],
      hasNesting: maxDepth > 0,
    };
  }

  const withoutQuotes = query.replace(/"(?:[^"\\]|\\.)*"/g, ' QUOTED_PHRASE ');
  const spaced = withoutQuotes.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ');
  const tokens = spaced.trim().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return {
      valid: false,
      error: 'Enter at least one keyword to search.',
      operatorsUsed: [],
      hasNesting: false,
    };
  }

  const isBinaryOp = (t: string): boolean => t === 'AND' || t === 'OR';
  const operatorsFound = new Set<string>();

  for (const token of tokens) {
    if (token === 'AND' || token === 'OR' || token === 'NOT') {
      operatorsFound.add(token);
    }
  }

  if (isBinaryOp(tokens[0])) {
    return {
      valid: false,
      error: `Query cannot begin with "${tokens[0]}".`,
      operatorsUsed: Array.from(operatorsFound),
      hasNesting: maxDepth > 1,
    };
  }

  const lastToken = tokens[tokens.length - 1];
  if (isBinaryOp(lastToken) || lastToken === 'NOT') {
    return {
      valid: false,
      error: `Query cannot end with "${lastToken}". Add a term after it.`,
      operatorsUsed: Array.from(operatorsFound),
      hasNesting: maxDepth > 1,
    };
  }

  for (let i = 0; i < tokens.length - 1; i++) {
    const curr = tokens[i];
    const next = tokens[i + 1];

    if (isBinaryOp(curr) && isBinaryOp(next)) {
      return {
        valid: false,
        error: `Consecutive operators "${curr} ${next}" are invalid.`,
        operatorsUsed: Array.from(operatorsFound),
        hasNesting: maxDepth > 1,
      };
    }

    if (curr === '(' && isBinaryOp(next)) {
      return {
        valid: false,
        error: `Unexpected "${next}" immediately after "(".`,
        operatorsUsed: Array.from(operatorsFound),
        hasNesting: maxDepth > 1,
      };
    }

    if ((isBinaryOp(curr) || curr === 'NOT') && next === ')') {
      return {
        valid: false,
        error: `Unexpected "${curr}" immediately before ")".`,
        operatorsUsed: Array.from(operatorsFound),
        hasNesting: maxDepth > 1,
      };
    }
  }

  return {
    valid: true,
    error: null,
    operatorsUsed: Array.from(operatorsFound),
    hasNesting: maxDepth > 1,
  };
}

/**
 * Angular Reactive Forms validator for Boolean search queries.
 */
export function booleanQueryValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value : '';
    const result = inspectBooleanQuery(value);
    if (result.valid) {
      return null;
    }
    return {booleanSyntax: result.error};
  };
}
