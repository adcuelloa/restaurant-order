import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        React: "readonly",
        console: "readonly",
        crypto: "readonly",
        document: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        URL: "readonly",
        window: "readonly",
      },
    },
  },
  { ignores: ["dist", "node_modules", "**/*.config.*"] },
];
