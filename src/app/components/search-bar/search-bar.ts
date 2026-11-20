import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {debounceTime, distinctUntilChanged} from 'rxjs';
import {
  EXAMPLE_BOOLEAN_QUERIES,
  RESULT_LIMIT_OPTIONS,
  SearchHistoryEntry,
} from '../../models/paper.model';
import {
  booleanQueryValidator,
  inspectBooleanQuery,
} from '../../utils/boolean-query.util';

export interface SearchSubmitEvent {
  query: string;
  limit: number;
}

@Component({
  selector: 'app-search-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatIconModule],
  template: `
    <section
      id="search-workspace"
      aria-labelledby="search-heading"
      class="border-b border-slate-200 bg-white"
    >
      <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div class="max-w-3xl">
          <h1
            id="search-heading"
            class="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
          >
            Boolean Literature Discovery across Open-Access Research
          </h1>
          <p class="mt-2 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
            Query millions of indexed scholarly works from the CORE API using exact
            <span class="font-mono text-[13px] font-medium text-slate-800">AND</span>,
            <span class="font-mono text-[13px] font-medium text-slate-800">OR</span>,
            <span class="font-mono text-[13px] font-medium text-slate-800">NOT</span>,
            and nested parentheses. Expressions are forwarded verbatim to CORE.
          </p>
        </div>

        <form
          [formGroup]="searchForm"
          (ngSubmit)="onSubmit()"
          novalidate
          class="mt-6"
          role="search"
          aria-label="Boolean research paper search"
        >
          <div class="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <!-- Boolean query input -->
            <div class="lg:col-span-8">
              <label for="boolean-query-input" class="sr-only">
                Boolean search expression
              </label>
              <div class="relative flex items-center">
                <mat-icon
                  class="pointer-events-none absolute left-3.5 !h-5 !w-5 !text-[20px] text-slate-400"
                  aria-hidden="true"
                >
                  search
                </mat-icon>
                <input
                  id="boolean-query-input"
                  type="text"
                  formControlName="query"
                  autocomplete="off"
                  spellcheck="false"
                  placeholder="e.g. (drone AND (package OR delivery))"
                  [attr.aria-invalid]="showValidationError() ? 'true' : 'false'"
                  [attr.aria-describedby]="showValidationError() ? 'query-error-msg' : 'query-syntax-hint'"
                  class="h-12 w-full rounded-lg border bg-white pl-11 pr-10 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 transition-colors focus:border-blue-700 focus:outline-none"
                  [class.border-red-500]="showValidationError()"
                  [class.border-slate-300]="!showValidationError()"
                />
                @if (hasInputText()) {
                  <button
                    type="button"
                    (click)="onClear()"
                    aria-label="Clear search query"
                    class="absolute right-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    <mat-icon class="!h-4 !w-4 !text-[18px]" aria-hidden="true">close</mat-icon>
                  </button>
                }
              </div>
            </div>

            <!-- Result limit selector -->
            <div class="sm:flex sm:items-center sm:gap-3 lg:col-span-2">
              <label for="result-limit-select" class="sr-only">
                Number of results to retrieve
              </label>
              <div class="relative w-full">
                <select
                  id="result-limit-select"
                  formControlName="limit"
                  aria-label="Result limit"
                  class="h-12 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-3.5 pr-9 text-sm font-medium text-slate-800 tabular-nums transition-colors hover:border-slate-400 focus:border-blue-700 focus:outline-none"
                >
                  @for (option of limitOptions; track option) {
                    <option [ngValue]="option">{{ option }} results</option>
                  }
                </select>
                <mat-icon
                  class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 !h-5 !w-5 !text-[20px] text-slate-500"
                  aria-hidden="true"
                >
                  expand_more
                </mat-icon>
              </div>
            </div>

            <!-- Submit button -->
            <div class="lg:col-span-2">
              <button
                type="submit"
                [disabled]="loading()"
                class="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                @if (loading()) {
                  <mat-icon class="!h-4 !w-4 !text-[18px] animate-spin" aria-hidden="true">
                    progress_activity
                  </mat-icon>
                  <span>Searching</span>
                } @else {
                  <mat-icon class="!h-4 !w-4 !text-[18px]" aria-hidden="true">
                    manage_search
                  </mat-icon>
                  <span>Search CORE</span>
                }
              </button>
            </div>
          </div>

          <!-- Validation message or syntax helper bar -->
          <div class="mt-2.5 flex flex-wrap items-center justify-between gap-3">
            <div class="min-h-5">
              @if (showValidationError()) {
                <p
                  id="query-error-msg"
                  role="alert"
                  class="flex items-center gap-1.5 text-xs font-medium text-red-700"
                >
                  <mat-icon class="!h-4 !w-4 !text-[16px]" aria-hidden="true">error_outline</mat-icon>
                  <span>{{ validationErrorMessage() }}</span>
                </p>
              } @else {
                <p id="query-syntax-hint" class="text-xs text-slate-500">
                  @if (syntaxFeedback()) {
                    <span>{{ syntaxFeedback() }}</span>
                  } @else {
                    <span>Press Enter to search. Use uppercase AND, OR, NOT and parentheses for grouping.</span>
                  }
                </p>
              }
            </div>

            <!-- Interactive operator insertion helpers -->
            <div class="flex items-center gap-1.5" role="group" aria-label="Insert Boolean operator">
              <span class="mr-1 text-xs text-slate-500">Insert:</span>
              <button
                type="button"
                (click)="insertToken(' AND ')"
                class="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100"
              >
                AND
              </button>
              <button
                type="button"
                (click)="insertToken(' OR ')"
                class="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100"
              >
                OR
              </button>
              <button
                type="button"
                (click)="insertToken(' NOT ')"
                class="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100"
              >
                NOT
              </button>
              <button
                type="button"
                (click)="wrapInParentheses()"
                class="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100"
                title="Wrap current query in parentheses"
              >
                ( )
              </button>
            </div>
          </div>
        </form>

        <!-- Example Boolean queries -->
        <div class="mt-5 border-t border-slate-100 pt-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-medium text-slate-500">Example queries:</span>
            @for (example of exampleQueries; track example.query) {
              <button
                type="button"
                (click)="runExampleQuery(example.query)"
                [title]="example.description"
                class="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/70 hover:text-blue-800"
              >
                {{ example.query }}
              </button>
            }
          </div>
        </div>

        <!-- Recent search history -->
        @if (history().length > 0) {
          <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-medium text-slate-500">Recent:</span>
              @for (item of history(); track item.query) {
                <button
                  type="button"
                  (click)="runHistoryQuery(item)"
                  class="inline-flex max-w-[260px] items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  <mat-icon class="!h-3.5 !w-3.5 shrink-0 !text-[14px] text-slate-400" aria-hidden="true">
                    history
                  </mat-icon>
                  <span class="truncate font-mono">{{ item.query }}</span>
                </button>
              }
            </div>
            <button
              type="button"
              (click)="clearHistory.emit()"
              class="text-xs font-medium text-slate-500 transition-colors hover:text-slate-800 hover:underline"
            >
              Clear history
            </button>
          </div>
        }
      </div>
    </section>
  `,
})
export class SearchBar {
  private readonly destroyRef = inject(DestroyRef);

  readonly initialQuery = input<string>('');
  readonly initialLimit = input<number>(20);
  readonly loading = input<boolean>(false);
  readonly history = input<readonly SearchHistoryEntry[]>([]);

  readonly searchSubmit = output<SearchSubmitEvent>();
  readonly searchClear = output<void>();
  readonly clearHistory = output<void>();

  readonly exampleQueries = EXAMPLE_BOOLEAN_QUERIES;
  readonly limitOptions = RESULT_LIMIT_OPTIONS;

  readonly searchForm = new FormGroup({
    query: new FormControl<string>('', {
      nonNullable: true,
      validators: [booleanQueryValidator()],
    }),
    limit: new FormControl<number>(20, {nonNullable: true}),
  });

  private readonly submitted = signal<boolean>(false);
  private readonly liveQuery = signal<string>('');
  private readonly debouncedInspection = signal(inspectBooleanQuery(''));

  readonly hasInputText = computed(() => this.liveQuery().length > 0);

  readonly showValidationError = computed(() => {
    const queryValue = this.liveQuery();
    const inspection = this.debouncedInspection();
    if (this.submitted()) {
      return !inspectBooleanQuery(queryValue).valid;
    }
    return queryValue.trim().length > 0 && !inspection.valid;
  });

  readonly validationErrorMessage = computed(() => {
    const immediate = inspectBooleanQuery(this.liveQuery());
    return immediate.error ?? '';
  });

  readonly syntaxFeedback = computed(() => {
    const queryValue = this.liveQuery().trim();
    if (!queryValue) {
      return '';
    }
    const inspection = this.debouncedInspection();
    if (!inspection.valid) {
      return '';
    }
    if (inspection.operatorsUsed.length === 0) {
      return 'Valid keyword query ready to submit to CORE.';
    }
    const opSummary = inspection.operatorsUsed.join(', ');
    const nestingNote = inspection.hasNesting ? ' with nested grouping' : '';
    return `Valid Boolean expression (${opSummary}${nestingNote}).`;
  });

  constructor() {
    // Sync query/limit when initialized from URL query params
    effect(() => {
      const q = this.initialQuery();
      const lim = this.initialLimit();
      if (q !== this.searchForm.controls.query.value) {
        this.searchForm.controls.query.setValue(q, {emitEvent: false});
        this.liveQuery.set(q);
        this.debouncedInspection.set(inspectBooleanQuery(q));
      }
      if (lim !== this.searchForm.controls.limit.value) {
        this.searchForm.controls.limit.setValue(lim, {emitEvent: false});
      }
    });

    // Debounced syntax inspection as the user types (RxJS debounceTime + automatic cleanup)
    this.searchForm.controls.query.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.liveQuery.set(value);
      });

    this.searchForm.controls.query.valueChanges
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.debouncedInspection.set(inspectBooleanQuery(value));
      });
  }

  onSubmit(): void {
    this.submitted.set(true);
    const rawQuery = this.searchForm.controls.query.value;
    const inspection = inspectBooleanQuery(rawQuery);
    this.debouncedInspection.set(inspection);

    if (!inspection.valid) {
      this.searchForm.controls.query.markAsTouched();
      return;
    }

    this.searchSubmit.emit({
      query: rawQuery.trim(),
      limit: this.searchForm.controls.limit.value,
    });
  }

  onClear(): void {
    this.submitted.set(false);
    this.searchForm.controls.query.setValue('');
    this.liveQuery.set('');
    this.debouncedInspection.set(inspectBooleanQuery(''));
    this.searchClear.emit();
  }

  runExampleQuery(query: string): void {
    this.submitted.set(false);
    this.searchForm.controls.query.setValue(query);
    this.liveQuery.set(query);
    this.debouncedInspection.set(inspectBooleanQuery(query));
    this.searchSubmit.emit({
      query,
      limit: this.searchForm.controls.limit.value,
    });
  }

  runHistoryQuery(entry: SearchHistoryEntry): void {
    this.submitted.set(false);
    const validLimit = this.limitOptions.includes(entry.limit) ? entry.limit : 20;
    this.searchForm.patchValue({query: entry.query, limit: validLimit});
    this.liveQuery.set(entry.query);
    this.debouncedInspection.set(inspectBooleanQuery(entry.query));
    this.searchSubmit.emit({
      query: entry.query,
      limit: validLimit,
    });
  }

  insertToken(token: string): void {
    const current = this.searchForm.controls.query.value;
    const trimmedEnd = current.replace(/\s+$/, '');
    const next = trimmedEnd.length > 0 ? `${trimmedEnd}${token}` : token.trimStart();
    this.searchForm.controls.query.setValue(next);
    this.liveQuery.set(next);
  }

  wrapInParentheses(): void {
    const current = this.searchForm.controls.query.value.trim();
    const next = current ? `(${current})` : '()';
    this.searchForm.controls.query.setValue(next);
    this.liveQuery.set(next);
    this.debouncedInspection.set(inspectBooleanQuery(next));
  }
}
