import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';

@Component({
  selector: 'app-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        <!-- Zone 1: Brand mark -->
        <a
          href="#search-workspace"
          class="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-slate-900 transition-opacity hover:opacity-85"
          aria-label="ResearchLens home"
        >
          <svg
            class="h-7 w-7 text-blue-700"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect x="2" y="2" width="24" height="24" rx="6" class="fill-blue-700/10 stroke-blue-700" stroke-width="1.75" />
            <circle cx="13" cy="13" r="5.25" class="stroke-blue-700" stroke-width="1.85" />
            <path d="M17 17L21.25 21.25" class="stroke-blue-700" stroke-width="2" stroke-linecap="round" />
            <path d="M10.5 13H15.5M13 10.5V15.5" class="stroke-blue-700" stroke-width="1.4" stroke-linecap="round" />
          </svg>
          <span class="font-display text-lg font-bold tracking-tight text-slate-900">ResearchLens</span>
        </a>

        <!-- Zone 2: Clean single-line text navigation links -->
        <nav aria-label="Primary navigation" class="hidden items-center gap-7 md:flex">
          <a
            href="#search-workspace"
            class="shrink-0 whitespace-nowrap text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 hover:underline hover:underline-offset-4"
          >
            Search
          </a>
          <a
            href="#results-section"
            class="shrink-0 whitespace-nowrap text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 hover:underline hover:underline-offset-4"
          >
            Results
          </a>
          <a
            href="#distribution-section"
            class="shrink-0 whitespace-nowrap text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 hover:underline hover:underline-offset-4"
          >
            Distribution
          </a>
          <a
            href="#boolean-guide"
            class="shrink-0 whitespace-nowrap text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 hover:underline hover:underline-offset-4"
          >
            Boolean Guide
          </a>
        </nav>

        <!-- Zone 3: Single contextual primary action -->
        <div class="flex shrink-0 items-center">
          <button
            type="button"
            [disabled]="!canExport()"
            (click)="exportCsv.emit()"
            class="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-900 bg-slate-900 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            aria-label="Export retrieved research papers to CSV"
          >
            <mat-icon class="!h-4 !w-4 !text-[16px]" aria-hidden="true">download</mat-icon>
            <span>Export CSV</span>
          </button>
        </div>
      </div>
    </header>
  `,
})
export class Navbar {
  readonly canExport = input<boolean>(false);
  readonly exportCsv = output<void>();
}
