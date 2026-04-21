import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier/flat";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "references/**",
      "subgraphs/**",
    ],
  },
  {
    // React Compiler rules shipped with eslint-plugin-react-hooks v7 (bundled with
    // Next.js 16) are new and surface many pre-existing patterns. Keep them visible
    // as warnings so regressions can be addressed incrementally without blocking CI.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/error-boundaries": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/incompatible-library": "warn",
    },
  },
  // Disable rules that conflict with Prettier's formatting
  prettierConfig,
];

export default eslintConfig;
