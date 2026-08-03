export const OFFLINE_ERROR_MESSAGE = "You're offline. Check your connection, then try again.";

export function isNetworkErrorMessage(message?: string | null) {
  if (!message) return false;

  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes('network request failed') ||
    normalizedMessage.includes('failed to fetch') ||
    normalizedMessage.includes('networkerror') ||
    normalizedMessage.includes('load failed') ||
    normalizedMessage.includes('internet connection') ||
    normalizedMessage.includes('offline')
  );
}

export function getNetworkAwareErrorMessage(
  message: string | null | undefined,
  fallback = 'Something went wrong. Try again.',
) {
  if (isNetworkErrorMessage(message)) {
    return OFFLINE_ERROR_MESSAGE;
  }

  return message || fallback;
}
