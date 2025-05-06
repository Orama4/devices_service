/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node", // Environnement Node.js
  preset: "ts-jest", // Utiliser ts-jest pour TypeScript
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {}], // Transformer les fichiers TypeScript
  },
  testMatch: ["**/src/tests/*.test.ts"], // Cibler uniquement les fichiers de test dans src/tests
  collectCoverage: true, // Activer la collecte de couverture
  coverageDirectory: "coverage", // Dossier de sortie pour le rapport de couverture
  coverageReporters: ["text", "html"], // Formats de rapport de couverture
  verbose: true, // Afficher des informations détaillées
};