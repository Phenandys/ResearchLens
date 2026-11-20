import {HttpClient, HttpErrorResponse, HttpParams} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {catchError, map, Observable, throwError} from 'rxjs';
import {
  CoreApiErrorPayload,
  CoreHealthResponse,
  CoreProxySearchResponse,
  CoreRateLimitInfo,
  CoreSearchParams,
} from '../models/core-response.model';
import {SearchResultsEnvelope} from '../models/paper.model';
import {mapCoreSearchResponse} from '../utils/core-mapper.util';

export class CoreSearchError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly rateLimit: CoreRateLimitInfo | null = null,
  ) {
    super(message);
    this.name = 'CoreSearchError';
  }
}

@Injectable({providedIn: 'root'})
export class CoreApi {
  private readonly http = inject(HttpClient);
  private readonly baseEndpoint = '/api/core';

  /**
   * Sends a GET request to the Express CORE proxy, preserving the Boolean expression verbatim.
   */
  searchWorks(params: CoreSearchParams): Observable<SearchResultsEnvelope> {
    const trimmedQuery = params.query.trim();
    const limit = Math.max(1, Math.min(100, Math.trunc(params.limit)));
    const offset = Math.max(0, Math.trunc(params.offset ?? 0));

    const httpParams = new HttpParams()
      .set('q', trimmedQuery)
      .set('limit', String(limit))
      .set('offset', String(offset));

    return this.http
      .get<CoreProxySearchResponse>(`${this.baseEndpoint}/search`, {
        params: httpParams,
      })
      .pipe(
        map((response) => mapCoreSearchResponse(response)),
        catchError((error: unknown) => throwError(() => this.normalizeError(error))),
      );
  }

  checkHealth(): Observable<CoreHealthResponse> {
    return this.http.get<CoreHealthResponse>(`${this.baseEndpoint}/health`);
  }

  private normalizeError(error: unknown): CoreSearchError {
    if (error instanceof CoreSearchError) {
      return error;
    }

    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return new CoreSearchError(
          'Unable to connect to the ResearchLens API server. Ensure the backend is running and check your network connection.',
          0,
          'NETWORK_ERROR',
        );
      }

      const payload = (error.error && typeof error.error === 'object'
        ? error.error
        : {}) as CoreApiErrorPayload;

      const message =
        payload.error ||
        this.fallbackMessageForStatus(error.status);

      return new CoreSearchError(
        message,
        error.status,
        payload.code ?? `HTTP_${error.status}`,
        payload.rateLimit ?? null,
      );
    }

    return new CoreSearchError(
      'An unexpected error occurred while retrieving research papers.',
      500,
      'UNKNOWN_ERROR',
    );
  }

  private fallbackMessageForStatus(status: number): string {
    switch (status) {
      case 400:
        return 'Invalid search query or result limit. Verify your Boolean syntax and try again.';
      case 401:
      case 403:
        return 'Authentication with the CORE API failed. Check CORE_API_KEY configuration on the server.';
      case 429:
        return 'CORE API rate limit reached. Wait briefly or configure a CORE_API_KEY in the backend environment.';
      case 504:
        return 'The CORE API request timed out. Try a more specific Boolean expression.';
      default:
        return 'The CORE API service is temporarily unavailable. Please try again shortly.';
    }
  }
}
