import { defineMain } from '@storybook/nextjs-vite/node';

export default defineMain({
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-mcp',
  ],
  features: {
    experimentalRSC: true,
  },
  framework: '@storybook/nextjs-vite',
  staticDirs: ['../public'],
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
});
