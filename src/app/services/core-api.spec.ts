import {provideHttpClient} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {CoreProxySearchResponse} from '../models/core-response.model';
import {CoreApi, CoreSearchError} from './core-api';

describe('CoreApi', () => {
  let service: CoreApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CoreApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sends GET /api/core/search preserving exact Boolean query, limit, and offset', () => {
    const expression = '(drone AND (package OR delivery))';
    const mockResponse: CoreProxySearchResponse = {
      query: expression,
      totalHits: 342,
      limit: 50,
      offset: 20,
      authenticated: true,
      rateLimit: {limit: 100, remaining: 95, retryAfter: null},
      results: [
        {
          id: 101,
          title: 'Last-Mile Autonomous Drone Delivery',
          authors: [{name: 'A. Patel'}],
          yearPublished: 2024,
          doi: '10.1000/drone.2024',
        },
      ],
    };

    let receivedTitle = '';
    let receivedHits = 0;

    service.searchWorks({query: expression, limit: 50, offset: 20}).subscribe((res) => {
      receivedTitle = res.papers[0].title;
      receivedHits = res.totalHits;
    });

    const req = httpMock.expectOne((request) => request.url === '/api/core/search');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe(expression);
    expect(req.request.params.get('limit')).toBe('50');
    expect(req.request.params.get('offset')).toBe('20');

    req.flush(mockResponse);

    expect(receivedTitle).toBe('Last-Mile Autonomous Drone Delivery');
    expect(receivedHits).toBe(342);
  });

  it('normalizes HTTP 429 rate-limit responses into CoreSearchError', () => {
    let caughtError: CoreSearchError | null = null;

    service.searchWorks({query: 'drone', limit: 20}).subscribe({
      error: (err: CoreSearchError) => {
        caughtError = err;
      },
    });

    const req = httpMock.expectOne((request) => request.url === '/api/core/search');
    req.flush(
      {
        code: 'CORE_RATE_LIMITED',
        error: 'CORE API rate limit exceeded.',
        rateLimit: {limit: 10, remaining: 0, retryAfter: '2026-11-20T12:46:53+0000'},
      },
      {status: 429, statusText: 'Too Many Requests'},
    );

    expect(caughtError).toBeInstanceOf(CoreSearchError);
    expect(caughtError!.status).toBe(429);
    expect(caughtError!.code).toBe('CORE_RATE_LIMITED');
    expect(caughtError!.rateLimit?.remaining).toBe(0);
  });

  it('normalizes network failures cleanly', () => {
    let caughtError: CoreSearchError | null = null;

    service.searchWorks({query: 'drone', limit: 10}).subscribe({
      error: (err: CoreSearchError) => {
        caughtError = err;
      },
    });

    const req = httpMock.expectOne((request) => request.url === '/api/core/search');
    req.error(new ProgressEvent('error'));

    expect(caughtError).toBeInstanceOf(CoreSearchError);
    expect(caughtError!.status).toBe(0);
    expect(caughtError!.code).toBe('NETWORK_ERROR');
  });
});
