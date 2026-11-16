/** Removes repeated pasted lines without changing the saved, editable description. */
export function giftDescription(description: string, name: string): string {
  const key = (value: string) =>
    value.normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR');
  const seen = new Set([key(name)]);
  return description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      const normalized = key(line);
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .join('\n');
}
