import { defineConfig, globalIgnores } from "eslint/config";
import tanstackQuery from "@tanstack/eslint-plugin-query";
import drizzle from "eslint-plugin-drizzle";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import next from "eslint-config-next";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig(
  ...nextVitals,
  ...nextTs,
  ...next,
  prettier,
  tanstackQuery.configs["flat/recommended"],
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    plugins: {
      drizzle,
    },
  },
);

export default eslintConfig;
