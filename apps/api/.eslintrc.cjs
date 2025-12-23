module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  extends: ["eslint:recommended", "plugin:import/recommended", "prettier"],
  settings: { "import/resolver": { node: { extensions: [".js", ".ts"] } } },
  rules: {
    "import/no-unresolved": "off"
  }
};
