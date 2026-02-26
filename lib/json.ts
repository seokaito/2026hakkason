export function extractJsonObject(text: string): string {
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  throw new Error("JSONが見つかりませんでした。");
}

export function parseJsonText<T>(text: string): T {
  const raw = extractJsonObject(text);
  return JSON.parse(raw) as T;
}
