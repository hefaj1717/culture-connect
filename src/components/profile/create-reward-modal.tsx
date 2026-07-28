import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MapPin, Search } from 'lucide-react-native';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { textLimits } from '@/constants/text-limits';
import { type CityId, getCultureCityData } from '@/data/culture';
import { hasGooglePlacesApiKey, type PlaceSuggestion } from '@/lib/place-search';

type CreateRewardModalProps = {
  createRewardError: string | null;
  creatingReward: boolean;
  onChangeRewardDescription: (value: string) => void;
  onChangeRewardPlaceQuery: (value: string) => void;
  onChangeRewardTitle: (value: string) => void;
  onChangeRewardXp: (value: string) => void;
  onClose: () => void;
  onSelectRewardPlace: (place: PlaceSuggestion) => void;
  onSubmit: () => void;
  rewardDescription: string;
  rewardPlaceQuery: string;
  rewardPlaceSuggestions: PlaceSuggestion[];
  rewardTitle: string;
  rewardXp: string;
  savedCityId: CityId;
  searchingRewardPlaces: boolean;
  selectedRewardPlace: PlaceSuggestion | null;
  setSelectedRewardPlace: (place: PlaceSuggestion | null) => void;
  stableModalTopInset: number;
  visible: boolean;
};

export function CreateRewardModal({
  createRewardError,
  creatingReward,
  onChangeRewardDescription,
  onChangeRewardPlaceQuery,
  onChangeRewardTitle,
  onChangeRewardXp,
  onClose,
  onSelectRewardPlace,
  onSubmit,
  rewardDescription,
  rewardPlaceQuery,
  rewardPlaceSuggestions,
  rewardTitle,
  rewardXp,
  savedCityId,
  searchingRewardPlaces,
  selectedRewardPlace,
  setSelectedRewardPlace,
  stableModalTopInset,
  visible,
}: CreateRewardModalProps) {
  const cityData = getCultureCityData(savedCityId);
  const scrollViewRef = useRef<ScrollView>(null);

  function focusFormArea(y: number) {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ animated: true, y });
    }, 90);
  }

  return (
    <Modal animationType="slide" transparent onRequestClose={onClose} visible={visible}>
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
              paddingBottom: 90,
              paddingTop: stableModalTopInset + 14,
            }}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            scrollIndicatorInsets={{ bottom: 90 }}
          >
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                onClose();
              }}
              className="mb-5 h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Close create reward"
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
                <Text className="font-heading text-[29px] font-extrabold leading-[33px] text-white">
                  Create reward
                </Text>
                <Text className="mt-2 max-w-[290px] text-[13px] leading-5 text-white/80">
                  Add a partner reward students can unlock with CultureQuest XP.
                </Text>
              </LinearGradient>
            </View>

            <Text className="mb-2 text-[13px] font-semibold text-ink">Reward title</Text>
            <TextInput
              value={rewardTitle}
              onChangeText={onChangeRewardTitle}
              onFocus={() => focusFormArea(150)}
              placeholder="e.g. Free espresso after check-in"
              placeholderTextColor="#8B909A"
              maxLength={textLimits.rewardTitle}
              className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
            />

            <Text className="mb-2 text-[13px] font-semibold text-ink">Reward place</Text>
            <View className="mb-4">
              <View className="h-12 flex-row items-center gap-3 rounded-xl border border-gray-300 px-4">
                <Search size={16} color="#756F7B" strokeWidth={2.4} />
                <TextInput
                  value={rewardPlaceQuery}
                  onChangeText={(value) => {
                    onChangeRewardPlaceQuery(value);
                    setSelectedRewardPlace(null);
                  }}
                  onFocus={() => focusFormArea(260)}
                  placeholder={`Search places in ${cityData.name}`}
                  placeholderTextColor="#8B909A"
                  maxLength={textLimits.placeSearch}
                  className="flex-1 text-[15px] text-ink"
                />
                {searchingRewardPlaces && <ActivityIndicator color="#7C3AED" size="small" />}
              </View>
              <Text className="mt-2 text-[11px] leading-4 text-muted">
                {hasGooglePlacesApiKey
                  ? 'Powered by Google Places suggestions.'
                  : 'Google Places key is missing, so place suggestions are unavailable.'}
              </Text>

              {selectedRewardPlace && (
                <View className="mt-2 flex-row gap-3 rounded-xl border border-primary/25 bg-primary/10 p-3">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/15">
                    <MapPin size={16} color="#7C3AED" strokeWidth={2.4} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="font-ui text-[13px] font-bold text-ink" numberOfLines={1}>
                      {selectedRewardPlace.name}
                    </Text>
                    <Text className="text-[11px] leading-4 text-muted" numberOfLines={2}>
                      {selectedRewardPlace.address}
                    </Text>
                  </View>
                </View>
              )}

              {rewardPlaceSuggestions.length > 0 && (
                <View className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
                  {rewardPlaceSuggestions.map((place) => (
                    <Pressable
                      key={`${place.source}-${place.id}`}
                      onPress={() => {
                        Keyboard.dismiss();
                        onSelectRewardPlace(place);
                      }}
                      className="flex-row items-start gap-3 border-b border-gray-100 p-3 active:bg-gray-50"
                    >
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                        <MapPin size={16} color="#7C3AED" strokeWidth={2.4} />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="font-ui text-[13px] font-bold text-ink" numberOfLines={1}>
                          {place.name}
                        </Text>
                        <Text className="text-[11px] leading-4 text-muted" numberOfLines={2}>
                          {place.address}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <Text className="mb-2 text-[13px] font-semibold text-ink">XP required</Text>
            <TextInput
              value={rewardXp}
              onChangeText={onChangeRewardXp}
              onFocus={() => focusFormArea(420)}
              keyboardType="number-pad"
              placeholder="100"
              placeholderTextColor="#8B909A"
              maxLength={textLimits.rewardXp}
              className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
            />

            <Text className="mb-2 text-[13px] font-semibold text-ink">Description</Text>
            <TextInput
              value={rewardDescription}
              onChangeText={onChangeRewardDescription}
              onFocus={() => focusFormArea(490)}
              placeholder="What does the student receive and how should staff verify it?"
              placeholderTextColor="#8B909A"
              multiline
              textAlignVertical="top"
              maxLength={textLimits.rewardDescription}
              className="mb-4 min-h-[112px] rounded-xl border border-gray-300 px-4 py-3 text-[15px] leading-5 text-ink"
            />
            <Text className="-mt-3 mb-4 text-right text-[11px] text-muted">
              {rewardDescription.length}/{textLimits.rewardDescription}
            </Text>

            {createRewardError && (
              <Text className="mb-4 text-[13px] font-medium text-destructive">
                {createRewardError}
              </Text>
            )}

            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                onSubmit();
              }}
              disabled={creatingReward}
              className="h-[52px] items-center justify-center rounded-xl bg-primary active:opacity-85"
            >
              {creatingReward ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-[15px] font-semibold text-white">Submit for review</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
