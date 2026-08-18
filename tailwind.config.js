/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0A0E14',
          900: '#0F141C',
          800: '#161C27',
          700: '#212936',
          600: '#2E3846',
          500: '#4A5568',
          400: '#7A8699',
          300: '#A8B2C0',
          100: '#E8ECF1'
        },
        signal: {
          DEFAULT: '#FF7A3D',
          dim: '#B85A2C',
          glow: '#FFA36C'
        },
        threat: {
          critical: '#FF4D5E',
          high: '#FF7A3D',
          medium: '#F2C94C',
          low: '#4ADE80',
          info: '#4A9BFF'
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        body: ['"Inter"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 24px rgba(255, 122, 61, 0.25)',
        'glow-lg': '0 0 35px rgba(255, 122, 61, 0.35)',
        'glow-critical': '0 0 25px rgba(255, 77, 94, 0.3)'
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
        'pulse-glow': 'pulseGlow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite'
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 1, filter: 'drop-shadow(0 0 8px rgba(255, 122, 61, 0.6))' },
          '50%': { opacity: 0.5, filter: 'drop-shadow(0 0 2px rgba(255, 122, 61, 0.2))' }
        },
        scanline: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 100%' }
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' }
        }
      }
    }
  },
  plugins: []
}

