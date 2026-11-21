import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {ResearchPaper, SortOption} from '../../models/paper.model';
import {CoreSearchError} from '../../services/core-api';
import {PaperCard} from '../paper-card/paper-card';

@Component({
  selector: 'app-results-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, PaperCard],
  template: `
    <section id="results-section" aria-labelledby="results-heading">
      <!-- Loading State -->
      @if (loading()) {
        <div class="space-y-4" role="status" aria-live="polite" aria-label="Loading research papers">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <div class="h-5 w-52 animate-pulse rounded bg-slate-200"></div>
            <div class="h-8 w-44 animate-pulse rounded bg-slate-200"></div>
          </div>
          @for (item of skeletonSlots; track item) {
            <div class="rounded-xl border border-slate-200 bg-white p-6">
              <div class="h-3.5 w-40 animate-pulse rounded bg-slate-200"></div>
              <div class="mt-3 h-5 w-4/5 animate-pulse rounded bg-slate-200"></div>
              <div class="mt-2 h-4 w-2/5 animate-pulse rounded bg-slate-100"></div>
              <div class="mt-4 space-y-2">
                <div class="h-3.5 w-full animate-pulse rounded bg-slate-100"></div>
                <div class="h-3.5 w-11/12 animate-pulse rounded bg-slate-100"></div>
                <div class="h-3.5 w-3/4 animate-pulse rounded bg-slate-100"></div>
              </div>
            </div>
          }
        </div>
      } @else if (error()) {
        <!-- Error State -->
        <div
          role="alert"
          class="rounded-xl border border-red-200 bg-white p-6"
        >
          <div class="flex items-start gap-3.5">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700">
              <mat-icon class="!h-5 !w-5 !text-[22px]" aria-hidden="true">
                {{ isRateLimitError() ? 'hourglass_top' : 'error_outline' }}
              </mat-icon>
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-base font-semibold text-slate-950">
                {{ isRateLimitError() ? 'CORE API Rate Limit Reached' : 'Unable to Retrieve Papers' }}
              </h2>
              <p class="mt-1.5 text-sm leading-relaxed text-slate-700">
                {{ error()!.message }}
              </p>

              @if (isRateLimitError()) {
                <div class="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3.5 text-xs leading-relaxed text-amber-950">
                  <p class="font-medium">Why this happens:</p>
                  <p class="mt-1">
                    Unauthenticated CORE API v3 requests share a strict rate limit (typically 10 requests per 10-minute window).
                    Setting a free <code class="font-mono font-semibold">CORE_API_KEY</code> in the backend
                    <code class="font-mono font-semibold">.env</code> file provides a dedicated quota.
                  </p>
                </div>
              }

              <div class="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  (click)="retrySearch.emit()"
                  class="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  <mat-icon class="!h-4 !w-4 !text-[16px]" aria-hidden="true">refresh</mat-icon>
                  <span>Retry Search</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      } @else if (!hasSearched()) {
        <!-- Initial Empty State -->
        <div class="rounded-xl border border-slate-200 bg-white p-8 sm:p-10">
          <div class="max-w-xl">
            <div class="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-blue-700">
              <mat-icon class="!h-6 !w-6 !text-[24px]" aria-hidden="true">science</mat-icon>
            </div>
            <h2 id="results-heading" class="mt-4 text-lg font-semibold text-slate-950">
              Ready to query the CORE scholarly index
            </h2>
            <p class="mt-2 text-sm leading-relaxed text-slate-600">
              Enter a keyword or nested Boolean expression above, choose how many records to
              retrieve (up to 100 per request), and submit to inspect paper metadata and
              publication-year trends.
            </p>
            <dl class="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 text-xs sm:grid-cols-3">
              <div>
                <dt class="font-semibold text-slate-900">Boolean Preservation</dt>
                <dd class="mt-1 text-slate-600">
                  Operators and parentheses are sent directly to CORE without text rewriting.
                </dd>
              </div>
              <div>
                <dt class="font-semibold text-slate-900">Transparent Scope</dt>
                <dd class="mt-1 text-slate-600">
                  Publication charts clearly distinguish retrieved records from total CORE hits.
                </dd>
              </div>
              <div>
                <dt class="font-semibold text-slate-900">Verifiable Metadata</dt>
                <dd class="mt-1 text-slate-600">
                  Missing fields display honest fallbacks; DOIs and source URLs copy in one click.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      } @else if (totalRetrieved() === 0) {
        <!-- Zero Results State -->
        <div class="rounded-xl border border-slate-200 bg-white p-8 text-center sm:p-10">
          <div class="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
            <mat-icon class="!h-6 !w-6 !text-[24px]" aria-hidden="true">search_off</mat-icon>
          </div>
          <h2 id="results-heading" class="mt-4 text-base font-semibold text-slate-950">
            No matching research papers found
          </h2>
          <p class="mx-auto mt-2 max-w-md text-sm text-slate-600">
            CORE returned 0 works for
            <code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">
              {{ activeQuery() }}
            </code>.
            Try broadening an <span class="font-mono">AND</span> clause to <span class="font-mono">OR</span>,
            removing overly restrictive parentheses, or selecting an example query above.
          </p>
        </div>
      } @else {
        <!-- Populated Results Header & Controls -->
        <div class="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="results-heading" class="text-base font-semibold text-slate-950">
              Research Papers
            </h2>
            <p class="mt-1 text-xs text-slate-600 tabular-nums">
              Showing
              <span class="font-mono font-semibold text-slate-900">{{ rangeStart() }}–{{ rangeEnd() }}</span>
              of
              <span class="font-mono font-semibold text-slate-900">{{ formattedTotalHits() }}</span>
              matching works in CORE for
              <span class="font-mono text-slate-800">{{ activeQuery() }}</span>
            </p>
          </div>

          <!-- Sort segmented control -->
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs text-slate-500">Sort retrieved:</span>
            <div
              role="group"
              aria-label="Sort retrieved papers"
              class="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5"
            >
              <button
                type="button"
                (click)="sortChange.emit('relevance')"
                class="whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                [class.bg-white]="sortBy() === 'relevance'"
                [class.text-slate-950]="sortBy() === 'relevance'"
                [class.shadow-xs]="sortBy() === 'relevance'"
                [class.text-slate-600]="sortBy() !== 'relevance'"
                [class.hover:text-slate-900]="sortBy() !== 'relevance'"
              >
                Relevance
              </button>
              <button
                type="button"
                (click)="sortChange.emit('year-desc')"
                class="whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                [class.bg-white]="sortBy() === 'year-desc'"
                [class.text-slate-950]="sortBy() === 'year-desc'"
                [class.shadow-xs]="sortBy() === 'year-desc'"
                [class.text-slate-600]="sortBy() !== 'year-desc'"
                [class.hover:text-slate-900]="sortBy() !== 'year-desc'"
              >
                Newest
              </button>
              <button
                type="button"
                (click)="sortChange.emit('year-asc')"
                class="whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                [class.bg-white]="sortBy() === 'year-asc'"
                [class.text-slate-950]="sortBy() === 'year-asc'"
                [class.shadow-xs]="sortBy() === 'year-asc'"
                [class.text-slate-600]="sortBy() !== 'year-asc'"
                [class.hover:text-slate-900]="sortBy() !== 'year-asc'"
              >
                Oldest
              </button>
            </div>
          </div>
        </div>

        <!-- Active Year Filter Bar (when user clicks a bar in the Chart.js graph) -->
        @if (selectedYear() !== null) {
          <div class="mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-2.5 text-xs text-blue-950">
            <span>
              Filtered to <strong class="font-mono tabular-nums">{{ papers().length }}</strong>
              retrieved {{ papers().length === 1 ? 'paper' : 'papers' }} published in
              <strong class="font-mono tabular-nums">{{ selectedYear() }}</strong>.
            </span>
            <button
              type="button"
              (click)="clearYearFilter.emit()"
              class="inline-flex items-center gap-1 font-semibold text-blue-800 hover:underline"
            >
              <mat-icon class="!h-3.5 !w-3.5 !text-[15px]" aria-hidden="true">close</mat-icon>
              <span>Show all years</span>
            </button>
          </div>
        }

        <!-- Paper Cards Stack -->
        <div class="space-y-4">
          @for (paper of papers(); track paper.id) {
            <app-paper-card
              [paper]="paper"
              [selected]="selectedPaperId() === paper.id"
              (selectPaper)="selectPaper.emit($event)"
            />
          }
        </div>

        <!-- Pagination Bar -->
        @if (canGoPrev() || canGoNext()) {
          <nav
            aria-label="Search results pagination"
            class="mt-6 flex items-center justify-between border-t border-slate-200 pt-5"
          >
            <p class="text-xs text-slate-600 tabular-nums">
              Page <span class="font-mono font-semibold text-slate-900">{{ currentPage() }}</span>
              of <span class="font-mono font-semibold text-slate-900">{{ totalPages() }}</span>
            </p>
            <div class="flex items-center gap-2">
              <button
                type="button"
                [disabled]="!canGoPrev()"
                (click)="pageChange.emit(prevOffset())"
                class="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
              >
                <mat-icon class="!h-4 !w-4 !text-[16px]" aria-hidden="true">chevron_left</mat-icon>
                <span>Previous</span>
              </button>
              <button
                type="button"
                [disabled]="!canGoNext()"
                (click)="pageChange.emit(nextOffset())"
                class="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
              >
                <span>Next</span>
                <mat-icon class="!h-4 !w-4 !text-[16px]" aria-hidden="true">chevron_right</mat-icon>
              </button>
            </div>
          </nav>
        }
      }
    </section>
  `,
})
export class ResultsList {
  readonly papers = input<readonly ResearchPaper[]>([]);
  readonly totalRetrieved = input<number>(0);
  readonly totalHits = input<number>(0);
  readonly limit = input<number>(20);
  readonly offset = input<number>(0);
  readonly activeQuery = input<string>('');
  readonly loading = input<boolean>(false);
  readonly hasSearched = input<boolean>(false);
  readonly error = input<CoreSearchError | null>(null);
  readonly sortBy = input<SortOption>('relevance');
  readonly selectedYear = input<number | null>(null);
  readonly selectedPaperId = input<string | null>(null);

  readonly sortChange = output<SortOption>();
  readonly pageChange = output<number>();
  readonly retrySearch = output<void>();
  readonly clearYearFilter = output<void>();
  readonly selectPaper = output<ResearchPaper>();

  readonly skeletonSlots = [1, 2, 3, 4];

  readonly isRateLimitError = computed(() => this.error()?.status === 429);

  readonly rangeStart = computed(() => (this.totalRetrieved() > 0 ? this.offset() + 1 : 0));

  readonly rangeEnd = computed(() => this.offset() + this.totalRetrieved());

  readonly formattedTotalHits = computed(() => this.totalHits().toLocaleString('en-US'));

  readonly currentPage = computed(() => Math.floor(this.offset() / this.limit()) + 1);

  readonly totalPages = computed(() => {
    const cappedHits = Math.min(this.totalHits(), 10000);
    return Math.max(1, Math.ceil(cappedHits / this.limit()));
  });

  readonly canGoPrev = computed(() => this.offset() > 0);

  readonly canGoNext = computed(() => {
    const next = this.offset() + this.limit();
    return next < this.totalHits() && next < 10000;
  });

  readonly prevOffset = computed(() => Math.max(0, this.offset() - this.limit()));

  readonly nextOffset = computed(() => this.offset() + this.limit());
}
