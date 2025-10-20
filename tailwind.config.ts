import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  // content: [
  //   ...,
  //   "./app/**/*.{js,ts,jsx,tsx,mdx}",
  // ],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gradient-button":
          "linear-gradient(to right, #C27CBC, #D3FF00, #3BE32D)",
        "gradient-airdrop-page-header":
          "linear-gradient(91.14deg, #44F756 3.72%, #D3EB2F 46.54%, #D684F5 84.36%, #ADA3D9 91.13%)",
        "gradient-navbar-myjok":
          "linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(153, 153, 153, 0.15) 100%)",
        "gradient-airdrop-start-popup1":
          "linear-gradient(180deg, #C14AB1 0%, #AE9FD6 100%)",
        "gradient-airdrop-start-popup2":
          "linear-gradient(180deg, #4FF852 0%, #DE82F8 37%, #B8E100 57%, #CBFF00 99.99%, #AE9FD6 100%)",
        "gradient-home-yield":
          "linear-gradient(217.82deg, rgba(255, 255, 255, 0.1222) 12.44%, rgba(35, 35, 35, 0.13) 76.98%)",
        "gradient-airdrop-text":
          "linear-gradient(90deg, #44F756 0%, #BEED34 46%, #FF61F1 100%)",
      },
      boxShadow: {
        "navbar-shadow": "0px 0px 4px 0px #0000002E",
        "gradient-shadow":
          "0px 10px 20px rgba(68, 247, 86, 0.5), 0px 10px 20px rgba(173, 163, 217, 0.5)",
      },
      keyframes: {
        "slide-up": {
          "0%": {
            transform: "translateY(100%)",
          },
          "100%": {
            transform: "translateY(0)",
          },
        },
        "slide-down": {
          "0%": {
            transform: "translateY(0)",
          },
          "100%": {
            transform: "translateY(100%)",
          },
        },
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        blink: {
          "50%": { opacity: "0" },
        },
        fadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        fadeToSmoke: {
          "0%": { filter: "grayscale(0%) blur(0px)", opacity: "1" },
          "100%": { filter: "grayscale(100%) blur(10px)", opacity: "0" },
        },
        riseSmokeTopRight: {
          "0%": {
            transform: "translateX(0) translateY(0) scale(1)",
            opacity: "0.2",
          },
          "100%": {
            transform: "translateX(-180px) translateY(300px) scale(2.5)",
            opacity: "0",
          },
        },
        riseSmokeTopLeft: {
          "0%": {
            transform: "translateX(0) translateY(0) scale(1)",
            opacity: "0.2",
          },
          "100%": {
            transform: "translateX(180px) translateY(300px) scale(2.5)",
            opacity: "0",
          },
        },
        riseSmokeBottomLeft: {
          "0%": {
            transform: "translateX(0) translateY(0) scale(1)",
            opacity: "0.2",
          },
          "100%": {
            transform: "translateX(150px) translateY(250px) scale(2.5)",
            opacity: "0",
          },
        },
        riseSmokeBottomRight: {
          "0%": {
            transform: "translateX(0) translateY(0) scale(1)",
            opacity: "0.2",
          },
          "100%": {
            transform: "translateX(-150px) translateY(-250px) scale(2.5)",
            opacity: "0",
          },
        },
        "blink-shadow-purple": {
          "0%, 100%": {
            boxShadow: "0 5px 20px rgba(84, 0, 252, 0.8)",
          },
          "50%": {
            boxShadow: "0 5px 20px rgba(84, 0, 252, 0.1)",
          },
        },
        "blink-shadow-green": {
          "0%, 100%": {
            boxShadow: "0 5px 20px rgba(62, 238, 0, 0.8)",
          },
          "50%": {
            boxShadow: "0 5px 20px rgba(62, 238, 0, 0.1)",
          },
        },
        "gradient-glow-blink": {
          "0%, 100%": {
            boxShadow: "3px 3px 8px rgba(62, 238, 0, 0.8)",
          },
          "50%": {
            boxShadow: "3px 3px 8px rgba(62, 238, 0, 0.1)",
          },
        },
      },
      animation: {
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-in",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        blink: "blink 1s step-end infinite",
        fadeOut: "fadeOut 1s infinite",
        fadeToSmoke: "fadeToSmoke 3s forwards",
        riseSmokeTopRight: "riseSmokeTopRight 3s ease-in-out 1",
        riseSmokeTopLeft: "riseSmokeTopLeft 3s ease-in-out 1",
        riseSmokeBottomLeft: "riseSmokeBottomLeft 3s ease-in-out 1",
        riseSmokeBottomRight: "riseSmokeBottomRight 3s ease-in-out 1",
        "blink-shadow-green": "blink-shadow-green 1s infinite",
        "blink-shadow-purple": "blink-shadow-purple 1s infinite",
        "gradient-glow-blink": "gradient-glow-blink 1s infinite",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        customGreen: {
          900: "#002601",
          800: "#016901",
          700: "#007b01",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
