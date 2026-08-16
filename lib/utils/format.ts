/** Date/format helpers (bookstore-ui: display conventions). */

export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value));
}

export function formatDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export function formatTime(value: string | Date): string {
  return new Intl.DateTimeFormat('en-US', { timeStyle: 'short' }).format(new Date(value));
}
