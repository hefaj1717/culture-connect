import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { AlertCircle, Inbox, RefreshCcw } from 'lucide-react-native';

import { CardStyles, Colors } from '@/constants/theme';

type AsyncStateTone = 'card' | 'inline';

type AsyncStateProps = {
  actionLabel?: string;
  body?: string;
  compact?: boolean;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  title: string;
  tone?: AsyncStateTone;
};

function getContainerClass(tone: AsyncStateTone, compact?: boolean) {
  const padding = compact ? 'p-3' : 'p-5';

  if (tone === 'inline') {
    return `${padding} rounded-2xl bg-canvas`;
  }

  return `${padding} rounded-3xl border border-primary/10 bg-white`;
}

export function LoadingState({
  body,
  compact,
  style,
  title = 'Loading',
  tone = 'card',
}: Omit<AsyncStateProps, 'actionLabel' | 'onAction'>) {
  return (
    <View className={getContainerClass(tone, compact)} style={[CardStyles.soft, style]}>
      <View className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-2xl bg-primary/10">
          <ActivityIndicator color={Colors.light.primary} size="small" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-ui text-[14px] font-extrabold text-ink">{title}</Text>
          {body ? <Text className="mt-0.5 text-[12px] leading-4 text-muted">{body}</Text> : null}
        </View>
      </View>
    </View>
  );
}

export function ErrorState({
  actionLabel,
  body,
  compact,
  onAction,
  style,
  title = 'Something went wrong',
  tone = 'card',
}: AsyncStateProps) {
  return (
    <View
      className={`${getContainerClass(tone, compact)} border-destructive/15 bg-destructive/5`}
      style={[CardStyles.soft, style]}
    >
      <View className="flex-row items-start gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertCircle color={Colors.light.accentDeep} size={18} strokeWidth={2.4} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-ui text-[14px] font-extrabold text-ink">{title}</Text>
          {body ? <Text className="mt-1 text-[12px] leading-4 text-muted">{body}</Text> : null}
          {onAction ? (
            <Pressable
              onPress={onAction}
              className="mt-3 flex-row items-center self-start rounded-full bg-white px-3 py-1.5 active:opacity-80"
            >
              <RefreshCcw color={Colors.light.primary} size={13} strokeWidth={2.4} />
              <Text className="ml-1.5 text-[11px] font-extrabold text-primary">
                {actionLabel ?? 'Try again'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function EmptyState({
  actionLabel,
  body,
  compact,
  onAction,
  style,
  title,
  tone = 'card',
}: AsyncStateProps) {
  return (
    <View className={getContainerClass(tone, compact)} style={[CardStyles.soft, style]}>
      <View className="flex-row items-start gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-2xl bg-primary/10">
          <Inbox color={Colors.light.primary} size={18} strokeWidth={2.4} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-ui text-[14px] font-extrabold text-ink">{title}</Text>
          {body ? <Text className="mt-1 text-[12px] leading-4 text-muted">{body}</Text> : null}
          {onAction ? (
            <Pressable
              onPress={onAction}
              className="mt-3 self-start rounded-full bg-primary px-3 py-1.5 active:opacity-80"
            >
              <Text className="text-[11px] font-extrabold text-white">{actionLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
