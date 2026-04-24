import { defineConfig } from 'vite-plus';

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
});
