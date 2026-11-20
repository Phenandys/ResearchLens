import {ChangeDetectionStrategy, Component, output} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';

interface SyntaxRow {
  operator: string;
  purpose: string;
  example: string;
}

@Component({
  selector: 'app-boolean-guide',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <section
      id="boolean-guide"
      aria-labelledby="boolean-guide-heading"
      class="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div class="flex items-center justify-between gap-2">
        <h2 id="boolean-guide-heading" class="text-sm font-semibold text-slate-950">
          CORE Boolean Syntax Guide
        </h2>
        <a
          href="https://api.core.ac.uk/docs/v3#section/How-to-search"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
        >
          <span>CORE Docs</span>
          <mat-icon class="!h-3.5 !w-3.5 !text-[14px]" aria-hidden="true">open_in_new</mat-icon>
        </a>
      </div>

      <p class="mt-1.5 text-xs leading-relaxed text-slate-600">
        CORE API v3 evaluates uppercase Boolean operators and nested groupings. Click any example to run it.
      </p>

      <div class="mt-4 divide-y divide-slate-100">
        @for (row of syntaxRows; track row.operator) {
          <div class="py-2.5 first:pt-0 last:pb-0">
            <div class="flex items-baseline justify-between gap-2">
              <span class="font-mono text-xs font-semibold text-slate-900">{{ row.operator }}</span>
              <span class="text-xs text-slate-500">{{ row.purpose }}</span>
            </div>
            <button
              type="button"
              (click)="tryQuery.emit(row.example)"
              class="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left font-mono text-[11px] text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/70 hover:text-blue-800"
            >
              {{ row.example }}
            </button>
          </div>
        }
      </div>
    </section>
  `,
})
export class BooleanGuide {
  readonly tryQuery = output<string>();

  readonly syntaxRows: readonly SyntaxRow[] = [
    {
      operator: 'AND',
      purpose: 'Require both terms',
      example: 'drone AND delivery',
    },
    {
      operator: 'OR',
      purpose: 'Match either term',
      example: 'solar OR wind',
    },
    {
      operator: '( ... )',
      purpose: 'Group nested logic',
      example: '(drone AND (package OR delivery))',
    },
    {
      operator: '"..."',
      purpose: 'Exact phrase match',
      example: '"federated learning" AND privacy',
    },
    {
      operator: 'field:value',
      purpose: 'Target specific metadata',
      example: 'title:robotics AND yearPublished>=2022',
    },
  ];
}
