import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Minus, Plus, Route } from 'lucide-react-native';
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

import { cultureCities, type CityId } from '@/data/culture';
import { type QuestImageKind } from '@/lib/quests';

type QuestDraftStop = {
  description: string;
  eta: string;
  title: string;
};

type CreateQuestModalProps = {
  createQuestError: string | null;
  creatingQuest: boolean;
  onAddStop: () => void;
  onChangeCity: (value: CityId) => void;
  onChangeDescription: (value: string) => void;
  onChangeImage: (value: QuestImageKind) => void;
  onChangeStatus: (value: 'draft' | 'approved') => void;
  onChangeStop: (index: number, key: keyof QuestDraftStop, value: string) => void;
  onChangeTheme: (value: string) => void;
  onChangeTitle: (value: string) => void;
  onChangeXp: (value: string) => void;
  onClose: () => void;
  onRemoveStop: (index: number) => void;
  onSubmit: () => void;
  questCityId: CityId;
  questDescription: string;
  questImage: QuestImageKind;
  questStatus: 'draft' | 'approved';
  questStops: QuestDraftStop[];
  questTheme: string;
  questTitle: string;
  questXp: string;
  stableModalTopInset: number;
  visible: boolean;
};

const questImageOptions: { key: QuestImageKind; label: string }[] = [
  { key: 'museum', label: 'Museum' },
  { key: 'cafe', label: 'Cafe' },
  { key: 'theater', label: 'Theater' },
];

export function CreateQuestModal({
  createQuestError,
  creatingQuest,
  onAddStop,
  onChangeCity,
  onChangeDescription,
  onChangeImage,
  onChangeStatus,
  onChangeStop,
  onChangeTheme,
  onChangeTitle,
  onChangeXp,
  onClose,
  onRemoveStop,
  onSubmit,
  questCityId,
  questDescription,
  questImage,
  questStatus,
  questStops,
  questTheme,
  questTitle,
  questXp,
  stableModalTopInset,
  visible,
}: CreateQuestModalProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 36,
              paddingTop: stableModalTopInset + 14,
            }}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              onPress={onClose}
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
              placeholder="e.g. Old Town Culture Trail"
              placeholderTextColor="#8B909A"
              className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
            />

            <Text className="mb-2 text-[13px] font-semibold text-ink">Theme</Text>
            <TextInput
              value={questTheme}
              onChangeText={onChangeTheme}
              placeholder="City route"
              placeholderTextColor="#8B909A"
              className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
            />

            <Text className="mb-2 text-[13px] font-semibold text-ink">Description</Text>
            <TextInput
              value={questDescription}
              onChangeText={onChangeDescription}
              placeholder="What story does this trail tell?"
              placeholderTextColor="#8B909A"
              multiline
              textAlignVertical="top"
              className="mb-4 min-h-[104px] rounded-xl border border-gray-300 px-4 py-3 text-[15px] leading-5 text-ink"
            />

            <View className="mb-4 flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-2 text-[13px] font-semibold text-ink">Total XP</Text>
                <TextInput
                  value={questXp}
                  onChangeText={onChangeXp}
                  keyboardType="number-pad"
                  placeholder="150"
                  placeholderTextColor="#8B909A"
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

            <Text className="mb-2 text-[13px] font-semibold text-ink">Image style</Text>
            <View className="mb-5 flex-row gap-2">
              {questImageOptions.map((option) => (
                <ChoiceChip
                  active={questImage === option.key}
                  key={option.key}
                  label={option.label}
                  onPress={() => onChangeImage(option.key)}
                />
              ))}
            </View>

            <View className="mb-3 flex-row items-center justify-between">
              <Text className="font-heading text-[22px] font-extrabold text-ink">Stops</Text>
              <Pressable
                onPress={onAddStop}
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
                        onPress={() => onRemoveStop(index)}
                        className="h-8 w-8 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                      >
                        <Minus size={16} color="#756F7B" strokeWidth={2.5} />
                      </Pressable>
                    )}
                  </View>
                  <TextInput
                    value={stop.title}
                    onChangeText={(value) => onChangeStop(index, 'title', value)}
                    placeholder="Stop title"
                    placeholderTextColor="#8B909A"
                    className="mb-3 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
                  />
                  <TextInput
                    value={stop.description}
                    onChangeText={(value) => onChangeStop(index, 'description', value)}
                    placeholder="What should students do here?"
                    placeholderTextColor="#8B909A"
                    multiline
                    textAlignVertical="top"
                    className="mb-3 min-h-[82px] rounded-xl border border-gray-300 px-4 py-3 text-[15px] leading-5 text-ink"
                  />
                  <TextInput
                    value={stop.eta}
                    onChangeText={(value) => onChangeStop(index, 'eta', value)}
                    placeholder="ETA, e.g. 7 min"
                    placeholderTextColor="#8B909A"
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
              onPress={onSubmit}
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
      onPress={onPress}
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
