import {
  booleanQueryValidator,
  inspectBooleanQuery,
} from './boolean-query.util';
import {FormControl} from '@angular/forms';

describe('boolean-query.util', () => {
  it('accepts simple keywords and complex nested Boolean expressions', () => {
    const validQueries = [
      'drone',
      'drone AND delivery',
      '(drone AND (package OR delivery))',
      '(artificial intelligence OR machine learning) AND healthcare',
      '"autonomous drone" AND NOT military',
      'title:robotics AND yearPublished>=2022',
    ];

    for (const query of validQueries) {
      const result = inspectBooleanQuery(query);
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    }
  });

  it('detects operators and nesting depth accurately', () => {
    const result = inspectBooleanQuery('(drone AND (package OR delivery))');
    expect(result.valid).toBe(true);
    expect(result.operatorsUsed).toEqual(expect.arrayContaining(['AND', 'OR']));
    expect(result.hasNesting).toBe(true);
  });

  it('rejects empty or whitespace-only queries', () => {
    expect(inspectBooleanQuery('').valid).toBe(false);
    expect(inspectBooleanQuery('   ').valid).toBe(false);
  });

  it('rejects unbalanced parentheses and empty parentheses', () => {
    expect(inspectBooleanQuery('(drone AND delivery').valid).toBe(false);
    expect(inspectBooleanQuery('drone AND delivery)').valid).toBe(false);
    expect(inspectBooleanQuery('()').valid).toBe(false);
    expect(inspectBooleanQuery('(drone AND ())').valid).toBe(false);
  });

  it('rejects unclosed quotes and misplaced Boolean operators', () => {
    expect(inspectBooleanQuery('"drone delivery').valid).toBe(false);
    expect(inspectBooleanQuery('AND drone').valid).toBe(false);
    expect(inspectBooleanQuery('drone OR').valid).toBe(false);
    expect(inspectBooleanQuery('drone AND OR delivery').valid).toBe(false);
    expect(inspectBooleanQuery('(AND drone)').valid).toBe(false);
    expect(inspectBooleanQuery('(drone OR)').valid).toBe(false);
  });

  it('integrates with Angular FormControl via booleanQueryValidator', () => {
    const control = new FormControl('(drone AND delivery', {
      nonNullable: true,
      validators: [booleanQueryValidator()],
    });
    expect(control.invalid).toBe(true);
    expect(control.errors?.['booleanSyntax']).toBeTruthy();

    control.setValue('(drone AND delivery)');
    expect(control.valid).toBe(true);
  });
});
