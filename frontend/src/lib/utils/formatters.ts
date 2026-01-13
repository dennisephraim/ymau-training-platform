/**
 * Format seconds into a human-readable duration string
 * @param seconds - Total seconds
 * @returns Formatted string like "1h 30m" or "45m" or "0m"
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return `${minutes}m`;
}

/**
 * Format seconds into MM:SS or HH:MM:SS format
 * @param seconds - Total seconds
 * @returns Formatted string like "1:30:00" or "45:30"
 */
export function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format a date into a readable string
 * @param date - Date object
 * @returns Formatted string like "Jan 15, 2026"
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date into a relative string
 * @param date - Date object
 * @returns Formatted string like "2 days ago" or "just now"
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }

  return formatDate(date);
}

/**
 * Format a percentage value
 * @param value - Number between 0 and 100
 * @returns Formatted string like "75%"
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}
