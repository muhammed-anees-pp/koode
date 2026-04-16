/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Patient teal theme
        'patient': {
          primary: '#1ABEAA',
          hover: '#18a896',
          dark: '#159584',
          light: 'rgba(26, 190, 170, 0.1)',
        },
        // Psychologist blue theme
        'psycho': {
          primary: '#1188D8',
          hover: '#0e76c0',
          dark: '#1188D8',
          light: 'rgba(17, 136, 216, 0.1)',
        },
        // Admin indigo theme
        'admin': {
          primary: '#6366f1',
          hover: '#4f46e5',
          bg: '#080d1a',
          card: 'rgba(15, 20, 40, 0.95)',
          border: '#1e293b',
          'border-light': '#334155',
        },
        // Gray palette matching the design
        'ui': {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        // Slate for admin dark theme
        'slate': {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        'dm-sans': ['DM Sans', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 25px 30px -5px rgba(0, 0, 0, 0.1), 0 15px 15px -5px rgba(0, 0, 0, 0.06)',
        'patient-sm': '0 2px 4px rgba(26, 190, 170, 0.2)',
        'patient-md': '0 4px 8px rgba(26, 190, 170, 0.3)',
        'patient-lg': '0 4px 16px rgba(26, 190, 170, 0.35)',
        'psycho-sm': '0 2px 4px rgba(17, 136, 216, 0.2)',
        'psycho-md': '0 4px 8px rgba(17, 136, 216, 0.3)',
        'admin-card': '0 20px 60px rgba(0, 0, 0, 0.4)',
        'admin-btn': '0 8px 20px rgba(99, 102, 241, 0.3)',
        'admin-btn-hover': '0 12px 28px rgba(99, 102, 241, 0.4)',
      },
      borderRadius: {
        'sm2': '6px',
        'md2': '10px',
        'lg2': '14px',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out 0.2s both',
        'slide-down': 'slideDown 0.5s ease-out',
        'slide-up-footer': 'slideUp 0.5s ease-out 0.4s both',
        'dropdown': 'dropdownSlideIn 0.2s ease-out',
        'icon-bounce': 'iconBounce 0.8s ease-out 0.4s both',
        'heart-pulse': 'heartPulse 2s ease-in-out infinite',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'ph-fade-up': 'phFadeUp 0.7s ease-out both',
        'orb-float': 'orbFloat 8s ease-in-out infinite alternate',
        'toast-slide-up': 'toastSlideUp 0.3s ease',
        'rp-spin': 'rpSpin 0.9s linear infinite',
        'shake': 'shake 0.4s ease-in-out',
        'apl-dd-fade': 'aplDdFade 0.15s ease',
        'pdm-fade-in': 'pdmFadeIn 0.18s ease',
        'pdm-slide-up': 'pdmSlideUp 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
        'typing-dot': 'typingDot 1.2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          'from': { opacity: '0', transform: 'translateY(-10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          'from': { opacity: '0', transform: 'translateY(10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        dropdownSlideIn: {
          'from': { opacity: '0', transform: 'translateY(-10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        iconBounce: {
          '0%': { opacity: '0', transform: 'scale(0.5) translateY(-20px)' },
          '60%': { transform: 'scale(1.1) translateY(0)' },
          '80%': { transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        heartPulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
        shimmer: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        phFadeUp: {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        orbFloat: {
          'from': { transform: 'translate(0, 0) scale(1)' },
          'to': { transform: 'translate(30px, 20px) scale(1.05)' },
        },
        toastSlideUp: {
          'from': { transform: 'translateY(16px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        rpSpin: {
          'to': { transform: 'rotate(360deg)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-6px)' },
          '75%': { transform: 'translateX(6px)' },
        },
        aplDdFade: {
          'from': { opacity: '0', transform: 'translateY(-6px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        pdmFadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        pdmSlideUp: {
          'from': { opacity: '0', transform: 'translateY(20px) scale(0.97)' },
          'to': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        typingDot: {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '30%': { transform: 'translateY(-4px)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
