import { Text } from 'react-native';

type FormFieldErrorProps = {
  message?: string | null;
};

export function FormFieldError({ message }: FormFieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <Text accessibilityLiveRegion="polite" className="-mt-1 mb-3 text-[12px] text-destructive">
      {message}
    </Text>
  );
}
