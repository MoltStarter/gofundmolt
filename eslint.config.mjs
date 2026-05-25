import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      react: {
        version: "19.2.6",
      },
    },
  },
];

export default eslintConfig;
