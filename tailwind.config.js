// tailwind.config.js
/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
    darkMode: 'class', // Enable dark mode
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}', // Make sure your source files are included
    ],
    theme: {
        extend: {
           fontFamily: {
  sans: ['Tajawal', 'Cairo', 'sans-serif'],
  tajawal: ['Tajawal', 'sans-serif'],
  cairo: ['Cairo', 'sans-serif'],
      },
        },
    },
    plugins: [],
}