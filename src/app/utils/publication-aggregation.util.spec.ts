import {ResearchPaper} from '../models/paper.model';
import {aggregatePapersByYear} from './publication-aggregation.util';

function makePaper(id: string, publicationYear: number | null): ResearchPaper {
  return {
    id,
    title: `Paper ${id}`,
    authors: [],
    publicationYear,
    publishedDateRaw: null,
    abstract: null,
    doi: null,
    publisherOrJournal: null,
    paperUrl: null,
    downloadUrl: null,
    documentType: null,
    language: null,
  };
}

describe('publication-aggregation.util', () => {
  it('groups papers chronologically by publication year and identifies peak year', () => {
    const papers = [
      makePaper('1', 2023),
      makePaper('2', 2021),
      makePaper('3', 2023),
      makePaper('4', 2024),
      makePaper('5', 2023),
      makePaper('6', 2021),
    ];

    const result = aggregatePapersByYear(papers);

    expect(result.buckets).toEqual([
      {year: 2021, count: 2},
      {year: 2023, count: 3},
      {year: 2024, count: 1},
    ]);
    expect(result.datedCount).toBe(6);
    expect(result.undatedCount).toBe(0);
    expect(result.minYear).toBe(2021);
    expect(result.maxYear).toBe(2024);
    expect(result.peakYear).toEqual({year: 2023, count: 3});
  });

  it('tracks missing publication years separately from dated buckets', () => {
    const papers = [
      makePaper('1', 2022),
      makePaper('2', null),
      makePaper('3', null),
    ];

    const result = aggregatePapersByYear(papers);

    expect(result.buckets).toEqual([{year: 2022, count: 1}]);
    expect(result.datedCount).toBe(1);
    expect(result.undatedCount).toBe(2);
    expect(result.totalRetrieved).toBe(3);
  });

  it('returns empty aggregation metrics when no papers are provided', () => {
    const result = aggregatePapersByYear([]);
    expect(result.buckets).toEqual([]);
    expect(result.minYear).toBeNull();
    expect(result.maxYear).toBeNull();
    expect(result.peakYear).toBeNull();
    expect(result.totalRetrieved).toBe(0);
  });
});
