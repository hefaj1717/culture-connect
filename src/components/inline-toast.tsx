import { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';

export function InlineToast({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timeout);
  }, [message, onDismiss]);
  if (!message) return null;
  return <View className="absolute bottom-6 left-5 right-5 z-50 flex-row items-center gap-3 rounded-2xl bg-ink p-4"><CheckCircle2 color={Colors.light.accent} size={20} /><Text className="min-w-0 flex-1 text-[13px] font-semibold text-white">{message}</Text><Pressable accessibilityLabel="Dismiss message" onPress={onDismiss}><X color={Colors.light.onPrimary} size={18} /></Pressable></View>;
}
