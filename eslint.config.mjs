import next from "eslint-config-next";

// eslint-config-next 16 ships native flat configs (core-web-vitals + typescript).
const eslintConfig = [
  ...next,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "public/sw.js",
      "public/sw.js.map",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
