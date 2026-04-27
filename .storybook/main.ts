import { defineMain } from '@storybook/nextjs-vite/node';

// @keep-sorted
export default defineMain({
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-mcp',
    '@storybook/addon-themes',
  ],
  features: {
    experimentalRSC: true,
  },
  framework: '@storybook/nextjs-vite',
  staticDirs: ['../public'],
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
});
