import {TestBed} from '@angular/core/testing';
import {ResearchPaper} from '../../models/paper.model';
import {PaperDetailPanel} from './paper-detail-panel';

describe('PaperDetailPanel', () => {
  const samplePaper: ResearchPaper = {
    id: '42001',
    title: 'Autonomous Swarm Coordination for Urban Drone Delivery',
    authors: ['Dr. Elena Rostova', 'Marcus Chen', 'Priya Nair'],
    publicationYear: 2025,
    publishedDateRaw: '2025-03-14T00:00:00',
    abstract:
      'This study evaluates decentralized collision avoidance and battery-aware routing across heterogeneous urban drone fleets under high wind variability.',
    doi: '10.1016/j.uav.2025.03.014',
    publisherOrJournal: 'Journal of Autonomous Robotics',
    paperUrl: 'https://repository.example.edu/42001',
    downloadUrl: 'https://core.ac.uk/download/42001.pdf',
    documentType: 'Research article',
    language: 'English',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaperDetailPanel],
    }).compileComponents();
  });

  it('does not render dialog when paper input is null', () => {
    const fixture = TestBed.createComponent(PaperDetailPanel);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="paper-detail-panel"]')).toBeNull();
  });

  it('renders full abstract, all authors, and complete bibliographic metadata when a paper is selected', () => {
    const fixture = TestBed.createComponent(PaperDetailPanel);
    fixture.componentRef.setInput('paper', samplePaper);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="paper-detail-panel"]')).toBeTruthy();
    expect(el.querySelector('#paper-detail-title')?.textContent).toContain(samplePaper.title);
    expect(el.querySelector('[data-testid="detail-full-abstract"]')?.textContent).toContain(
      samplePaper.abstract!,
    );
    expect(el.textContent).toContain('Dr. Elena Rostova, Marcus Chen, Priya Nair');
    expect(el.textContent).toContain('10.1016/j.uav.2025.03.014');
    expect(el.textContent).toContain('Journal of Autonomous Robotics');
    expect(el.textContent).toContain('42001');
  });

  it('emits closed when Close button is clicked or Escape is pressed', () => {
    const fixture = TestBed.createComponent(PaperDetailPanel);
    fixture.componentRef.setInput('paper', samplePaper);
    fixture.detectChanges();

    let closeCount = 0;
    fixture.componentInstance.closed.subscribe(() => {
      closeCount++;
    });

    const closeBtn = fixture.nativeElement.querySelector(
      '[data-testid="close-detail-panel"]',
    ) as HTMLButtonElement;
    closeBtn.click();
    expect(closeCount).toBe(1);

    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
    expect(closeCount).toBe(2);
  });
});
