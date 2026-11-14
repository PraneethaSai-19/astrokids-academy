/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#101C3D', 700: '#1B2B5C', 600: '#27397A', 900: '#0A1230' },
        galaxy: '#C99BFA',
        planet: '#66CDEB',
        star: '#FFCB69',
        blush: '#FFB8D0',
        mint: '#A8E6CF',
      },
      fontFamily: { sans: ['Nunito', 'Poppins', 'system-ui', 'sans-serif'] },
      boxShadow: {
        glow: '0 0 30px rgba(201,155,250,0.35)',
        chunky: '0 6px 0 rgba(0,0,0,0.25)',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
        twinkle: { '0%,100%': { opacity: 0.25 }, '50%': { opacity: 1 } },
        wiggle: { '0%,100%': { transform: 'rotate(-4deg)' }, '50%': { transform: 'rotate(4deg)' } },
      },
      animation: {
        float: 'float 5s ease-in-out infinite',
        twinkle: 'twinkle 3s ease-in-out infinite',
        wiggle: 'wiggle 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
