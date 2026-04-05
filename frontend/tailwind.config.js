/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        mentor: {
          bg: '#0B0F19', // deep midnight blue
          bgSubtle: '#121826', // slightly lighter background block
          panel: 'rgba(23, 30, 46, 0.65)', // translucent panel base
          panelSolid: '#171E2E', // solid panel base
          panelHover: '#1F293F', // panel hover state
          border: 'rgba(139, 92, 246, 0.15)', // subtle purple-tinted border
          borderLight: 'rgba(255, 255, 255, 0.08)',
          purple: '#8B5CF6',
          purpleDark: '#6D28D9',
          purpleGlow: 'rgba(139, 92, 246, 0.4)',
          cyan: '#06B6D4',
          cyanGlow: 'rgba(6, 182, 212, 0.4)',
          text: '#F8FAFC',
          textMuted: '#94A3B8',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444'
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.25)',
        'glow-purple-strong': '0 0 30px rgba(139, 92, 246, 0.4)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.25)',
        'panel': '0 8px 32px 0 rgba(0, 0, 0, 0.37)', // glassmorphism default shadow
        'panel-hover': '0 12px 40px 0 rgba(0, 0, 0, 0.5)', 
      },
    },
  },
  plugins: [],
}
