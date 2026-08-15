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
        glow: '0 0 24px rgba(255, 122, 61, 0.25)'
      }
    }
  },
  plugins: []
}
