import { Text } from '@/components/ui/text';

type FormFieldErrorProps = {
  message?: string | null;
};

export function FormFieldError({ message }: FormFieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <Text accessibilityLiveRegion="polite" className="-mt-1 mb-3 text-caption text-destructive">
      {message}
    </Text>
  );
}
