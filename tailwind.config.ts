/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      colors: {
        apple: {
          blue:   '#0A84FF',
          green:  '#30D158',
          red:    '#FF453A',
          amber:  '#FFD60A',
          purple: '#BF5AF2',
          navy:   '#1C2B3A',
          gray:   '#98989D',
        },
      },
      backdropBlur: { xs: '4px' },
      boxShadow: {
        'glass':    '0 8px 32px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)',
        'glass-lg': '0 20px 60px rgba(0,0,0,.12), 0 4px 16px rgba(0,0,0,.06)',
        'apple':    '0 4px 16px rgba(0,0,0,.08)',
      },
      borderRadius: {
        'apple': '14px',
        'apple-lg': '20px',
        'apple-xl': '28px',
      },
      animation: {
        'fade-in-up': 'fadeInUp 320ms cubic-bezier(0.25,0.46,0.45,0.94) both',
        'pulse-soft': 'pulseBadge 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
