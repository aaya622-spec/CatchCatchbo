import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 따뜻한 뉴트럴 베이스
        cream: {
          50: "#fdfcfa",
          100: "#faf8f4",
          200: "#f4f0e8",
          300: "#ece5d8",
        },
        // 소프트 포인트 컬러
        peach: {
          100: "#fde8dc",
          200: "#fbd0bc",
          300: "#f8b49a",
          400: "#f4906e",
          500: "#ef6c45",
        },
        sage: {
          100: "#e8f0e8",
          200: "#ccdccc",
          300: "#a8c4a8",
          400: "#7ea87e",
        },
        warm: {
          gray: {
            50: "#fafaf9",
            100: "#f5f5f4",
            200: "#e7e5e4",
            300: "#d6d3d1",
            400: "#a8a29e",
            500: "#78716c",
            600: "#57534e",
            700: "#44403c",
            800: "#292524",
            900: "#1c1917",
          },
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Pretendard Variable"',
          "Pretendard",
          '"Apple SD Gothic Neo"',
          '"Noto Sans KR"',
          "sans-serif",
        ],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
