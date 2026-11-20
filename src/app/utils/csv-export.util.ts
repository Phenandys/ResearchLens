import {ResearchPaper} from '../models/paper.model';

function escapeCsvCell(value: string): string {
  const sanitized = value.replace(/\r\n|\r|\n/g, ' ');
  if (/[",]/.test(sanitized)) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

/**
 * Generates an RFC-4180 compliant CSV string for the currently retrieved research papers.
 */
export function buildPapersCsv(papers: readonly ResearchPaper[]): string {
  const headers = [
    'ID',
    'Title',
    'Authors',
    'Publication Year',
    'Publisher / Journal',
    'Document Type',
    'DOI',
    'URL',
    'Abstract',
  ];

  const rows = papers.map((paper) => [
    paper.id,
    paper.title,
    paper.authors.join('; '),
    paper.publicationYear !== null ? String(paper.publicationYear) : '',
    paper.publisherOrJournal ?? '',
    paper.documentType ?? '',
    paper.doi ?? '',
    paper.paperUrl ?? '',
    paper.abstract ?? '',
  ]);

  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(','));
  return lines.join('\r\n');
}

export function triggerCsvDownload(papers: readonly ResearchPaper[], query: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined' || papers.length === 0) {
    return;
  }

  const csvContent = buildPapersCsv(papers);
  const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);

  const slug = query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  const link = document.createElement('a');
  link.href = url;
  link.download = `researchlens-${slug || 'results'}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
