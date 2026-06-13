

export const extractJson = (text: string): string => {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("No JSON object found in AI response");
  }
  return text.slice(firstBrace, lastBrace + 1);
};
