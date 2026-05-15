import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-base': '#080c12',
        'bg-card': '#0e1420',
        'bg-card-hover': '#141c2e',
        accent: {
          DEFAULT: '#00e5ff',
          dim: '#00b8cc',
        },
        text: {
          primary: '#eef2f8',
          secondary: '#8899b4',
          muted: '#4a5a72',
        },
        aria: '#00e5ff',
        nova: '#3dffb0',
        felix: '#f0c040',
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-syne)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderColor: {
        DEFAULT: 'rgba(0,229,255,0.10)',
        strong: 'rgba(0,229,255,0.25)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern':
          'linear-gradient(rgba(0,229,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.04) 1px, transparent 1px)',
      },
      keyframes: {
        'marquee-scroll': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'scroll-up': {
          from: { transform: 'translateY(0)' },
          to: { transform: 'translateY(-50%)' },
        },
        'scroll-down': {
          from: { transform: 'translateY(-50%)' },
          to: { transform: 'translateY(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.8)' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        typing: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        marquee: 'marquee-scroll 32s linear infinite',
        'scroll-up': 'scroll-up 40s linear infinite',
        'scroll-down': 'scroll-down 40s linear infinite',
        'pulse-dot': 'pulse-dot 1.6s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        typing: 'typing 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
