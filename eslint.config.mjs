import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/next-env.d.ts",
      "**/*.config.{ts,cts,mts}",
      "packages/db/drizzle/**",
    ],
  },
  {
    files: ["**/*.ts"],
    extends: [...tseslint.configs.recommended],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // apps/web (Next.js App Router) — was UNLINTED (react reviewer flagged the
    // eslint.config ignoring apps/web as CRITICAL: `next lint` lints zero files).
    // Now typescript-eslint-enforced on every .ts/.tsx. (react-hooks + jsx-a11y
    // are a follow-up — their plugin install was blocked by a flaky registry.)
    files: ["apps/web/**/*.{ts,tsx}"],
    extends: [...tseslint.configs.recommended],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
