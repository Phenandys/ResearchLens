import {isPlatformBrowser} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {ResearchPaper} from '../../models/paper.model';

@Component({
  selector: 'app-paper-detail-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  host: {
    '(document:keydown.escape)': 'onEscapeKey()',
  },
  template: `
    @if (paper(); as current) {
      <div
        class="fixed inset-0 z-50 flex justify-end"
        data-testid="paper-detail-backdrop"
      >
        <!-- Backdrop Scrim (click outside panel to dismiss) -->
        <button
          type="button"
          tabindex="-1"
          aria-label="Close paper details panel"
          (click)="close()"
          class="fixed inset-0 bg-slate-950/45 backdrop-blur-[1px] transition-opacity"
        ></button>

        <!-- Slide-Over Detail Panel -->
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="paper-detail-title"
          data-testid="paper-detail-panel"
          class="relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-xl"
        >
          <!-- Panel Header -->
          <div class="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                <span class="font-mono font-medium text-slate-700 tabular-nums">
                  {{ current.publicationYear !== null ? current.publicationYear : 'Year unavailable' }}
                </span>
                @if (current.documentType) {
                  <span aria-hidden="true">·</span>
                  <span>{{ current.documentType }}</span>
                }
                @if (current.language) {
                  <span aria-hidden="true">·</span>
                  <span>{{ current.language }}</span>
                }
              </div>
              <h2
                id="paper-detail-title"
                class="mt-2 text-lg font-bold leading-snug text-slate-950 sm:text-xl"
              >
                {{ current.title }}
              </h2>
            </div>

            <button
              #closeButton
              type="button"
              (click)="close()"
              aria-label="Close paper details"
              data-testid="close-detail-panel"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
            >
              <mat-icon class="!h-5 !w-5 !text-[20px]" aria-hidden="true">close</mat-icon>
            </button>
          </div>

          <!-- Scrollable Content Body -->
          <div class="flex-1 overflow-y-auto px-6 py-6">
            <!-- Complete Authors List -->
            <section aria-labelledby="detail-authors-heading">
              <h3
                id="detail-authors-heading"
                class="text-xs font-semibold text-slate-500"
              >
                Authors
                @if (current.authors.length > 0) {
                  <span class="font-mono font-normal text-slate-400 tabular-nums">
                    ({{ current.authors.length }})
                  </span>
                }
              </h3>
              @if (current.authors.length > 0) {
                <p class="mt-2 text-sm leading-relaxed text-slate-800">
                  {{ current.authors.join(', ') }}
                </p>
              } @else {
                <p class="mt-2 text-sm italic text-slate-400">
                  Author information unavailable from source.
                </p>
              }
            </section>

            <!-- Full Unabridged Abstract -->
            <section
              aria-labelledby="detail-abstract-heading"
              class="mt-6 border-t border-slate-100 pt-6"
            >
              <h3
                id="detail-abstract-heading"
                class="text-xs font-semibold text-slate-500"
              >
                Full Abstract
              </h3>
              @if (current.abstract) {
                <p
                  data-testid="detail-full-abstract"
                  class="mt-2.5 text-[15px] leading-relaxed text-slate-700"
                >
                  {{ current.abstract }}
                </p>
              } @else {
                <p
                  data-testid="detail-full-abstract"
                  class="mt-2.5 text-sm italic text-slate-400"
                >
                  Abstract not provided by the indexing source.
                </p>
              }
            </section>

            <!-- Bibliographic Metadata -->
            <section
              aria-labelledby="detail-metadata-heading"
              class="mt-6 border-t border-slate-100 pt-6"
            >
              <h3
                id="detail-metadata-heading"
                class="text-xs font-semibold text-slate-500"
              >
                Bibliographic Metadata
              </h3>
              <dl class="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                <div>
                  <dt class="text-xs text-slate-500">Publisher / Journal</dt>
                  <dd class="mt-0.5 font-medium text-slate-900">
                    {{ current.publisherOrJournal || 'Unavailable' }}
                  </dd>
                </div>

                <div>
                  <dt class="text-xs text-slate-500">Publication Year</dt>
                  <dd class="mt-0.5 font-mono font-medium text-slate-900 tabular-nums">
                    {{ current.publicationYear !== null ? current.publicationYear : 'Unavailable' }}
                  </dd>
                </div>

                @if (current.publishedDateRaw) {
                  <div>
                    <dt class="text-xs text-slate-500">Published Date (Raw)</dt>
                    <dd class="mt-0.5 font-mono text-xs text-slate-800 tabular-nums">
                      {{ current.publishedDateRaw }}
                    </dd>
                  </div>
                }

                <div>
                  <dt class="text-xs text-slate-500">CORE Work ID</dt>
                  <dd class="mt-0.5 font-mono text-xs text-slate-800 tabular-nums">
                    {{ current.id }}
                  </dd>
                </div>

                <div>
                  <dt class="text-xs text-slate-500">Document Type</dt>
                  <dd class="mt-0.5 text-slate-900">
                    {{ current.documentType || 'Unavailable' }}
                  </dd>
                </div>

                <div>
                  <dt class="text-xs text-slate-500">Language</dt>
                  <dd class="mt-0.5 text-slate-900">
                    {{ current.language || 'Unavailable' }}
                  </dd>
                </div>

                <div class="sm:col-span-2">
                  <dt class="text-xs text-slate-500">DOI</dt>
                  <dd class="mt-0.5 break-all font-mono text-xs text-slate-900">
                    {{ current.doi || 'Not available' }}
                  </dd>
                </div>

                @if (current.paperUrl) {
                  <div class="sm:col-span-2">
                    <dt class="text-xs text-slate-500">Source Link</dt>
                    <dd class="mt-0.5 break-all font-mono text-xs text-blue-700">
                      <a
                        [href]="current.paperUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="hover:underline"
                      >
                        {{ current.paperUrl }}
                      </a>
                    </dd>
                  </div>
                }
              </dl>
            </section>
          </div>

          <!-- Sticky Action Footer -->
          <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 px-6 py-4">
            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                (click)="copyText(citationText(), 'citation')"
                class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <mat-icon class="!h-4 !w-4 !text-[16px]" aria-hidden="true">
                  {{ copiedField() === 'citation' ? 'check' : 'format_quote' }}
                </mat-icon>
                <span>{{ copiedField() === 'citation' ? 'Citation copied' : 'Copy Citation' }}</span>
              </button>

              @if (current.doi) {
                <button
                  type="button"
                  (click)="copyText(current.doi, 'doi')"
                  class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  <mat-icon class="!h-4 !w-4 !text-[16px]" aria-hidden="true">
                    {{ copiedField() === 'doi' ? 'check' : 'content_copy' }}
                  </mat-icon>
                  <span>{{ copiedField() === 'doi' ? 'DOI copied' : 'Copy DOI' }}</span>
                </button>
              }

              @if (current.paperUrl) {
                <button
                  type="button"
                  (click)="copyText(current.paperUrl, 'url')"
                  class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  <mat-icon class="!h-4 !w-4 !text-[16px]" aria-hidden="true">
                    {{ copiedField() === 'url' ? 'check' : 'link' }}
                  </mat-icon>
                  <span>{{ copiedField() === 'url' ? 'URL copied' : 'Copy URL' }}</span>
                </button>
              }
            </div>

            <div class="flex items-center gap-2">
              @if (current.downloadUrl && current.downloadUrl !== current.paperUrl) {
                <a
                  [href]="current.downloadUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100"
                >
                  <mat-icon class="!h-4 !w-4 !text-[16px]" aria-hidden="true">picture_as_pdf</mat-icon>
                  <span>Download PDF</span>
                </a>
              }

              @if (current.paperUrl) {
                <a
                  [href]="current.paperUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800"
                >
                  <span>Open Original Paper</span>
                  <mat-icon class="!h-4 !w-4 !text-[16px]" aria-hidden="true">open_in_new</mat-icon>
                </a>
              }
            </div>
          </div>
        </aside>
      </div>
    }
  `,
})
export class PaperDetailPanel {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly paper = input<ResearchPaper | null>(null);
  readonly closed = output<void>();

  readonly copiedField = signal<'doi' | 'url' | 'citation' | null>(null);
  private readonly closeButtonRef = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private copyTimer: ReturnType<typeof setTimeout> | null = null;

  readonly citationText = computed(() => {
    const current = this.paper();
    if (!current) {
      return '';
    }
    const parts: string[] = [];
    if (current.authors.length > 0) {
      parts.push(current.authors.join(', '));
    }
    if (current.publicationYear !== null) {
      parts.push(`(${current.publicationYear}).`);
    }
    parts.push(`${current.title}.`);
    if (current.publisherOrJournal) {
      parts.push(`${current.publisherOrJournal}.`);
    }
    if (current.doi) {
      parts.push(`https://doi.org/${current.doi}`);
    } else if (current.paperUrl) {
      parts.push(current.paperUrl);
    }
    return parts.join(' ');
  });

  constructor() {
    // Lock background body scroll and focus the close button when opening the panel.
    effect(() => {
      const current = this.paper();
      this.copiedField.set(null);

      if (!isPlatformBrowser(this.platformId)) {
        return;
      }

      document.body.style.overflow = current ? 'hidden' : '';

      if (current) {
        queueMicrotask(() => {
          this.closeButtonRef()?.nativeElement.focus();
        });
      }
    });

    this.destroyRef.onDestroy(() => {
      if (isPlatformBrowser(this.platformId)) {
        document.body.style.overflow = '';
      }
      if (this.copyTimer) {
        clearTimeout(this.copyTimer);
      }
    });
  }

  onEscapeKey(): void {
    if (this.paper()) {
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }

  async copyText(value: string, field: 'doi' | 'url' | 'citation'): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard || !value) {
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      this.copiedField.set(field);
      if (this.copyTimer) {
        clearTimeout(this.copyTimer);
      }
      this.copyTimer = setTimeout(() => {
        this.copiedField.set(null);
      }, 2000);
    } catch {
      // Clipboard API may be restricted in non-HTTPS contexts
    }
  }
}
