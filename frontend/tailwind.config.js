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
        charcoal: {
          950: '#070809',
          900: '#0c0e12',
          850: '#11141a',
          800: '#161a22',
          700: '#1d232e',
          600: '#252c3a',
          500: '#323c4e',
        },
        surface: {
          900: '#0c0e12',
          800: '#141820',
          700: '#1c222e',
          600: '#242b3b',
          500: '#2e374a',
          400: '#3b465e',
        },
        neonPink: { DEFAULT: '#f72585', glow: '#f7258555' },
        raspberryPlum: { DEFAULT: '#b5179e', glow: '#b5179e55' },
        indigoBloom: { DEFAULT: '#7209b7', glow: '#7209b755' },
        ultrasonicBlue: { DEFAULT: '#560bad', glow: '#560bad55' },
        trueAzure: { DEFAULT: '#480ca8', glow: '#480ca855' },
        vividRoyal: { DEFAULT: '#3a0ca3', glow: '#3a0ca355' },
        persianBlue: { DEFAULT: '#3f37c9', glow: '#3f37c955' },
        electricSapphire: { DEFAULT: '#4361ee', glow: '#4361ee55' },
        cloudySky: { DEFAULT: '#4895ef', glow: '#4895ef55' },
        skyAqua: { DEFAULT: '#4cc9f0', glow: '#4cc9f055' },
        accent: {
          DEFAULT: '#f72585',
          secondary: '#4361ee',
          aqua: '#4cc9f0',
          dim: '#f7258522',
          glow: '#f7258555',
        },
        emerald: { DEFAULT: '#4cc9f0' },
        rose: { DEFAULT: '#f72585' },
        amber: { DEFAULT: '#ffa41b' },
        sky: { DEFAULT: '#4895ef' },
      },
      animation: {
        'fade-in': 'fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'float-slow': 'float 5s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        'shimmer': 'shimmer 4s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(1.04)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
      },
      boxShadow: {
        'glass': '0 0 0 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.6)',
        'neon': '0 0 25px rgba(247, 37, 133, 0.35), 0 0 50px rgba(67, 97, 238, 0.2)',
        'neon-blue': '0 0 25px rgba(67, 97, 238, 0.4), 0 0 45px rgba(76, 201, 240, 0.25)',
      },
    },
  },
  plugins: [],
}
