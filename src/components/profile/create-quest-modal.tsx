import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { ArrowLeft, Camera, Minus, Plus, Route, X } from 'lucide-react-native';
import { useRef } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import { GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { textLimits } from '@/constants/text-limits';
import { cultureCities, type CityId } from '@/data/culture';

type QuestDraftStop = {
  description: string;
  eta: string;
  title: string;
};

type CreateQuestModalProps = {
  createQuestError: string | null;
  creatingQuest: boolean;
  gesture: GestureType;
  onAddStop: () => void;
  onChangeCity: (value: CityId) => void;
  onChangeDescription: (value: string) => void;
  onChangeStatus: (value: 'draft' | 'approved') => void;
  onChangeStop: (index: number, key: keyof QuestDraftStop, value: string) => void;
  onChangeTheme: (value: string) => void;
  onChangeTitle: (value: string) => void;
  onChangeXp: (value: string) => void;
  onClose: () => void;
  onPickQuestImage: () => void;
  onRemoveQuestImage: () => void;
  onRemoveStop: (index: number) => void;
  onSubmit: () => void;
  questCityId: CityId;
  questDescription: string;
  questImageUri: string | null;
  questStatus: 'draft' | 'approved';
  questStops: QuestDraftStop[];
  questTheme: string;
  questTitle: string;
  questXp: string;
  stableModalTopInset: number;
  swipeStyle: AnimatedStyle<ViewStyle>;
  visible: boolean;
};

export function CreateQuestModal({
  createQuestError,
  creatingQuest,
  gesture,
  onAddStop,
  onChangeCity,
  onChangeDescription,
  onChangeStatus,
  onChangeStop,
  onChangeTheme,
  onChangeTitle,
  onChangeXp,
  onClose,
  onPickQuestImage,
  onRemoveQuestImage,
  onRemoveStop,
  onSubmit,
  questCityId,
  questDescription,
  questImageUri,
  questStatus,
  questStops,
  questTheme,
  questTitle,
  questXp,
  stableModalTopInset,
  swipeStyle,
  visible,
}: CreateQuestModalProps) {
  const scrollViewRef = useRef<ScrollView>(null);

  function focusFormArea(y: number) {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ animated: true, y });
    }, 90);
  }

  return (
    <Modal animationType="slide" transparent onRequestClose={onClose} visible={visible}>
      <GestureDetector gesture={gesture}>
        <Animated.View className="flex-1 bg-white" style={swipeStyle}>
          <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              className="flex-1"
            >
              <ScrollView
                ref={scrollViewRef}
                className="flex-1"
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  paddingBottom: 104,
                  paddingTop: stableModalTopInset + 14,
                }}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                scrollIndicatorInsets={{ bottom: 104 }}
                showsVerticalScrollIndicator={false}
              >
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    onClose();
                  }}
                  className="mb-5 h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Close create quest"
                >
                  <ArrowLeft size={21} color="#756F7B" strokeWidth={2.6} />
                </Pressable>

                <View className="mb-5 overflow-hidden rounded-3xl bg-ink">
                  <LinearGradient
                    colors={['rgba(124,58,237,0.74)', 'rgba(36,28,46,0.98)']}
                    end={{ x: 1, y: 1 }}
                    start={{ x: 0, y: 0 }}
                    style={{ padding: 20 }}
                  >
                    <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                      <Route size={24} color="white" strokeWidth={2.4} />
                    </View>
                    <Text className="font-heading text-[29px] font-extrabold leading-[33px] text-white">
                      Create quest
                    </Text>
                    <Text className="mt-2 max-w-[300px] text-[13px] leading-5 text-white/80">
                      Build a curated city trail that appears in the Quests tab.
                    </Text>
                  </LinearGradient>
                </View>

                <Text className="mb-2 text-[13px] font-semibold text-ink">City</Text>
                <View className="mb-4 flex-row gap-2">
                  {cultureCities.map((city) => (
                    <ChoiceChip
                      active={questCityId === city.id}
                      key={city.id}
                      label={city.name}
                      onPress={() => onChangeCity(city.id)}
                    />
                  ))}
                </View>

                <Text className="mb-2 text-[13px] font-semibold text-ink">Quest title</Text>
                <TextInput
                  value={questTitle}
                  onChangeText={onChangeTitle}
                  onFocus={() => focusFormArea(260)}
                  placeholder="e.g. Old Town Culture Trail"
                  placeholderTextColor="#8B909A"
                  maxLength={textLimits.questTitle}
                  className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
                />

                <Text className="mb-2 text-[13px] font-semibold text-ink">Theme</Text>
                <TextInput
                  value={questTheme}
                  onChangeText={onChangeTheme}
                  onFocus={() => focusFormArea(330)}
                  placeholder="City route"
                  placeholderTextColor="#8B909A"
                  maxLength={textLimits.questTheme}
                  className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
                />

                <Text className="mb-2 text-[13px] font-semibold text-ink">Description</Text>
                <TextInput
                  value={questDescription}
                  onChangeText={onChangeDescription}
                  onFocus={() => focusFormArea(420)}
                  placeholder="What story does this trail tell?"
                  placeholderTextColor="#8B909A"
                  multiline
                  textAlignVertical="top"
                  maxLength={textLimits.questDescription}
                  className="mb-4 min-h-[104px] rounded-xl border border-gray-300 px-4 py-3 text-[15px] leading-5 text-ink"
                />
                <Text className="-mt-3 mb-4 text-right text-[11px] text-muted">
                  {questDescription.length}/{textLimits.questDescription}
                </Text>

                <Text className="mb-2 text-[13px] font-semibold text-ink">Quest photo</Text>
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    onPickQuestImage();
                  }}
                  className={`mb-4 h-[154px] overflow-hidden rounded-2xl border ${
                    questImageUri
                      ? 'border-gray-200 bg-gray-100'
                      : 'border-dashed border-primary/45 bg-primary/5'
                  }`}
                >
                  {questImageUri ? (
                    <>
                      <Image
                        source={{ uri: questImageUri }}
                        style={{ flex: 1 }}
                        contentFit="cover"
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(36,28,46,0.58)']}
                        style={{
                          bottom: 0,
                          left: 0,
                          position: 'absolute',
                          right: 0,
                          top: 0,
                        }}
                      />
                      <View className="absolute bottom-4 left-4">
                        <Text className="text-[12px] font-extrabold text-white">Change photo</Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          Keyboard.dismiss();
                          onRemoveQuestImage();
                        }}
                        className="absolute right-3 top-3 h-8 w-8 items-center justify-center rounded-full bg-black/45 active:opacity-80"
                      >
                        <X size={16} color="white" strokeWidth={2.5} />
                      </Pressable>
                    </>
                  ) : (
                    <View className="flex-1 items-center justify-center px-6">
                      <View className="mb-3 h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                        <Camera size={21} color="#7C3AED" strokeWidth={2.5} />
                      </View>
                      <Text className="text-center text-[14px] font-extrabold text-primary">
                        Add quest photo
                      </Text>
                      <Text className="mt-1 text-center text-[12px] leading-4 text-muted">
                        Optional. If you skip it, CultureQuest will use a default trail image.
                      </Text>
                    </View>
                  )}
                </Pressable>

                <View className="mb-4 flex-row gap-3">
                  <View className="flex-1">
                    <Text className="mb-2 text-[13px] font-semibold text-ink">Total XP</Text>
                    <TextInput
                      value={questXp}
                      onChangeText={onChangeXp}
                      onFocus={() => focusFormArea(650)}
                      keyboardType="number-pad"
                      placeholder="150"
                      placeholderTextColor="#8B909A"
                      maxLength={textLimits.rewardXp}
                      className="rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="mb-2 text-[13px] font-semibold text-ink">Status</Text>
                    <View className="flex-row gap-2">
                      <ChoiceChip
                        active={questStatus === 'approved'}
                        label="Live"
                        onPress={() => onChangeStatus('approved')}
                      />
                      <ChoiceChip
                        active={questStatus === 'draft'}
                        label="Draft"
                        onPress={() => onChangeStatus('draft')}
                      />
                    </View>
                  </View>
                </View>

                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="font-heading text-[22px] font-extrabold text-ink">Stops</Text>
                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      onAddStop();
                    }}
                    className="h-9 flex-row items-center gap-1 rounded-full bg-primary px-3 active:opacity-85"
                  >
                    <Plus size={16} color="white" strokeWidth={2.6} />
                    <Text className="text-[12px] font-extrabold text-white">Add</Text>
                  </Pressable>
                </View>

                <View className="gap-3">
                  {questStops.map((stop, index) => (
                    <View
                      className="rounded-2xl border border-gray-200 bg-white p-4"
                      key={`quest-stop-${index}`}
                    >
                      <View className="mb-3 flex-row items-center justify-between">
                        <Text className="text-[12px] font-semibold uppercase tracking-wide text-muted">
                          Stop {index + 1}
                        </Text>
                        {questStops.length > 1 && (
                          <Pressable
                            onPress={() => {
                              Keyboard.dismiss();
                              onRemoveStop(index);
                            }}
                            className="h-8 w-8 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                          >
                            <Minus size={16} color="#756F7B" strokeWidth={2.5} />
                          </Pressable>
                        )}
                      </View>
                      <TextInput
                        value={stop.title}
                        onChangeText={(value) => onChangeStop(index, 'title', value)}
                        onFocus={() => focusFormArea(760 + index * 240)}
                        placeholder="Stop title"
                        placeholderTextColor="#8B909A"
                        maxLength={textLimits.questStopTitle}
                        className="mb-3 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
                      />
                      <TextInput
                        value={stop.description}
                        onChangeText={(value) => onChangeStop(index, 'description', value)}
                        onFocus={() => focusFormArea(820 + index * 240)}
                        placeholder="What should students do here?"
                        placeholderTextColor="#8B909A"
                        multiline
                        textAlignVertical="top"
                        maxLength={textLimits.questStopDescription}
                        className="mb-3 min-h-[82px] rounded-xl border border-gray-300 px-4 py-3 text-[15px] leading-5 text-ink"
                      />
                      <TextInput
                        value={stop.eta}
                        onChangeText={(value) => onChangeStop(index, 'eta', value)}
                        onFocus={() => focusFormArea(920 + index * 240)}
                        placeholder="ETA, e.g. 7 min"
                        placeholderTextColor="#8B909A"
                        maxLength={textLimits.questStopEta}
                        className="rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
                      />
                    </View>
                  ))}
                </View>

                {createQuestError && (
                  <Text className="mt-4 text-[13px] font-medium text-destructive">
                    {createQuestError}
                  </Text>
                )}

                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    onSubmit();
                  }}
                  disabled={creatingQuest}
                  className="mt-5 h-[52px] items-center justify-center rounded-xl bg-primary active:opacity-85"
                >
                  {creatingQuest ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-[15px] font-semibold text-white">Create quest</Text>
                  )}
                </Pressable>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

function ChoiceChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Keyboard.dismiss();
        onPress();
      }}
      className={`h-10 flex-1 items-center justify-center rounded-xl border px-3 active:opacity-85 ${
        active ? 'border-primary bg-primary' : 'border-gray-200 bg-gray-100'
      }`}
    >
      <Text className={`text-[12px] font-extrabold ${active ? 'text-white' : 'text-muted'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
