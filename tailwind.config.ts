import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg: '#0c0c0e',
        'bg-2': '#131316',
        surface: '#17171b',
        'surface-2': '#1d1d22',
        'surface-3': '#25252b',
        border: '#2a2a31',
        'border-2': '#35353e',
        text: '#f2ece1',
        'text-2': '#a39d92',
        'text-3': '#6b665e',
        'text-4': '#44413c',
        accent: '#d4a574',
        'accent-2': '#e8c089',
        ai: '#8ea3d4',
        human: '#c79b6f',
        success: '#7eb89a',
        warning: '#e0a868',
        danger: '#d4827e',
      },
    },
  },
  plugins: [],
};

export default config;
