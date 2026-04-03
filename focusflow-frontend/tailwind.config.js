/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#14171F',
        surface: '#1D212B',
        raised: '#262B38',
        border: '#2C3140',
        ink: '#EDEAE0',
        muted: '#8A8F9C',
        work: '#E8A33D',
        rest: '#4FA98C',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'serif'],
        body: ['var(--font-grotesk)', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};
