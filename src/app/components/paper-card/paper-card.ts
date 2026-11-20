import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {ResearchPaper} from '../../models/paper.model';

const ABSTRACT_PREVIEW_CHARS = 320;
const MAX_VISIBLE_AUTHORS = 5;

@Component({
  selector: 'app-paper-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <article
      class="rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300 sm:p-6"
    >
      <!-- Unboxed typographic metadata header (zero-pill discipline) -->
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
        <span class="font-mono font-medium text-slate-700 tabular-nums">
          {{ paper().publicationYear !== null ? paper().publicationYear : 'Year unavailable' }}
        </span>
        @if (paper().publisherOrJournal) {
          <span aria-hidden="true">·</span>
          <span class="font-medium text-slate-600">{{ paper().publisherOrJournal }}</span>
        } @else {
          <span aria-hidden="true">·</span>
          <span>Publisher unavailable</span>
        }
        @if (paper().documentType) {
          <span aria-hidden="true">·</span>
          <span>{{ paper().documentType }}</span>
        }
      </div>

      <!-- Paper Title -->
      <h3 class="mt-2 text-base font-semibold leading-snug text-slate-950 sm:text-lg">
        @if (paper().paperUrl) {
          <a
            [href]="paper().paperUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="transition-colors hover:text-blue-700 hover:underline hover:underline-offset-2"
          >
            {{ paper().title }}
          </a>
        } @else {
          <span>{{ paper().title }}</span>
        }
      </h3>

      <!-- Authors -->
      <p class="mt-1.5 text-sm text-slate-600">
        @if (paper().authors.length > 0) {
          <span>{{ visibleAuthorsText() }}</span>
          @if (remainingAuthorsCount() > 0 && !authorsExpanded()) {
            <button
              type="button"
              (click)="authorsExpanded.set(true)"
              class="ml-1.5 font-medium text-blue-700 hover:underline"
            >
              +{{ remainingAuthorsCount() }} more
            </button>
          }
        } @else {
          <span class="italic text-slate-400">Author information unavailable</span>
        }
      </p>

      <!-- Abstract -->
      <div class="mt-3 text-sm leading-relaxed text-slate-700">
        @if (paper().abstract) {
          <p>{{ displayedAbstract() }}</p>
          @if (isAbstractTruncatable()) {
            <button
              type="button"
              (click)="toggleAbstract()"
              class="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
            >
              <span>{{ abstractExpanded() ? 'Show less' : 'Read full abstract' }}</span>
            </button>
          }
        } @else {
          <p class="italic text-slate-400">Abstract not provided by the indexing source.</p>
        }
      </div>

      <!-- Footer: DOI + Actions -->
      <div
        class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5"
      >
        <div class="min-w-0 text-xs text-slate-500">
          @if (paper().doi) {
            <span class="mr-1.5 font-medium text-slate-500">DOI:</span>
            <span class="break-all font-mono text-slate-700">{{ paper().doi }}</span>
          } @else {
            <span>DOI not available</span>
          }
        </div>

        <div class="flex flex-wrap items-center gap-2">
          @if (paper().doi) {
            <button
              type="button"
              (click)="copyText(paper().doi!, 'doi')"
              class="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              [attr.aria-label]="'Copy DOI ' + paper().doi"
            >
              <mat-icon class="!h-3.5 !w-3.5 !text-[15px]" aria-hidden="true">
                {{ copiedField() === 'doi' ? 'check' : 'content_copy' }}
              </mat-icon>
              <span>{{ copiedField() === 'doi' ? 'DOI copied' : 'Copy DOI' }}</span>
            </button>
          }

          @if (paper().paperUrl) {
            <button
              type="button"
              (click)="copyText(paper().paperUrl!, 'url')"
              class="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              aria-label="Copy paper URL"
            >
              <mat-icon class="!h-3.5 !w-3.5 !text-[15px]" aria-hidden="true">
                {{ copiedField() === 'url' ? 'check' : 'link' }}
              </mat-icon>
              <span>{{ copiedField() === 'url' ? 'URL copied' : 'Copy URL' }}</span>
            </button>

            <a
              [href]="paper().paperUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-semibold text-blue-800 transition-colors hover:border-blue-300 hover:bg-blue-100/70"
            >
              <span>Open Paper</span>
              <mat-icon class="!h-3.5 !w-3.5 !text-[15px]" aria-hidden="true">
                open_in_new
              </mat-icon>
            </a>
          }
        </div>
      </div>
    </article>
  `,
})
export class PaperCard {
  readonly paper = input.required<ResearchPaper>();

  readonly abstractExpanded = signal<boolean>(false);
  readonly authorsExpanded = signal<boolean>(false);
  readonly copiedField = signal<'doi' | 'url' | null>(null);

  private copyResetTimer: ReturnType<typeof setTimeout> | null = null;

  readonly isAbstractTruncatable = computed(() => {
    const abs = this.paper().abstract;
    return Boolean(abs && abs.length > ABSTRACT_PREVIEW_CHARS);
  });

  readonly displayedAbstract = computed(() => {
    const abs = this.paper().abstract;
    if (!abs) {
      return '';
    }
    if (this.abstractExpanded() || abs.length <= ABSTRACT_PREVIEW_CHARS) {
      return abs;
    }
    return `${abs.slice(0, ABSTRACT_PREVIEW_CHARS).trimEnd()}...`;
  });

  readonly visibleAuthorsText = computed(() => {
    const authors = this.paper().authors;
    if (this.authorsExpanded() || authors.length <= MAX_VISIBLE_AUTHORS) {
      return authors.join(', ');
    }
    return authors.slice(0, MAX_VISIBLE_AUTHORS).join(', ');
  });

  readonly remainingAuthorsCount = computed(() => {
    return Math.max(0, this.paper().authors.length - MAX_VISIBLE_AUTHORS);
  });

  toggleAbstract(): void {
    this.abstractExpanded.update((expanded) => !expanded);
  }

  async copyText(value: string, field: 'doi' | 'url'): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      this.copiedField.set(field);
      if (this.copyResetTimer) {
        clearTimeout(this.copyResetTimer);
      }
      this.copyResetTimer = setTimeout(() => {
        this.copiedField.set(null);
      }, 2000);
    } catch {
      // Clipboard API may be unavailable in restricted contexts
    }
  }
}
