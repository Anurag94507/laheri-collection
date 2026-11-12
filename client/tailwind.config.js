/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0F1B3C',
          900: '#0A132C',
          800: '#14244C',
          700: '#1B315F',
          600: '#24406F',
          500: '#33538a',
        },
        gold: {
          DEFAULT: '#C9A84C',
          light: '#E8D5A3',
          dark: '#A4832F',
        },
        parchment: '#E8D5A3',
        surface: '#F7F3EC',
        ink: '#1A1A2E',
        success: '#2D6A4F',
        error: '#C1121F',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['12px', '18px'],
        sm: ['14px', '21px'],
        base: ['16px', '26px'],
        lg: ['20px', '30px'],
        xl: ['28px', '36px'],
        '2xl': ['40px', '46px'],
        '3xl': ['56px', '60px'],
      },
      boxShadow: {
        soft: '0 20px 50px -30px rgba(15, 27, 60, 0.35)',
        lift: '0 25px 60px -30px rgba(15, 27, 60, 0.55)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        shimmer: 'shimmer 8s linear infinite',
        float: 'float 6s ease-in-out infinite',
        marquee: 'marquee 26s linear infinite',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
