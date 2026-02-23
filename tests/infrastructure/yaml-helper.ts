/**
 * Minimal YAML parser for simple key-value and list structures.
 * Only handles the subset needed for pnpm-workspace.yaml parsing.
 */
export function parse(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split("\n");
  let currentKey: string | null = null;
  let currentList: string[] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;

    // Key with colon (e.g., "packages:")
    const keyMatch = trimmed.match(/^(\w+):\s*$/);
    if (keyMatch) {
      if (currentKey && currentList) {
        result[currentKey] = currentList;
      }
      currentKey = keyMatch[1];
      currentList = [];
      continue;
    }

    // Key-value pair (e.g., "key: value")
    const kvMatch = trimmed.match(/^(\w+):\s+(.+)$/);
    if (kvMatch) {
      if (currentKey && currentList) {
        result[currentKey] = currentList;
        currentKey = null;
        currentList = null;
      }
      result[kvMatch[1]] = kvMatch[2];
      continue;
    }

    // List item (e.g., "- \"packages/*\"")
    const listMatch = trimmed.match(/^-\s+["']?([^"']+)["']?$/);
    if (listMatch && currentList) {
      currentList.push(listMatch[1]);
    }
  }

  if (currentKey && currentList) {
    result[currentKey] = currentList;
  }

  return result;
}
