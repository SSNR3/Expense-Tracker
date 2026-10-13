/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        surface: {
          900: '#0A0B0F',
          800: '#111318',
          700: '#181B22',
          600: '#1E2129',
          500: '#252932',
          400: '#2E3340',
        },
        accent: {
          DEFAULT: '#6C63FF',
          dim: '#6C63FF22',
          glow: '#6C63FF44',
        },
        emerald: { DEFAULT: '#10D98A' },
        rose: { DEFAULT: '#FF5E7A' },
        amber: { DEFAULT: '#FFAA3B' },
        sky: { DEFAULT: '#38BDF8' },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': 'radial-gradient(at 40% 20%, hsla(260,80%,60%,0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189,100%,56%,0.05) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(355,100%,93%,0.03) 0px, transparent 50%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
      boxShadow: {
        'glass': '0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.4)',
        'accent': '0 0 24px rgba(108,99,255,0.25)',
        'card': '0 2px 12px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [],
}
