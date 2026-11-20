import {validateBooleanExpression, validateSearchParams} from './validation';

describe('server/validation', () => {
  it('validates and preserves valid Boolean search queries, limits, and offsets', () => {
    const result = validateSearchParams({
      q: '  (drone AND (package OR delivery))  ',
      limit: '50',
      offset: '20',
    });

    expect(result.valid).toBe(true);
    expect(result.data).toEqual({
      q: '(drone AND (package OR delivery))',
      limit: 50,
      offset: 20,
    });
  });

  it('applies default limit and offset when omitted', () => {
    const result = validateSearchParams({q: 'drone'});
    expect(result.valid).toBe(true);
    expect(result.data).toEqual({q: 'drone', limit: 20, offset: 0});
  });

  it('rejects missing or invalid q parameter', () => {
    expect(validateSearchParams({}).valid).toBe(false);
    expect(validateSearchParams({q: '   '}).valid).toBe(false);
    expect(validateSearchParams({q: '(drone AND delivery'}).code).toBe(
      'INVALID_BOOLEAN_QUERY',
    );
  });

  it('rejects out-of-range limit and offset values', () => {
    expect(validateSearchParams({q: 'drone', limit: '0'}).code).toBe('INVALID_LIMIT');
    expect(validateSearchParams({q: 'drone', limit: '101'}).code).toBe('INVALID_LIMIT');
    expect(validateSearchParams({q: 'drone', limit: '12.5'}).code).toBe('INVALID_LIMIT');
    expect(validateSearchParams({q: 'drone', offset: '-1'}).code).toBe('INVALID_OFFSET');
    expect(validateSearchParams({q: 'drone', offset: '10001'}).code).toBe('INVALID_OFFSET');
  });

  it('rejects consecutive or trailing Boolean operators', () => {
    expect(validateBooleanExpression('drone AND OR delivery')).not.toBeNull();
    expect(validateBooleanExpression('drone AND')).not.toBeNull();
    expect(validateBooleanExpression('OR drone')).not.toBeNull();
  });
});
