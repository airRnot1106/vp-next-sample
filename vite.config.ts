import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { defineConfig } from 'vite-plus';
import { playwright } from 'vite-plus/test/browser-playwright';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  // @keep-sorted
  fmt: {
    semi: true,
    singleQuote: true,
    sortImports: {
      groups: [
        ['type-builtin', 'value-builtin'],
        ['type-external', 'type-internal', 'value-external', 'value-internal'],
        [
          'type-index',
          'type-parent',
          'type-sibling',
          'value-index',
          'value-parent',
          'value-sibling',
        ],
        ['unknown'],
      ],
      newlinesBetween: true,
      order: 'asc',
    },
    sortPackageJson: true,
    trailingComma: 'all',
  },
  lint: { options: { typeAware: true, typeCheck: true } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'browser',
          browser: {
            enabled: true,
            provider: playwright({}),
            headless: true,
            // https://vitest.dev/config/browser/playwright
            instances: [
              {
                browser: 'chromium',
              },
            ],
          },
          include: ['src/**/*.test.{ts,tsx}'],
          includeSource: ['src/**/*.{ts,tsx}'],
        },
      },
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [
              {
                browser: 'chromium',
              },
            ],
          },
        },
      },
    ],
  },
});
