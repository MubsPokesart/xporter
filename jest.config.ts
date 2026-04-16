import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(jsdom|html-encoding-sniffer|@exodus|whatwg-encoding|@jsdom|nwsapi|parse5|acorn|acorn-globals|cssstyle|data-urls|abab|w3c-xmlserializer|webidl-conversions|is-potential-custom-element-name|saxes|symbol-tree|tough-cookie|w3c-hr-time|ws|xml-name-validator)/)",
  ],
};

export default createJestConfig(config);
