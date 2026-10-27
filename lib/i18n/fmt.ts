// Replaces {placeholders} in a message.
export function fmt(message: string, vars: Record<string, string | number> = {}) {
  return message.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}
