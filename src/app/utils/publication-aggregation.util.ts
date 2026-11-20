import {
  PublicationAggregation,
  PublicationYearBucket,
  ResearchPaper,
} from '../models/paper.model';

/**
 * Groups retrieved research papers by publication year in chronological order.
 * Explicitly counts papers with missing or invalid publication dates so the UI
 * accurately communicates the scope of visualized records.
 */
export function aggregatePapersByYear(
  papers: readonly ResearchPaper[],
): PublicationAggregation {
  const countsByYear = new Map<number, number>();
  let undatedCount = 0;

  for (const paper of papers) {
    const year = paper.publicationYear;
    if (year !== null && Number.isInteger(year)) {
      countsByYear.set(year, (countsByYear.get(year) ?? 0) + 1);
    } else {
      undatedCount++;
    }
  }

  const buckets: PublicationYearBucket[] = Array.from(countsByYear.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, count]) => ({year, count}));

  let peakYear: PublicationYearBucket | null = null;
  for (const bucket of buckets) {
    if (!peakYear || bucket.count > peakYear.count) {
      peakYear = bucket;
    }
  }

  return {
    buckets,
    datedCount: papers.length - undatedCount,
    undatedCount,
    totalRetrieved: papers.length,
    minYear: buckets.length > 0 ? buckets[0].year : null,
    maxYear: buckets.length > 0 ? buckets[buckets.length - 1].year : null,
    peakYear,
  };
}
