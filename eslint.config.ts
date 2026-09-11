import antfu from "@antfu/eslint-config";

export default antfu(
  {
    ignores: ["vendor/**/*"],
    stylistic: {
      quotes: "double",
      semi: true,
    },
  },
);
