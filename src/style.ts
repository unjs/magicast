export function detectCodeStyle(code: string) {
  const singleQuotes = countMatches(code, /'[^']+'/g);
  const doubleQuotes = countMatches(code, /"[^"]+"/g);
  return {
    singleQuotes: singleQuotes > doubleQuotes,
    // TODO: semi, trailingComma, printWith, indent, tabWidth, etc
  };
}

function countMatches(input: string, regex: RegExp) {
  return (input.match(regex) || []).length;
}
