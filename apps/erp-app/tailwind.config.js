/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -30px) scale(1.05)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.95)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(40px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(10%, -20%) scale(1.1)' },
          '50%': { transform: 'translate(-15%, 10%) scale(0.95)' },
          '75%': { transform: 'translate(5%, 15%) scale(1.05)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        float: 'float 20s ease-in-out infinite',
        floatReverse: 'float 25s ease-in-out infinite reverse',
        fadeInUp: 'fadeInUp 0.75s ease-out both',
        'fadeInUp-delay-1': 'fadeInUp 0.75s ease-out 0.12s both',
        'fadeInUp-delay-2': 'fadeInUp 0.75s ease-out 0.24s both',
        'fadeInUp-delay-3': 'fadeInUp 0.75s ease-out 0.36s both',
        'fadeInUp-delay-4': 'fadeInUp 0.75s ease-out 0.48s both',
        blob: 'blob 18s ease-in-out infinite',
        blobSlow: 'blob 24s ease-in-out infinite',
        glowPulse: 'glowPulse 4s ease-in-out infinite',
      },
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
