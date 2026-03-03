// @ts-nocheck
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        betrayal: {
          black: '#0A0A0A',
          red: '#8B0000',
          'red-light': '#A80000',
          gold: '#C9A84C',
          'gold-light': '#E2C068',
          dark: '#1A1A1A',
          gray: '#2A2A2A',
          'gray-light': '#3A3A3A',
          text: '#E8E8E8',
          muted: '#9A9A9A',
        },
      },
      fontFamily: {
        cinzel: ['var(--font-cinzel)', 'serif'],
        playfair: ['var(--font-playfair)', 'serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'vignette': 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.8) 100%)',
      },
      animation: {
        'flicker': 'flicker 3s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'dramatic-reveal': 'dramaticReveal 0.8s ease-out forwards',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
          '25%, 75%': { opacity: '0.95' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(201, 168, 76, 0.3)' },
          '50%': { boxShadow: '0 0 25px rgba(201, 168, 76, 0.7)' },
        },
        dramaticReveal: {
          from: { opacity: '0', transform: 'scale(0.8) translateY(30px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      boxShadow: {
        'gold': '0 0 20px rgba(201, 168, 76, 0.4)',
        'red': '0 0 20px rgba(139, 0, 0, 0.5)',
        'inner-dark': 'inset 0 2px 10px rgba(0,0,0,0.8)',
      },
    },
  },
  plugins: [],
};

export default config;
