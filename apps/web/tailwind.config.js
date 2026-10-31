/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        void: '#07090e',
        'void-darker': '#040508',
        'surface-card': '#0e131d',
        'surface-hover': '#161e2e',
        'surface-border': '#1e293b',
        'neon-cyan': '#00f0ff',
        'neon-matrix': '#00ff66',
        'neon-amber': '#ffb800',
        'neon-alert': '#ff003c',
        'neon-psionic': '#bf00ff'
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace']
      }
    }
  },
  plugins: []
};
