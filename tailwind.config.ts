import type { Config } from "tailwindcss"

const config = {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['var(--font-funnel-sans-light)', 'Inter', 'system-ui', 'sans-serif'],
        'display': ['var(--font-funnel-display-bold)', 'Georgia', 'Times', 'serif'],
        'serif': ['var(--font-funnel-display-bold)', 'Georgia', 'Times', 'serif'],
        'funnel': ['var(--font-funnel-sans-light)', 'Inter', 'system-ui', 'sans-serif'],
        'funnel-display-bold': ['var(--font-funnel-display-bold)', 'Georgia', 'Times', 'serif'],
        'funnel-sans-light': ['var(--font-funnel-sans-light)', 'Inter', 'system-ui', 'sans-serif'],
        // Keep NYT font for backward compatibility
        'nyt': ['Georgia', 'Times', 'serif'],
      },
      colors: {
        // cinamini Cinema Theme Colors - New Sophisticated Palette
        cinema: {
          red: '#99251d',           // Deep Cinema Red (153,37,29)
          'red-dark': '#7a1d16',    // Darker variant for hovers
          'red-light': '#b52d20',   // Lighter variant for highlights
          gold: '#ebbb4a',          // Warm Golden Yellow (235,187,74)  
          'gold-light': '#f7ee8b',  // Light Golden Yellow (247,238,139)
          'gold-dark': '#d4a935',   // Darker gold for depth
          green: '#278646',         // Cinema Green (39,134,70)
          charcoal: '#3a3a3c',      // Dark Charcoal (58,58,60)
          silver: '#d1d2d4',        // Light Silver (209,210,212)
        },
        // Game State Colors (maintained for UX consistency)
        game: {
          correct: '#6AAA64',
          present: '#C9B458', 
          absent: '#787C7E',
        },
        // Refined neutral palette based on new charcoal/silver
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#EEEEEE',
          300: '#E0E0E0',
          400: '#BDBDBD',
          500: '#9E9E9E',
          600: '#757575',
          700: '#3a3a3c',          // Updated to match charcoal
          800: '#2d2d2f',          // Darker charcoal variant
          900: '#1f1f20',          // Deepest charcoal
        },
      },
      typography: {
        DEFAULT: {
          css: {
            'font-family': 'var(--font-funnel-display), Inter, system-ui, sans-serif',
            'line-height': '1.6',
            'h1, h2, h3, h4, h5, h6': {
              'font-family': 'var(--font-funnel-display-bold), Georgia, Times, serif',
            },
          },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'confetti-fall': 'confettiFall 3s ease-out forwards',
        'achievement-glow': 'achievementGlow 2s ease-in-out infinite',
        'celebration-bounce': 'celebrationBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        confettiFall: {
          '0%': { 
            transform: 'translateY(-100vh) rotate(0deg)',
            opacity: '1'
          },
          '100%': { 
            transform: 'translateY(100vh) rotate(720deg)',
            opacity: '0'
          },
        },
        achievementGlow: {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(255, 215, 0, 0.3)'
          },
          '50%': {
            boxShadow: '0 0 40px rgba(255, 215, 0, 0.6), 0 0 60px rgba(255, 215, 0, 0.4)'
          },
        },
        celebrationBounce: {
          '0%': { 
            transform: 'scale(0) rotate(-180deg)',
            opacity: '0'
          },
          '50%': {
            transform: 'scale(1.2) rotate(-90deg)',
            opacity: '1'
          },
          '100%': {
            transform: 'scale(1) rotate(0deg)',
            opacity: '1'
          },
        },
        float: {
          '0%, 100%': {
            transform: 'translateY(0px) rotate(0deg)'
          },
          '33%': {
            transform: 'translateY(-10px) rotate(5deg)'
          },
          '66%': {
            transform: 'translateY(5px) rotate(-3deg)'
          },
        },
        shimmer: {
          '0%': {
            backgroundPosition: '-200% 0'
          },
          '100%': {
            backgroundPosition: '200% 0'
          },
        },
      },
      boxShadow: {
        'nyt': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'nyt-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
      },
    },
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
    },
  },
} satisfies Config

export default config