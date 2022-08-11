import { expect, test } from 'vitest';
import { PLUGIN_CACHE_HEADER } from '../consts';

test('PLUGIN_CACHE_HEADER is the proper header', () => {
  expect(PLUGIN_CACHE_HEADER).toBe('X-VITE-PLUGIN-UNIFIED-CACHE');
});
