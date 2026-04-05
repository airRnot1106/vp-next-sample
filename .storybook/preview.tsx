import addonA11y from '@storybook/addon-a11y';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import { definePreview } from '@storybook/nextjs-vite';
import { ThemeProvider } from 'next-themes';
import { INITIAL_VIEWPORTS } from 'storybook/viewport';

import '../src/app/globals.css';

// @keep-sorted
export default definePreview({
  addons: [addonA11y()],
  decorators: [
    withThemeByDataAttribute({
      themes: {
        light: 'light',
        dark: 'dark',
      },
      defaultTheme: 'light',
      attributeName: 'data-theme',
    }),
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
  // @keep-sorted
  parameters: {
    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    viewport: {
      options: {
        xs: {
          name: 'Extra Small',
          styles: {
            width: '375px',
            height: '100%',
          },
        },
        sm: {
          name: 'Small',
          styles: {
            width: '640px',
            height: '100%',
          },
        },
        md: {
          name: 'Medium',
          styles: {
            width: '768px',
            height: '100%',
          },
        },
        lg: {
          name: 'Large',
          styles: {
            width: '1024px',
            height: '100%',
          },
        },
        xl: {
          name: 'Extra Large',
          styles: {
            width: '1280px',
            height: '100%',
          },
        },
        ...INITIAL_VIEWPORTS,
      },
    },
  },
});
