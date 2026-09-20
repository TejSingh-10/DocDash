export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    // -----------------------------------------------------------------------
    // Override defaults entirely for the keys we care about so nothing leaks
    // in from Tailwind's massive default palette.
    // -----------------------------------------------------------------------
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      black: '#000000',

      // Primary accent — blue-indigo, used for interactive elements, links,
      // active states. One hue, five stops — light → dark.
      primary: {
        50:  '#eef2ff',
        100: '#e0e7ff',
        200: '#c7d2fe',
        400: '#818cf8',
        500: '#6366f1',   // default / base
        600: '#4f46e5',   // hover
        700: '#4338ca',   // active / pressed
        900: '#1e1b4b',   // darkest (text on light bg)
      },

      // Neutral grays — used for text, borders, backgrounds.
      // Kept separate from the primary hue so UI chrome stays truly neutral.
      neutral: {
        0:   '#ffffff',
        50:  '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827',
      },

      // Semantic colors — one stop each, kept muted so they don't compete
      // with primary content.
      success: {
        50:  '#f0fdf4',
        500: '#22c55e',
        700: '#15803d',
      },
      warning: {
        50:  '#fffbeb',
        500: '#f59e0b',
        700: '#b45309',
      },
      danger: {
        50:  '#fef2f2',
        500: '#ef4444',
        700: '#b91c1c',
      },
    },

    // -----------------------------------------------------------------------
    // Spacing — 4px base unit, covers most needs without an endless scale.
    // -----------------------------------------------------------------------
    spacing: {
      px:  '1px',
      0:   '0',
      0.5: '2px',
      1:   '4px',
      1.5: '6px',
      2:   '8px',
      2.5: '10px',
      3:   '12px',
      4:   '16px',
      5:   '20px',
      6:   '24px',
      7:   '28px',
      8:   '32px',
      10:  '40px',
      12:  '48px',
      14:  '56px',
      16:  '64px',
      20:  '80px',
      24:  '96px',
      32:  '128px',
      40:  '160px',
      48:  '192px',
      56:  '224px',
      64:  '256px',
      72:  '288px',
      80:  '320px',
      // Sidebar dimensions
      sidebar:         '240px',
      'sidebar-closed': '56px',
    },

    // -----------------------------------------------------------------------
    // Type scale — three tiers: headings, body, meta.
    // -----------------------------------------------------------------------
    fontSize: {
      // Meta / label
      xs:  ['0.75rem',  { lineHeight: '1rem' }],
      sm:  ['0.875rem', { lineHeight: '1.25rem' }],
      // Body
      base: ['1rem',    { lineHeight: '1.5rem' }],
      // Headings
      lg:  ['1.125rem', { lineHeight: '1.75rem' }],
      xl:  ['1.25rem',  { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem',{ lineHeight: '2.25rem' }],
    },

    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
    },

    fontWeight: {
      normal:   '400',
      medium:   '500',
      semibold: '600',
      bold:     '700',
    },

    borderRadius: {
      none: '0',
      sm:   '0.25rem',
      DEFAULT: '0.375rem',
      md:   '0.5rem',
      lg:   '0.75rem',
      xl:   '1rem',
      full: '9999px',
    },

    boxShadow: {
      none: 'none',
      // One subtle shadow level — no heavy drop shadows anywhere.
      sm:  '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
      md:  '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
    },

    extend: {
      // Sidebar transition
      transitionProperty: {
        sidebar: 'width, transform',
      },
      // Ring offset for focus styles
      ringOffsetWidth: {
        DEFAULT: '2px',
      },
    },
  },
  plugins: [],
};
