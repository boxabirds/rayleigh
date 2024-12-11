import { describe, it, expect } from 'vitest';
import { createPath } from './config';

describe('createPath', () => {
  it('should return path without params if no params provided', () => {
    expect(createPath('home')).toBe('/');
    expect(createPath('auth')).toBe('/auth');
  });

  it('should replace path parameters with provided values', () => {
    expect(createPath('communityTag', { tag: 'javascript' }))
      .toBe('/community/tag/javascript');
  });

  it('should properly encode URI components', () => {
    expect(createPath('communityTag', { tag: 'c++' }))
      .toBe('/community/tag/c%2B%2B');
    expect(createPath('communityTag', { tag: 'space test' }))
      .toBe('/community/tag/space%20test');
  });

  it('should throw error when required parameter is missing', () => {
    expect(() => createPath('communityTag', {}))
      .toThrow('Missing parameter: tag');
  });
});