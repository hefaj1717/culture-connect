import { ArrowLeft, CalendarDays, Send } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { ScreenHeader } from '@/components/screen-header';
import { Colors } from '@/constants/theme';
import { useCardSwipeBack } from '@/hooks/use-card-swipe-back';
import type { ManagedOrganizerEvent } from '@/lib/organizer-events';

const TITLE_LIMIT = 60;
const BODY_LIMIT = 240;

type OrganizerAnnouncementModalProps = {
  events: ManagedOrganizerEvent[];
  onClose: () => void;
  onPublish: (input: {
    body: string;
    eventId: string | null;
    title: string;
  }) => Promise<{ error: string | null }>;
  stableModalTopInset: number;
  visible: boolean;
};

export function OrganizerAnnouncementModal({
  events,
  onClose,
  onPublish,
  stableModalTopInset,
  visible,
}: OrganizerAnnouncementModalProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [linkedEventId, setLinkedEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const linkableEvents = useMemo(
    () =>
      events.filter((event) => {
        if (event.reviewStatus !== 'approved' || !event.endsAt) return false;

        const endTime = Date.parse(event.endsAt);
        return !Number.isNaN(endTime) && endTime >= Date.now();
      }),
    [events],
  );
  const { closeWithAnimation, gesture, swipeStyle } = useCardSwipeBack({
    onSwipeBack: onClose,
    visible,
  });

  useEffect(() => {
    if (!visible) {
      setTitle('');
      setBody('');
      setLinkedEventId(null);
      setError(null);
      setPublishing(false);
    }
  }, [visible]);

  async function submit() {
    if (publishing) return;
    const normalizedTitle = title.trim();
    const normalizedBody = body.trim();
    if (!normalizedTitle || !normalizedBody) {
      setError('Add both a title and a message.');
      return;
    }

    setPublishing(true);
    setError(null);
    const result = await onPublish({
      body: normalizedBody,
      eventId: linkedEventId,
      title: normalizedTitle,
    });
    setPublishing(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    closeWithAnimation();
  }

  return (
    <Modal animationType="slide" transparent onRequestClose={closeWithAnimation} visible={visible}>
      <GestureDetector gesture={gesture}>
        <Animated.View className="flex-1" style={swipeStyle}>
          <SafeAreaView className="flex-1 bg-canvas" edges={['bottom']}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              className="flex-1"
            >
              <ScrollView
                className="flex-1"
                contentContainerStyle={{
                  paddingBottom: 48,
                  paddingHorizontal: 20,
                  paddingTop: stableModalTopInset + 14,
                }}
                keyboardShouldPersistTaps="handled"
              >
                <Pressable
                  accessibilityLabel="Close announcement"
                  className="mb-5 h-10 w-10 items-center justify-center rounded-full bg-surface active:opacity-75"
                  onPress={closeWithAnimation}
                >
                  <ArrowLeft size={21} color={Colors.light.primary} strokeWidth={2.6} />
                </Pressable>
                <ScreenHeader
                  subtitle="Send one short update to everyone who follows your organizer profile."
                  title="Announcement"
                />

                <View className="mt-5 rounded-feature border border-primary/10 bg-surface p-4">
                  <Text className="text-[12px] font-bold uppercase tracking-wide text-muted">
                    Title
                  </Text>
                  <TextInput
                    accessibilityLabel="Announcement title"
                    className="mt-2 rounded-xl border border-primary/15 bg-canvas px-3 py-3 text-[16px] font-semibold text-ink"
                    maxLength={TITLE_LIMIT}
                    onChangeText={setTitle}
                    placeholder="e.g. Tonight's venue update"
                    placeholderTextColor={Colors.light.textSecondary}
                    value={title}
                  />
                  <Text className="mt-1.5 text-right text-[11px] text-muted">
                    {title.length}/{TITLE_LIMIT}
                  </Text>

                  <Text className="mt-4 text-[12px] font-bold uppercase tracking-wide text-muted">
                    Message
                  </Text>
                  <TextInput
                    accessibilityLabel="Announcement message"
                    className="mt-2 min-h-[118px] rounded-xl border border-primary/15 bg-canvas px-3 py-3 text-[15px] leading-5 text-ink"
                    maxLength={BODY_LIMIT}
                    multiline
                    onChangeText={setBody}
                    placeholder="Share a useful update with your followers."
                    placeholderTextColor={Colors.light.textSecondary}
                    textAlignVertical="top"
                    value={body}
                  />
                  <Text className="mt-1.5 text-right text-[11px] text-muted">
                    {body.length}/{BODY_LIMIT}
                  </Text>
                </View>

                <View className="mt-4">
                  <View className="mb-2 flex-row items-center gap-2">
                    <CalendarDays size={16} color={Colors.light.primary} strokeWidth={2.2} />
                    <Text className="text-[13px] font-bold text-ink">
                      Link an event <Text className="font-medium text-muted">(optional)</Text>
                    </Text>
                  </View>
                  <Pressable
                    className={`rounded-xl border px-3 py-3 ${linkedEventId === null ? 'border-primary bg-primary/10' : 'border-primary/15 bg-surface'} active:opacity-75`}
                    onPress={() => setLinkedEventId(null)}
                  >
                    <Text
                      className={`text-[13px] font-semibold ${linkedEventId === null ? 'text-primary' : 'text-ink'}`}
                    >
                      No event link
                    </Text>
                  </Pressable>
                  {linkableEvents.map((event) => {
                    const selected = linkedEventId === event.id;
                    return (
                      <Pressable
                        className={`mt-2 rounded-xl border px-3 py-3 ${selected ? 'border-primary bg-primary/10' : 'border-primary/15 bg-surface'} active:opacity-75`}
                        key={event.id}
                        onPress={() => setLinkedEventId(event.id)}
                      >
                        <Text
                          className={`text-[13px] font-bold ${selected ? 'text-primary' : 'text-ink'}`}
                          numberOfLines={1}
                        >
                          {event.title}
                        </Text>
                        <Text className="mt-0.5 text-[11px] text-muted" numberOfLines={1}>
                          {event.date} · {event.venueName}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View className="mt-5 rounded-xl bg-accent/10 px-3 py-3">
                  <Text className="text-[12px] leading-5 text-ink">
                    One announcement can be sent per day. Followers can mute announcements without
                    unfollowing you.
                  </Text>
                </View>
                {error ? (
                  <Text className="mt-3 text-[13px] leading-5 text-destructive">{error}</Text>
                ) : null}
                <Pressable
                  accessibilityLabel="Send announcement"
                  className={`mt-5 h-12 flex-row items-center justify-center gap-2 rounded-xl bg-primary ${publishing ? 'opacity-60' : 'active:opacity-85'}`}
                  disabled={publishing}
                  onPress={() => void submit()}
                >
                  {publishing ? (
                    <ActivityIndicator color={Colors.light.onPrimary} />
                  ) : (
                    <Send size={18} color={Colors.light.onPrimary} strokeWidth={2.4} />
                  )}
                  <Text className="text-[15px] font-bold text-white">
                    {publishing ? 'Sending…' : 'Send to followers'}
                  </Text>
                </Pressable>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}
