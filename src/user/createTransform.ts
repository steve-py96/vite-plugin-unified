import type { Transform } from '../types';

export { createTransform };

const createTransform =
  (callback: Transform): Transform =>
  async (content, context) =>
    callback(content, context);
