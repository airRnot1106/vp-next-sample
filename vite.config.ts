import { defineConfig } from 'vite-plus';
import { playwright } from 'vite-plus/test/browser-playwright';

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
    name: 'browser',
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      // https://vitest.dev/config/browser/playwright
      instances: [{ browser: 'chromium' }],
    },
    include: ['src/**/*.test.{ts,tsx}'],
    includeSource: ['src/**/*.{ts,tsx}'],
  },
});
