export function retryDelay(failures) {
  return Math.min(30000, 2000 * 2 ** Math.min(Math.max(0, failures - 1), 4));
}
