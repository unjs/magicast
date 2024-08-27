import unjs from "eslint-config-unjs";

export default unjs(
  {
    rules: {
      "no-useless-constructor": 0,
      "unicorn/empty-brace-spaces": 0,
      "unicorn/expiring-todo-comments": 0,
    },
  },
  {
    ignores: ["vendor/**/*"],
  },
);
