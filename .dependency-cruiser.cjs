module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular dependencies are forbidden.",
      from: {},
      to: { circular: true },
    },
    {
      name: "domain-stays-pure",
      severity: "error",
      comment: "Domain must not import from application, infrastructure, or presentation.",
      from: { path: "^src/domain" },
      to: { path: "^src/(application|infrastructure|presentation)" },
    },
    {
      name: "application-no-infra-or-ui",
      severity: "error",
      comment: "Application must not import from infrastructure or presentation.",
      from: { path: "^src/application" },
      to: { path: "^src/(infrastructure|presentation)" },
    },
    {
      name: "infrastructure-no-presentation",
      severity: "error",
      comment: "Infrastructure must not import from presentation.",
      from: { path: "^src/infrastructure" },
      to: { path: "^src/presentation" },
    },
    {
      name: "presentation-no-infrastructure",
      severity: "error",
      comment:
        "Presentation must not import from infrastructure (depend on application ports instead).",
      from: { path: "^src/presentation" },
      to: { path: "^src/infrastructure" },
    },
    {
      name: "shared-stays-pure",
      severity: "error",
      comment: "Shared utilities must not depend on any other layer.",
      from: { path: "^src/shared" },
      to: { path: "^src/(domain|application|infrastructure|presentation)" },
    },
  ],
  options: {
    tsConfig: { fileName: "tsconfig.json" },
    doNotFollow: { path: "node_modules" },
    includeOnly: "^src/",
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
