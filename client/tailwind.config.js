/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Event type colors
        community: '#2E986A',
        official: '#3B82F6',
        // Day theme — warm beige/amber (Monet)
        sand: {
          50:  '#fdfaf4',
          100: '#faf3e0',
          200: '#f5e6c0',
          300: '#edd89a',
          400: '#e3c46e',
          500: '#d4a843',
          600: '#b88a2e',
          700: '#8f6620',
          800: '#6b4a17',
          900: '#4a3210',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'warm': '0 2px 12px rgba(180, 140, 60, 0.12)',
        'warm-lg': '0 4px 24px rgba(180, 140, 60, 0.18)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [
    // Safe area insets for iPhone notch / home indicator
    function({ addUtilities }) {
      addUtilities({
        '.pb-safe': { paddingBottom: 'env(safe-area-inset-bottom, 0px)' },
        '.pt-safe': { paddingTop: 'env(safe-area-inset-top, 0px)' },
      });
    },
  ],
};
