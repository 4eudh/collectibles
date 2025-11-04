export function getUTCNow() {
  return new Date().toISOString();
}

export function hoursBetween(dateA, dateB) {
  const diff = Math.abs(new Date(dateA).getTime() - new Date(dateB).getTime());
  return diff / (1000 * 60 * 60);
}

export function isBeforeNow(date) {
  return new Date(date).getTime() < Date.now();
}
