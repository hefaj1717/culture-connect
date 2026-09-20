/**
 * Retains a submitted field only when the native input unexpectedly clears it.
 * A value typed while an authentication request was pending always wins.
 */
export function retainAuthDraft(currentValue: string, submittedValue: string) {
  return currentValue || submittedValue;
}
