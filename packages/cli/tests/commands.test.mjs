import assert from 'node:assert/strict';
import test from 'node:test';

import { ExportDouError } from '../dist/api.js';
import { createExport } from '../dist/commands/exports.js';

test('rejects --all with replies before making a network request', async () => {
  await assert.rejects(
    () => createExport('https://www.douyin.com/video/1234567890123456789', {
      all: true,
      format: 'csv',
      includeReplies: true,
      json: true,
      limit: null,
      output: null,
      pollIntervalSeconds: 3,
      timeoutSeconds: 600,
      wait: false,
    }),
    (error) => error instanceof ExportDouError
      && error.code === 'conflicting_options',
  );
});
