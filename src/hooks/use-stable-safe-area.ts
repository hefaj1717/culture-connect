import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const IOS_STABLE_TOP_INSET = 60;
const ANDROID_STABLE_TOP_INSET = 24;

export function getStableTopInset(topInset: number) {
  if (Platform.OS === 'ios') {
    return Math.max(topInset, IOS_STABLE_TOP_INSET);
  }

  return Math.max(topInset, ANDROID_STABLE_TOP_INSET);
}

export function useStableTopInset() {
  const insets = useSafeAreaInsets();

  return getStableTopInset(insets.top);
}
