/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'ios-blue':   '#007AFF',
        'ios-green':  '#34C759',
        'ios-red':    '#FF3B30',
        'ios-bg':     '#F2F2F7',
        'ios-surface':'#FFFFFF',
        'ios-label':  '#000000',
        'ios-label2': '#3C3C43',
        'ios-label3': '#8E8E93',
        'ios-sep':    '#C6C6C8',
      },
    },
  },
  plugins: [],
};
