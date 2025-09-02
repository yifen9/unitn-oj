export function logError(msg: string, fields?: Record<string, unknown>) {
  console.error(JSON.stringify({ level: 'error', msg, ...(fields ?? {}) }));
}
export function logInfo(msg: string, fields?: Record<string, unknown>) {
  console.log(JSON.stringify({ level: 'info', msg, ...(fields ?? {}) }));
}