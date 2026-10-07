import {describe, it, expect} from 'vitest';
import {cn} from '../utils';

describe('smoke test', () => {
  it('combines css classes correctly', () => {
    const result = cn('base-class', true && 'active-class', false && 'hidden');
    expect(result).toBe('base-class active-class');
  });
});
