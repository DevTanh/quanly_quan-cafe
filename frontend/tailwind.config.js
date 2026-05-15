// tailwind.config.js  — thêm vào phần extend
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        tbFade: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        tbSlide: {
          from: { transform: 'translateY(24px) scale(0.97)', opacity: '0' },
          to:   { transform: 'translateY(0) scale(1)',       opacity: '1' },
        },
      },
      animation: {
        // dùng trong className: animate-[tbFade_0.15s_ease]  animate-[tbSlide_0.22s_...]
        // Tailwind v3 tự resolve arbitrary animation nên 2 dòng này chỉ cần nếu muốn shorthand
      },
    },
  },
  plugins: [],
};
