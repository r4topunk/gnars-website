import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier/flat";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      ".worktrees/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "references/**",
      "subgraphs/**",
      "scripts/**",
    ],
  },
  {
    // React Compiler rules shipped with eslint-plugin-react-hooks v7 (bundled with
    // Next.js 16). Correctness-critical rules stay as errors. `set-state-in-effect`
    // is disabled because it fires on the standard "fetch-in-effect → setState"
    // pattern that React docs explicitly permit for external-system sync; enforcing
    // it would require rewriting 30+ components without clear correctness win.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/error-boundaries": "error",
      "react-hooks/immutability": "error",
      "react-hooks/purity": "error",
      "react-hooks/refs": "error",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/incompatible-library": "error",
    },
  },
  // Disable rules that conflict with Prettier's formatting
  prettierConfig,
];

export default eslintConfig;
