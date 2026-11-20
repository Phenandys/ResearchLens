import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {of, Subject, throwError} from 'rxjs';
import {SearchResultsEnvelope} from '../../models/paper.model';
import {CoreApi, CoreSearchError} from '../../services/core-api';
import {DashboardComponent} from './dashboard.component';

describe('DashboardComponent', () => {
  const sampleEnvelope: SearchResultsEnvelope = {
    query: 'drone AND delivery',
    totalHits: 240,
    limit: 20,
    offset: 0,
    authenticated: true,
    rateLimit: {limit: 100, remaining: 99, retryAfter: null},
    papers: [
      {
        id: '1',
        title: 'Older UAV Paper',
        authors: ['Alice Smith'],
        publicationYear: 2020,
        publishedDateRaw: '2020-01-15',
        abstract: 'Study from 2020.',
        doi: '10.1000/old',
        publisherOrJournal: 'Journal A',
        paperUrl: 'https://example.org/1',
        downloadUrl: null,
        documentType: 'Article',
        language: 'English',
      },
      {
        id: '2',
        title: 'Recent Drone Routing Paper',
        authors: ['Bob Lee'],
        publicationYear: 2024,
        publishedDateRaw: '2024-06-10',
        abstract: 'Study from 2024.',
        doi: '10.1000/new',
        publisherOrJournal: 'Journal B',
        paperUrl: 'https://example.org/2',
        downloadUrl: null,
        documentType: 'Article',
        language: 'English',
      },
    ],
  };

  function setup(searchImpl: CoreApi['searchWorks']) {
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        {
          provide: CoreApi,
          useValue: {searchWorks: searchImpl},
        },
      ],
    });
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    return {fixture, component: fixture.componentInstance};
  }

  it('renders search input, result limits selector, and results/visualization placeholders before searching', () => {
    const {fixture, component} = setup(() => of(sampleEnvelope));
    const el: HTMLElement = fixture.nativeElement;

    expect(component.hasSearched()).toBe(false);
    expect(el.querySelector('#boolean-query-input')).toBeTruthy();
    expect(el.querySelector('#result-limit-select')).toBeTruthy();
    expect(el.querySelector('[data-testid="results-region"]')?.textContent).toContain(
      'Research Results Workspace',
    );
    expect(el.querySelector('[data-testid="visualization-region"]')?.textContent).toContain(
      'Publication Year Distribution',
    );
  });

  it('shows loading spinner and skeleton screens while fetching, then populates and supports sorting', () => {
    const response$ = new Subject<SearchResultsEnvelope>();
    const {fixture, component} = setup(() => response$.asObservable());
    const el: HTMLElement = fixture.nativeElement;

    component.onSearchSubmit({query: 'drone AND delivery', limit: 20});
    fixture.detectChanges();

    expect(component.loading()).toBe(true);
    expect(component.hasSearched()).toBe(true);
    expect(el.querySelector('[data-testid="dashboard-loading-indicator"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="results-skeleton"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="chart-skeleton"]')).toBeTruthy();

    response$.next(sampleEnvelope);
    response$.complete();
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(el.querySelector('[data-testid="dashboard-loading-indicator"]')).toBeNull();
    expect(el.querySelector('[data-testid="results-skeleton"]')).toBeNull();
    expect(el.querySelector('[data-testid="chart-skeleton"]')).toBeNull();
    expect(component.visiblePapers().map((p) => p.id)).toEqual(['1', '2']);

    component.onSortChange('year-desc');
    expect(component.visiblePapers().map((p) => p.id)).toEqual(['2', '1']);

    component.onSelectYear(2020);
    expect(component.visiblePapers().map((p) => p.id)).toEqual(['1']);
  });

  it('surfaces API errors clearly in the error state', () => {
    const rateLimitErr = new CoreSearchError(
      'CORE API rate limit exceeded.',
      429,
      'CORE_RATE_LIMITED',
    );
    const {fixture, component} = setup(() => throwError(() => rateLimitErr));

    component.onSearchSubmit({query: 'drone', limit: 10});
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.error()?.status).toBe(429);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('CORE API Rate Limit Reached');
  });

  it('restores initial placeholders when search is cleared', () => {
    const {fixture, component} = setup(() => of(sampleEnvelope));

    component.onSearchSubmit({query: 'drone AND delivery', limit: 20});
    fixture.detectChanges();
    expect(component.retrievedPapers()).toHaveLength(2);

    component.onSearchClear();
    fixture.detectChanges();
    expect(component.hasSearched()).toBe(false);
    expect(component.retrievedPapers()).toHaveLength(0);
    expect(component.activeQuery()).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Research Results Workspace');
  });
});
