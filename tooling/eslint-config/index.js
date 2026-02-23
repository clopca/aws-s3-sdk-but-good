import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      ...tseslint.configs.recommended,
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    ignores: ["dist/", "node_modules/", ".turbo/"],
  }
);
