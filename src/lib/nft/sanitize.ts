const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** Plain text only. Tags, controls, and extra whitespace are removed. */
export function sanitizeText(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  const decoded = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, body: string) => {
      const key = body.toLowerCase();
      if (key.startsWith("#x")) {
        const code = Number.parseInt(key.slice(2), 16);
        return code > 31 && code < 127 ? String.fromCharCode(code) : " ";
      }
      if (key.startsWith("#")) {
        const code = Number.parseInt(key.slice(1), 10);
        return code > 31 && code < 127 ? String.fromCharCode(code) : " ";
      }
      return NAMED[key] ?? " ";
    })
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!decoded) return null;
  return decoded.slice(0, max);
}

export function mentionsPokemon(value: string): boolean {
  return /pok[eé]mon/i.test(value);
}
