import {CoreProxySearchResponse, CoreRawWork} from '../models/core-response.model';
import {
  extractPublicationYear,
  mapCoreSearchResponse,
  mapCoreWorkToPaper,
} from './core-mapper.util';

describe('core-mapper.util', () => {
  it('maps a complete CORE API v3 work record accurately', () => {
    const raw: CoreRawWork = {
      id: 987654,
      title: '  Autonomous Drone Package Delivery Routing  ',
      authors: [{name: 'Dr. Elena Rostova'}, {name: 'Marcus Chen'}],
      yearPublished: 2024,
      publishedDate: '2024-05-12T00:00:00',
      abstract: 'A multi-agent routing framework for urban UAV logistics.',
      doi: 'https://doi.org/10.1016/j.uav.2024.05.001',
      journals: [{title: 'Journal of Autonomous Logistics'}],
      publisher: 'Elsevier',
      sourceFulltextUrls: ['https://repository.example.edu/papers/987654.pdf'],
      downloadUrl: 'https://core.ac.uk/download/pdf/987654.pdf',
      documentType: 'research_article',
      language: {code: 'en', name: 'English'},
    };

    const paper = mapCoreWorkToPaper(raw, 0);

    expect(paper.id).toBe('987654');
    expect(paper.title).toBe('Autonomous Drone Package Delivery Routing');
    expect(paper.authors).toEqual(['Dr. Elena Rostova', 'Marcus Chen']);
    expect(paper.publicationYear).toBe(2024);
    expect(paper.doi).toBe('10.1016/j.uav.2024.05.001');
    expect(paper.publisherOrJournal).toBe('Journal of Autonomous Logistics');
    expect(paper.paperUrl).toBe('https://repository.example.edu/papers/987654.pdf');
    expect(paper.downloadUrl).toBe('https://core.ac.uk/download/pdf/987654.pdf');
    expect(paper.documentType).toBe('Research article');
    expect(paper.language).toBe('English');
  });

  it('handles missing or malformed metadata without inventing values', () => {
    const sparse: CoreRawWork = {
      id: null,
      title: null,
      authors: null,
      yearPublished: 99999,
      publishedDate: 'not-a-real-date',
      abstract: '   ',
      doi: 'invalid-doi',
      journals: [],
      publisher: null,
      downloadUrl: 'javascript:alert(1)',
    };

    const paper = mapCoreWorkToPaper(sparse, 3);

    expect(paper.id).toBe('core-work-3');
    expect(paper.title).toBe('Untitled research work');
    expect(paper.authors).toEqual([]);
    expect(paper.publicationYear).toBeNull();
    expect(paper.abstract).toBeNull();
    expect(paper.doi).toBeNull();
    expect(paper.publisherOrJournal).toBeNull();
    expect(paper.paperUrl).toBeNull();
    expect(paper.downloadUrl).toBeNull();
  });

  it('falls back to publishedDate when yearPublished is absent', () => {
    expect(extractPublicationYear({publishedDate: '2021-11-04T00:00:00'})).toBe(2021);
    expect(extractPublicationYear({publishedDate: '0000-01-01'})).toBeNull();
  });

  it('extracts DOI from identifiers array when top-level doi is missing', () => {
    const raw: CoreRawWork = {
      id: 42,
      title: 'Identifier Fallback Paper',
      identifiers: [
        {type: 'OAI', identifier: 'oai:repo:42'},
        {type: 'DOI', identifier: 'doi:10.1145/3581783.3612000'},
      ],
    };

    const paper = mapCoreWorkToPaper(raw, 0);
    expect(paper.doi).toBe('10.1145/3581783.3612000');
    expect(paper.paperUrl).toBe('https://doi.org/10.1145/3581783.3612000');
  });

  it('maps a full proxy search response envelope', () => {
    const response: CoreProxySearchResponse = {
      query: '(drone AND delivery)',
      totalHits: 1250,
      limit: 20,
      offset: 0,
      authenticated: true,
      rateLimit: {limit: 100, remaining: 98, retryAfter: null},
      results: [{id: 1, title: 'Paper A', yearPublished: 2023}],
    };

    const envelope = mapCoreSearchResponse(response);
    expect(envelope.query).toBe('(drone AND delivery)');
    expect(envelope.totalHits).toBe(1250);
    expect(envelope.papers).toHaveLength(1);
    expect(envelope.papers[0].publicationYear).toBe(2023);
  });
});
