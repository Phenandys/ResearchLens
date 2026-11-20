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
  viewChild,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  LinearScale,
  Tooltip,
} from 'chart.js';
import {PublicationAggregation} from '../../models/paper.model';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

@Component({
  selector: 'app-publication-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <section
      id="distribution-section"
      aria-labelledby="chart-heading"
      class="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 id="chart-heading" class="text-base font-semibold text-slate-950">
            Publication Year Distribution
          </h2>
          <p class="mt-0.5 text-xs text-slate-500">
            Chronological breakdown of retrieved records
          </p>
        </div>
        @if (selectedYear() !== null) {
          <button
            type="button"
            (click)="yearSelected.emit(null)"
            class="shrink-0 whitespace-nowrap text-xs font-medium text-blue-700 hover:underline"
          >
            Reset filter
          </button>
        }
      </div>

      @if (loading()) {
        <div class="mt-5 space-y-3" role="status" aria-label="Updating publication chart">
          <div class="h-56 w-full animate-pulse rounded-lg bg-slate-100"></div>
          <div class="grid grid-cols-3 gap-2">
            <div class="h-12 animate-pulse rounded-lg bg-slate-100"></div>
            <div class="h-12 animate-pulse rounded-lg bg-slate-100"></div>
            <div class="h-12 animate-pulse rounded-lg bg-slate-100"></div>
          </div>
        </div>
      } @else if (!hasSearched()) {
        <div class="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center">
          <mat-icon class="!h-8 !w-8 !text-[32px] text-slate-400" aria-hidden="true">
            bar_chart
          </mat-icon>
          <p class="mt-2.5 text-sm font-medium text-slate-700">
            No distribution data yet
          </p>
          <p class="mt-1 text-xs leading-relaxed text-slate-500">
            Run a Boolean search to visualize how retrieved papers are distributed across publication years.
          </p>
        </div>
      } @else if (aggregation().buckets.length === 0) {
        <div class="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center">
          <mat-icon class="!h-7 !w-7 !text-[28px] text-slate-400" aria-hidden="true">
            event_busy
          </mat-icon>
          <p class="mt-2 text-sm font-medium text-slate-700">
            No valid publication years available
          </p>
          <p class="mt-1 text-xs text-slate-500">
            None of the {{ aggregation().totalRetrieved }} retrieved papers included a parseable publication year.
          </p>
        </div>
      } @else {
        <!-- Summary Metrics Row -->
        <dl class="mt-4 grid grid-cols-3 gap-2 border-y border-slate-100 py-3">
          <div>
            <dt class="text-[11px] font-medium text-slate-500">Year Span</dt>
            <dd class="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
              {{ yearSpanLabel() }}
            </dd>
          </div>
          <div>
            <dt class="text-[11px] font-medium text-slate-500">Peak Year</dt>
            <dd class="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
              {{ aggregation().peakYear ? aggregation().peakYear!.year : '—' }}
            </dd>
          </div>
          <div>
            <dt class="text-[11px] font-medium text-slate-500">Dated Papers</dt>
            <dd class="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums">
              {{ aggregation().datedCount }} / {{ aggregation().totalRetrieved }}
            </dd>
          </div>
        </dl>

        <!-- Responsive Chart.js Canvas -->
        <div class="relative mt-4 h-60 w-full">
          <canvas
            #chartCanvas
            role="img"
            [attr.aria-label]="chartAriaLabel()"
          ></canvas>
        </div>

        <p class="mt-2 text-[11px] text-slate-500">
          Click any bar to filter the retrieved paper list by publication year.
        </p>

        <!-- Honest Scope Disclosure -->
        <div class="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600">
          <p>
            <span class="font-semibold text-slate-800">Data scope:</span>
            Aggregates the
            <span class="font-mono font-medium text-slate-900 tabular-nums">{{ aggregation().datedCount }}</span>
            dated records within the
            <span class="font-mono font-medium text-slate-900 tabular-nums">{{ aggregation().totalRetrieved }}</span>
            papers retrieved by this request (out of
            <span class="font-mono font-medium text-slate-900 tabular-nums">{{ formattedTotalHits() }}</span>
            total CORE matches).
          </p>
          @if (aggregation().undatedCount > 0) {
            <p class="mt-1.5 text-slate-500">
              <span class="font-mono font-medium text-slate-700 tabular-nums">
                {{ aggregation().undatedCount }}
              </span>
              retrieved {{ aggregation().undatedCount === 1 ? 'paper has' : 'papers have' }}
              a missing or invalid publication date and {{ aggregation().undatedCount === 1 ? 'is' : 'are' }} excluded from the chart.
            </p>
          }
        </div>
      }
    </section>
  `,
})
export class PublicationChart {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly aggregation = input.required<PublicationAggregation>();
  readonly totalHits = input<number>(0);
  readonly loading = input<boolean>(false);
  readonly hasSearched = input<boolean>(false);
  readonly selectedYear = input<number | null>(null);

  readonly yearSelected = output<number | null>();

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private chartInstance: Chart<'bar'> | null = null;

  readonly formattedTotalHits = computed(() => this.totalHits().toLocaleString('en-US'));

  readonly yearSpanLabel = computed(() => {
    const agg = this.aggregation();
    if (agg.minYear === null || agg.maxYear === null) {
      return '—';
    }
    return agg.minYear === agg.maxYear
      ? String(agg.minYear)
      : `${agg.minYear}–${agg.maxYear}`;
  });

  readonly chartAriaLabel = computed(() => {
    const agg = this.aggregation();
    if (agg.buckets.length === 0) {
      return 'Publication year bar chart with no dated records';
    }
    const peak = agg.peakYear
      ? ` Peak year is ${agg.peakYear.year} with ${agg.peakYear.count} papers.`
      : '';
    return `Bar chart showing ${agg.datedCount} retrieved research papers grouped across ${agg.buckets.length} publication years from ${agg.minYear} to ${agg.maxYear}.${peak}`;
  });

  constructor() {
    effect(() => {
      const agg = this.aggregation();
      const activeYear = this.selectedYear();
      const canvas = this.canvasRef()?.nativeElement;

      if (!isPlatformBrowser(this.platformId)) {
        return;
      }

      if (!canvas || agg.buckets.length === 0) {
        this.destroyChart();
        return;
      }

      this.renderChart(canvas, agg, activeYear);
    });

    this.destroyRef.onDestroy(() => {
      this.destroyChart();
    });
  }

  private renderChart(
    canvas: HTMLCanvasElement,
    agg: PublicationAggregation,
    activeYear: number | null,
  ): void {
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      ctx = null;
    }
    if (!ctx) {
      return;
    }

    const labels = agg.buckets.map((bucket) => String(bucket.year));
    const counts = agg.buckets.map((bucket) => bucket.count);
    const backgroundColors = agg.buckets.map((bucket) => {
      if (activeYear === null) {
        return '#1d4ed8';
      }
      return bucket.year === activeYear ? '#1d4ed8' : '#cbd5e1';
    });
    const hoverColors = agg.buckets.map((bucket) =>
      bucket.year === activeYear ? '#1e40af' : '#2563eb',
    );

    if (this.chartInstance) {
      this.chartInstance.data.labels = labels;
      this.chartInstance.data.datasets[0].data = counts;
      this.chartInstance.data.datasets[0].backgroundColor = backgroundColors;
      this.chartInstance.data.datasets[0].hoverBackgroundColor = hoverColors;
      this.chartInstance.update();
      return;
    }

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Retrieved papers',
            data: counts,
            backgroundColor: backgroundColors,
            hoverBackgroundColor: hoverColors,
            borderRadius: 4,
            maxBarThickness: 36,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 240,
        },
        onClick: (_event, elements) => {
          if (elements.length === 0) {
            return;
          }
          const idx = elements[0].index;
          const clickedBucket = this.aggregation().buckets[idx];
          if (!clickedBucket) {
            return;
          }
          const nextYear =
            this.selectedYear() === clickedBucket.year ? null : clickedBucket.year;
          this.yearSelected.emit(nextYear);
        },
        onHover: (event, elements) => {
          const target = event.native?.target as HTMLElement | null | undefined;
          if (target) {
            target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
          }
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#f8fafc',
            bodyColor: '#e2e8f0',
            padding: 10,
            cornerRadius: 6,
            displayColors: false,
            callbacks: {
              title: (items) => `Published in ${items[0]?.label ?? ''}`,
              label: (item) => {
                const count = Number(item.raw ?? 0);
                return `${count} ${count === 1 ? 'paper' : 'papers'} in retrieved set`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: '#475569',
              font: {
                family: '"IBM Plex Mono", monospace',
                size: 11,
              },
              maxRotation: 45,
              autoSkip: true,
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: '#f1f5f9',
            },
            ticks: {
              precision: 0,
              color: '#475569',
              font: {
                family: '"IBM Plex Mono", monospace',
                size: 11,
              },
            },
          },
        },
      },
    };

    this.chartInstance = new Chart(canvas, config);
  }

  private destroyChart(): void {
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }
  }
}
