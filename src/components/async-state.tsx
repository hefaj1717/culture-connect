import {
  ActivityIndicator,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { AlertCircle, Inbox, RefreshCcw, type LucideIcon } from 'lucide-react-native';

import { Colors } from '@/constants/theme';
import { AppSurface } from '@/components/app-surface';
import { Text } from '@/components/ui/text';

type AsyncStateTone = 'card' | 'inline';

type AsyncStateProps = {
  actionLabel?: string;
  body?: string;
  compact?: boolean;
  /** A context-specific symbol explains what this empty space relates to. */
  icon?: LucideIcon | null;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  title: string;
  tone?: AsyncStateTone;
};

export function CardListSkeleton({
  count = 3,
  style,
}: {
  count?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View className="gap-3" style={style} accessibilityLabel="Loading content">
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          className="overflow-hidden rounded-2xl border border-line bg-surface"
          style={{ height: 132 }}
        >
          <View className="h-16 bg-canvas" />
          <View className="gap-2 p-3">
            <View className="h-3 w-4/5 rounded-full bg-subtle" />
            <View className="h-3 w-2/5 rounded-full bg-subtle" />
          </View>
        </View>
      ))}
    </View>
  );
}

export function LoadingState({
  body,
  compact,
  style,
  title = 'Loading',
  tone = 'card',
}: Omit<AsyncStateProps, 'actionLabel' | 'onAction'>) {
  return (
    <AppSurface compact={compact} style={style} tone={tone === 'inline' ? 'inline' : 'default'}>
      <View className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
          <ActivityIndicator color={Colors.light.primary} size="small" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-body font-inter-bold text-ink">{title}</Text>
          {body ? <Text className="mt-0.5 text-caption leading-4 text-muted">{body}</Text> : null}
        </View>
      </View>
    </AppSurface>
  );
}

export function ErrorState({
  actionLabel,
  body,
  compact,
  icon: Icon = AlertCircle,
  onAction,
  style,
  title = 'Something went wrong',
  tone = 'card',
}: AsyncStateProps) {
  return (
    <AppSurface
      compact={compact}
      style={[
        {
          backgroundColor: Colors.light.backgroundElement,
          borderColor: `${Colors.light.primary}1A`,
        },
        style,
      ]}
      tone={tone === 'inline' ? 'inline' : 'default'}
    >
      <View className="flex-row items-stretch gap-3">
        {Icon ? (
          <View className="pt-0.5">
            <Icon color={Colors.light.accent} size={18} strokeWidth={2.35} />
          </View>
        ) : null}
        <View className="min-w-0 flex-1">
          <Text className="text-body font-inter-bold text-ink">{title}</Text>
          {body ? <Text className="mt-1 text-caption leading-4 text-muted">{body}</Text> : null}
          {onAction ? (
            <Pressable
              onPress={onAction}
              className="mt-3 flex-row items-center self-start rounded-full bg-action px-3.5 py-2 active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel={actionLabel ?? 'Try again'}
            >
              <RefreshCcw color={Colors.light.onPrimary} size={13} strokeWidth={2.4} />
              <Text className="ml-1.5 text-caption font-inter-bold text-white">
                {actionLabel ?? 'Try again'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </AppSurface>
  );
}

export function EmptyState({
  actionLabel,
  body,
  compact,
  icon: Icon = Inbox,
  onAction,
  style,
  title,
  tone = 'card',
}: AsyncStateProps) {
  return (
    <AppSurface
      compact={compact}
      style={[
        {
          backgroundColor: Colors.light.backgroundElement,
          borderColor: `${Colors.light.primary}1F`,
        },
        style,
      ]}
      tone={tone === 'inline' ? 'inline' : 'default'}
    >
      <View className="flex-row items-start gap-3.5">
        {Icon ? (
          <View className="h-10 w-10 items-center justify-center rounded-full bg-surface">
            <Icon color={Colors.light.primary} size={19} strokeWidth={2.2} />
          </View>
        ) : null}
        <View className="min-w-0 flex-1">
          <Text className="font-serifRegular text-headline leading-6 text-ink">{title}</Text>
          {body ? <Text className="mt-1 text-footnote leading-5 text-muted">{body}</Text> : null}
          {onAction ? (
            <Pressable
              onPress={onAction}
              className="mt-3 self-start rounded-full bg-action px-3.5 py-2 active:opacity-80"
            >
              <Text className="text-caption font-inter-bold text-white">{actionLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </AppSurface>
  );
}
