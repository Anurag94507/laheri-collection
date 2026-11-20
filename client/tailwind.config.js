/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Editorial boutique palette. `navy` is the near-black ink and `gold`
        // the antique brass from the LC monogram, so existing screens pick up
        // the new direction without renaming every utility.
        navy: {
          DEFAULT: '#191612',
          900: '#0E0C09',
          800: '#26211B',
          700: '#362F26',
          600: '#463D31',
          500: '#5B4F40',
        },
        gold: {
          DEFAULT: '#9C7C42',
          light: '#C4A972',
          dark: '#6F5730',
        },
        parchment: '#E4D6BE',
        surface: '#F4EFE5',
        paper: '#FAF6EE',
        cream: '#FFFCF6',
        clay: '#A2604B',
        moss: '#5E6448',
        ink: '#191612',
        success: '#2F6B4F',
        error: '#A3352B',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Lato', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['12px', '18px'],
        sm: ['14px', '21px'],
        base: ['16px', '26px'],
        lg: ['20px', '30px'],
        xl: ['28px', '36px'],
        '2xl': ['40px', '44px'],
        '3xl': ['60px', '62px'],
      },
      boxShadow: {
        soft: '0 20px 50px -34px rgba(25, 22, 18, 0.4)',
        lift: '0 32px 70px -38px rgba(25, 22, 18, 0.55)',
        hang: '0 26px 40px -28px rgba(25, 22, 18, 0.4)',
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
        sway: {
          '0%, 100%': { transform: 'rotate(-0.8deg)' },
          '50%': { transform: 'rotate(0.8deg)' },
        },
        bagPop: {
          '0%': { transform: 'scale(1)' },
          '35%': { transform: 'scale(1.16) rotate(-3deg)' },
          '70%': { transform: 'scale(0.97) rotate(1.5deg)' },
          '100%': { transform: 'scale(1)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        spinSlow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        shimmer: 'shimmer 8s linear infinite',
        float: 'float 6s ease-in-out infinite',
        marquee: 'marquee 26s linear infinite',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        sway: 'sway 7s ease-in-out infinite',
        'bag-pop': 'bagPop 0.65s ease-out',
        'fade-up': 'fadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'spin-slow': 'spinSlow 9s linear infinite',
      },
    },
  },
  plugins: [],
};
