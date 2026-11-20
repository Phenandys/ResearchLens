import {TestBed} from '@angular/core/testing';
import {SearchBar, SearchSubmitEvent} from './search-bar';

describe('SearchBar', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchBar],
    }).compileComponents();
  });

  it('emits exact Boolean query and selected result limit on submit', () => {
    const fixture = TestBed.createComponent(SearchBar);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    let emitted: SearchSubmitEvent | null = null;
    component.searchSubmit.subscribe((event) => {
      emitted = event;
    });

    component.searchForm.setValue({
      query: '(drone AND (package OR delivery))',
      limit: 50,
    });
    component.onSubmit();

    expect(emitted).toEqual({
      query: '(drone AND (package OR delivery))',
      limit: 50,
    });
  });

  it('blocks submission and shows validation error for malformed Boolean syntax', () => {
    const fixture = TestBed.createComponent(SearchBar);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    let emitCount = 0;
    component.searchSubmit.subscribe(() => {
      emitCount++;
    });

    component.searchForm.setValue({
      query: '(drone AND delivery',
      limit: 20,
    });
    component.onSubmit();
    fixture.detectChanges();

    expect(emitCount).toBe(0);
    expect(component.showValidationError()).toBe(true);
    const alertEl = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alertEl?.textContent).toContain('Unclosed opening parenthesis');
  });

  it('runs example Boolean queries with the currently selected result limit', () => {
    const fixture = TestBed.createComponent(SearchBar);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    let emitted: SearchSubmitEvent | null = null;
    component.searchSubmit.subscribe((event) => {
      emitted = event;
    });

    component.searchForm.controls.limit.setValue(100);
    component.runExampleQuery('(artificial intelligence OR machine learning) AND healthcare');

    expect(emitted).toEqual({
      query: '(artificial intelligence OR machine learning) AND healthcare',
      limit: 100,
    });
  });

  it('clears the query and emits searchClear when Clear is triggered', () => {
    const fixture = TestBed.createComponent(SearchBar);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    let cleared = false;
    component.searchClear.subscribe(() => {
      cleared = true;
    });

    component.searchForm.controls.query.setValue('drone AND delivery');
    component.onClear();

    expect(component.searchForm.controls.query.value).toBe('');
    expect(cleared).toBe(true);
  });
});
