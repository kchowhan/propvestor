module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parserOptions: { 
    ecmaVersion: "latest", 
    sourceType: "module"
  },
  extends: [
    "eslint:recommended", 
    "plugin:import/recommended", 
    "prettier"
  ],
  settings: { 
    "import/resolver": { 
      node: { extensions: [".js", ".ts"] } 
    } 
  },
  rules: {
    "import/no-unresolved": "off"
  },
  overrides: [
    {
      files: ['*.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      },
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:import/recommended",
        "prettier"
      ],
      rules: {
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
        "@typescript-eslint/no-require-imports": "off", // Allow require() for dynamic imports
        "import/no-unresolved": "off", // TypeScript handles module resolution
        "no-empty": "warn", // Allow empty catch blocks (common in test cleanup)
        "no-case-declarations": "warn", // Allow declarations in case blocks
        "prefer-const": "warn" // Warn instead of error
      }
    }
  ]
};
