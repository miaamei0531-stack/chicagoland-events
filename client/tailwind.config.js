/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Community event teal
        community: '#2E986A',
        // Official event blue
        official: '#3B82F6',
      },
    },
  },
  plugins: [],
};
