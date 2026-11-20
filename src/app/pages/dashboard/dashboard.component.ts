import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {catchError, EMPTY, Subject, switchMap, tap} from 'rxjs';
import {BooleanGuide} from '../../components/boolean-guide/boolean-guide';
import {Navbar} from '../../components/navbar/navbar';
import {PublicationChart} from '../../components/publication-chart/publication-chart';
import {ResultsList} from '../../components/results-list/results-list';
import {
  SearchBar,
  SearchSubmitEvent,
} from '../../components/search-bar/search-bar';
import {
  RESULT_LIMIT_OPTIONS,
  SearchResultsEnvelope,
  SortOption,
} from '../../models/paper.model';
import {CoreApi, CoreSearchError} from '../../services/core-api';
import {SearchHistory} from '../../services/search-history';
import {inspectBooleanQuery} from '../../utils/boolean-query.util';
import {triggerCsvDownload} from '../../utils/csv-export.util';
import {aggregatePapersByYear} from '../../utils/publication-aggregation.util';

interface SearchRequest {
  query: string;
  limit: number;
  offset: number;
  updateUrl: boolean;
}

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    Navbar,
    SearchBar,
    ResultsList,
    PublicationChart,
    BooleanGuide,
  ],
  template: `
    <div class="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <app-navbar
        [canExport]="exportablePapers().length > 0"
        (exportCsv)="onExportCsv()"
      />

      <!-- Search input & result-limit controls -->
      <app-search-bar
        [initialQuery]="activeQuery()"
        [initialLimit]="activeLimit()"
        [loading]="loading()"
        [history]="searchHistory.entries()"
        (searchSubmit)="onSearchSubmit($event)"
        (searchClear)="onSearchClear()"
        (clearHistory)="searchHistory.clear()"
      />

      <!-- Responsive 12-column workspace: Results list + Visualization rail -->
      <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <!-- Primary Results Region -->
          <div class="lg:col-span-8" data-testid="results-region">
            @if (!hasSearched()) {
              <!-- Structured Results List Placeholder prior to first search -->
              <section
                id="results-section"
                aria-labelledby="results-placeholder-heading"
                class="rounded-xl border border-dashed border-slate-300 bg-white p-6 sm:p-8"
              >
                <div class="flex items-start gap-4">
                  <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-blue-700">
                    <mat-icon class="!h-6 !w-6 !text-[24px]" aria-hidden="true">article</mat-icon>
                  </div>
                  <div class="min-w-0 flex-1">
                    <h2
                      id="results-placeholder-heading"
                      class="text-base font-semibold text-slate-950 sm:text-lg"
                    >
                      Research Results Workspace
                    </h2>
                    <p class="mt-1.5 text-sm leading-relaxed text-slate-600">
                      Matching scientific papers retrieved from the CORE API will appear here
                      with titles, authors, publication years, abstracts, DOIs, publishers,
                      and direct source links.
                    </p>
                  </div>
                </div>

                <!-- Structural preview slots -->
                <div class="mt-6 space-y-3" aria-hidden="true">
                  <div class="rounded-lg border border-slate-200/80 bg-slate-50/70 p-4">
                    <div class="flex items-center gap-2 text-xs text-slate-400">
                      <span class="h-2.5 w-12 rounded bg-slate-200"></span>
                      <span>·</span>
                      <span class="h-2.5 w-32 rounded bg-slate-200"></span>
                    </div>
                    <div class="mt-2.5 h-4 w-3/4 rounded bg-slate-200/90"></div>
                    <div class="mt-2 h-3 w-1/2 rounded bg-slate-200/70"></div>
                    <div class="mt-3 h-3 w-full rounded bg-slate-100"></div>
                  </div>
                  <div class="rounded-lg border border-slate-200/80 bg-slate-50/50 p-4">
                    <div class="flex items-center gap-2 text-xs text-slate-400">
                      <span class="h-2.5 w-12 rounded bg-slate-200"></span>
                      <span>·</span>
                      <span class="h-2.5 w-28 rounded bg-slate-200"></span>
                    </div>
                    <div class="mt-2.5 h-4 w-2/3 rounded bg-slate-200/80"></div>
                    <div class="mt-2 h-3 w-2/5 rounded bg-slate-200/60"></div>
                  </div>
                </div>

                <dl class="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 text-xs sm:grid-cols-3">
                  <div>
                    <dt class="font-semibold text-slate-900">Boolean Preservation</dt>
                    <dd class="mt-1 text-slate-600">
                      Expressions using AND, OR, NOT, and parentheses are sent verbatim to CORE.
                    </dd>
                  </div>
                  <div>
                    <dt class="font-semibold text-slate-900">Configurable Limits</dt>
                    <dd class="mt-1 text-slate-600">
                      Retrieve 10, 20, 50, or 100 works per request and paginate through matches.
                    </dd>
                  </div>
                  <div>
                    <dt class="font-semibold text-slate-900">Verifiable Metadata</dt>
                    <dd class="mt-1 text-slate-600">
                      Unavailable fields show explicit fallbacks with zero fabricated data.
                    </dd>
                  </div>
                </dl>
              </section>
            } @else {
              <app-results-list
                [papers]="visiblePapers()"
                [totalRetrieved]="retrievedPapers().length"
                [totalHits]="totalHits()"
                [limit]="activeLimit()"
                [offset]="activeOffset()"
                [activeQuery]="activeQuery()"
                [loading]="loading()"
                [hasSearched]="hasSearched()"
                [error]="error()"
                [sortBy]="sortBy()"
                [selectedYear]="selectedYear()"
                (sortChange)="onSortChange($event)"
                (pageChange)="onPageChange($event)"
                (retrySearch)="onRetrySearch()"
                (clearYearFilter)="onSelectYear(null)"
              />
            }
          </div>

          <!-- Secondary Visualization & Syntax Reference Rail -->
          <aside class="space-y-6 lg:sticky lg:top-22 lg:col-span-4" data-testid="visualization-region">
            @if (!hasSearched()) {
              <!-- Structured Publication-Year Visualization Placeholder -->
              <section
                id="distribution-section"
                aria-labelledby="visualization-placeholder-heading"
                class="rounded-xl border border-dashed border-slate-300 bg-white p-5 sm:p-6"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <h2
                      id="visualization-placeholder-heading"
                      class="text-base font-semibold text-slate-950"
                    >
                      Publication Year Distribution
                    </h2>
                    <p class="mt-0.5 text-xs text-slate-500">
                      Interactive Chart.js visualization area
                    </p>
                  </div>
                  <mat-icon class="!h-5 !w-5 !text-[20px] text-slate-400" aria-hidden="true">
                    bar_chart
                  </mat-icon>
                </div>

                <div
                  class="mt-5 flex h-52 flex-col items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50/70 px-5 text-center"
                >
                  <div class="flex items-end gap-2.5" aria-hidden="true">
                    <span class="h-8 w-4 rounded-t bg-slate-200"></span>
                    <span class="h-14 w-4 rounded-t bg-slate-200"></span>
                    <span class="h-20 w-4 rounded-t bg-blue-200"></span>
                    <span class="h-12 w-4 rounded-t bg-slate-200"></span>
                    <span class="h-16 w-4 rounded-t bg-slate-200"></span>
                  </div>
                  <p class="mt-4 text-sm font-medium text-slate-700">
                    Waiting for a search query
                  </p>
                  <p class="mt-1 text-xs leading-relaxed text-slate-500">
                    Submit a Boolean expression to group retrieved papers by publication year
                    and filter results by clicking any bar.
                  </p>
                </div>
              </section>
            } @else {
              <app-publication-chart
                [aggregation]="yearAggregation()"
                [totalHits]="totalHits()"
                [loading]="loading()"
                [hasSearched]="hasSearched()"
                [selectedYear]="selectedYear()"
                (yearSelected)="onSelectYear($event)"
              />
            }

            <app-boolean-guide (tryQuery)="onGuideQuery($event)" />
          </aside>
        </div>
      </main>

      <footer class="border-t border-slate-200 bg-white">
        <div class="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <p>
            ResearchLens — Open-access scientific literature discovery powered by the
            <a
              href="https://api.core.ac.uk/docs/v3"
              target="_blank"
              rel="noopener noreferrer"
              class="font-medium text-slate-700 hover:text-blue-700 hover:underline"
            >
              CORE API v3
            </a>.
          </p>
          <p>
            Metadata is retrieved directly from CORE without fabrication.
          </p>
        </div>
      </footer>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly coreApi = inject(CoreApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly searchHistory = inject(SearchHistory);

  private readonly searchTrigger$ = new Subject<SearchRequest>();

  readonly activeQuery = signal<string>('');
  readonly activeLimit = signal<number>(20);
  readonly activeOffset = signal<number>(0);
  readonly loading = signal<boolean>(false);
  readonly hasSearched = signal<boolean>(false);
  readonly error = signal<CoreSearchError | null>(null);
  readonly resultsEnvelope = signal<SearchResultsEnvelope | null>(null);
  readonly sortBy = signal<SortOption>('relevance');
  readonly selectedYear = signal<number | null>(null);

  readonly retrievedPapers = computed(() => this.resultsEnvelope()?.papers ?? []);
  readonly totalHits = computed(() => this.resultsEnvelope()?.totalHits ?? 0);

  readonly yearAggregation = computed(() =>
    aggregatePapersByYear(this.retrievedPapers()),
  );

  readonly visiblePapers = computed(() => {
    const papers = this.retrievedPapers();
    const yearFilter = this.selectedYear();
    const filtered =
      yearFilter === null
        ? [...papers]
        : papers.filter((paper) => paper.publicationYear === yearFilter);

    const sort = this.sortBy();
    if (sort === 'relevance') {
      return filtered;
    }

    return filtered.sort((a, b) => {
      if (a.publicationYear === null && b.publicationYear === null) {
        return 0;
      }
      if (a.publicationYear === null) {
        return 1;
      }
      if (b.publicationYear === null) {
        return -1;
      }
      return sort === 'year-desc'
        ? b.publicationYear - a.publicationYear
        : a.publicationYear - b.publicationYear;
    });
  });

  readonly exportablePapers = computed(() => this.visiblePapers());

  constructor() {
    // Use switchMap so newer searches cleanly cancel any in-flight HTTP request.
    this.searchTrigger$
      .pipe(
        tap((req) => {
          this.activeQuery.set(req.query);
          this.activeLimit.set(req.limit);
          this.activeOffset.set(req.offset);
          this.loading.set(true);
          this.error.set(null);
          this.selectedYear.set(null);
          this.hasSearched.set(true);

          if (req.updateUrl) {
            void this.router.navigate([], {
              relativeTo: this.route,
              queryParams: {
                q: req.query,
                limit: req.limit,
                offset: req.offset > 0 ? req.offset : null,
              },
              queryParamsHandling: 'merge',
              replaceUrl: true,
            });
          }
        }),
        switchMap((req) =>
          this.coreApi
            .searchWorks({
              query: req.query,
              limit: req.limit,
              offset: req.offset,
            })
            .pipe(
              catchError((err: unknown) => {
                const normalized =
                  err instanceof CoreSearchError
                    ? err
                    : new CoreSearchError(
                        'Unable to complete the search request.',
                        500,
                        'UNKNOWN_ERROR',
                      );
                this.error.set(normalized);
                this.resultsEnvelope.set(null);
                this.loading.set(false);
                return EMPTY;
              }),
            ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((envelope) => {
        this.resultsEnvelope.set(envelope);
        this.loading.set(false);
        this.searchHistory.record(envelope.query, envelope.limit);
      });
  }

  ngOnInit(): void {
    const queryMap = this.route.snapshot.queryParamMap;
    const rawQ = queryMap.get('q')?.trim() ?? '';
    const rawLimit = Number.parseInt(queryMap.get('limit') ?? '', 10);
    const rawOffset = Number.parseInt(queryMap.get('offset') ?? '', 10);

    const limit = RESULT_LIMIT_OPTIONS.includes(rawLimit) ? rawLimit : 20;
    const offset = Number.isInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

    this.activeLimit.set(limit);

    if (rawQ && inspectBooleanQuery(rawQ).valid) {
      this.searchTrigger$.next({
        query: rawQ,
        limit,
        offset,
        updateUrl: false,
      });
    }
  }

  onSearchSubmit(event: SearchSubmitEvent): void {
    this.searchTrigger$.next({
      query: event.query,
      limit: event.limit,
      offset: 0,
      updateUrl: true,
    });
  }

  onGuideQuery(query: string): void {
    this.searchTrigger$.next({
      query,
      limit: this.activeLimit(),
      offset: 0,
      updateUrl: true,
    });
  }

  onPageChange(nextOffset: number): void {
    const query = this.activeQuery();
    if (!query) {
      return;
    }
    this.searchTrigger$.next({
      query,
      limit: this.activeLimit(),
      offset: nextOffset,
      updateUrl: true,
    });
  }

  onRetrySearch(): void {
    const query = this.activeQuery();
    if (!query) {
      return;
    }
    this.searchTrigger$.next({
      query,
      limit: this.activeLimit(),
      offset: this.activeOffset(),
      updateUrl: false,
    });
  }

  onSearchClear(): void {
    this.activeQuery.set('');
    this.activeOffset.set(0);
    this.hasSearched.set(false);
    this.loading.set(false);
    this.error.set(null);
    this.resultsEnvelope.set(null);
    this.selectedYear.set(null);
    this.sortBy.set('relevance');

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {q: null, limit: null, offset: null},
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  onSortChange(sort: SortOption): void {
    this.sortBy.set(sort);
  }

  onSelectYear(year: number | null): void {
    this.selectedYear.set(year);
  }

  onExportCsv(): void {
    triggerCsvDownload(this.exportablePapers(), this.activeQuery());
  }
}
