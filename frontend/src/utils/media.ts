// В БД лежит только имя файла из MinIO (например "a1b2.mp4").
// Через прокси Vite (/media -> MinIO) собираем из него рабочий адрес.
export const mediaUrl = (value?: string): string => {
  if (!value) return '';
  if (/^(blob:|data:|https?:|\/)/.test(value)) return value;
  return `/media/${value}`;
};