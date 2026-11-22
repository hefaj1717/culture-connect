import { Camera, Check, GraduationCap, MapPin, Search, Trash2, X } from 'lucide-react-native';
import { useRef } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CitySelector } from '@/components/city-selector';
import { Avatar } from '@/components/profile/profile-avatar';
import { textLimits } from '@/constants/text-limits';
import { Colors } from '@/constants/theme';
import type { CityId } from '@/data/culture';
import { getUniversitiesForCity } from '@/data/universities';
import { useCardSwipeBack } from '@/hooks/use-card-swipe-back';
import { useStableTopInset } from '@/hooks/use-stable-safe-area';
import type { PlaceSearchError, PlaceSuggestion } from '@/lib/place-search';

type EditProfileModalProps = {
  avatarInitials: string | null;
  avatarUrl: string | null;
  cityId: CityId;
  deletingAccount?: boolean;
  firstName: string;
  isStudent: boolean;
  isOrganizer?: boolean;
  lastName: string;
  onChangeAvatar: () => void;
  onChangeCity: (cityId: CityId) => void;
  onChangeFirstName: (firstName: string) => void;
  onChangeLastName: (lastName: string) => void;
  onChangeOrganizerBio?: (bio: string) => void;
  onChangeOrganizerLocationQuery?: (query: string) => void;
  onChangeStudentEmail: (email: string) => void;
  onChangeUniversity: (universityId: string) => void;
  onClose: () => void;
  onDeleteAccount: () => void;
  onRetryOrganizerLocationSearch?: () => void;
  onSave: () => void;
  onSelectOrganizerLocation?: (place: PlaceSuggestion) => void;
  onToggleStudent: (isStudent: boolean) => void;
  organizerBio?: string;
  organizerLocationQuery?: string;
  organizerLocationSearchError?: PlaceSearchError | null;
  organizerLocationSuggestions?: PlaceSuggestion[];
  profileError: string | null;
  searchingOrganizerLocation?: boolean;
  selectedOrganizerLocation?: PlaceSuggestion | null;
  savingProfile: boolean;
  studentEmail: string;
  universityId: string;
  visible: boolean;
};

export function EditProfileModal({
  avatarInitials,
  avatarUrl,
  cityId,
  deletingAccount = false,
  firstName,
  isStudent,
  isOrganizer = false,
  lastName,
  onChangeAvatar,
  onChangeCity,
  onChangeFirstName,
  onChangeLastName,
  onChangeOrganizerBio,
  onChangeOrganizerLocationQuery,
  onChangeStudentEmail,
  onChangeUniversity,
  onClose,
  onDeleteAccount,
  onRetryOrganizerLocationSearch,
  onSave,
  onSelectOrganizerLocation,
  onToggleStudent,
  organizerBio = '',
  organizerLocationQuery = '',
  organizerLocationSearchError = null,
  organizerLocationSuggestions = [],
  profileError,
  searchingOrganizerLocation = false,
  selectedOrganizerLocation = null,
  savingProfile,
  studentEmail,
  universityId,
  visible,
}: EditProfileModalProps) {
  const stableTopInset = useStableTopInset();
  const scrollViewRef = useRef<ScrollViewInstance>(null);
  const universityOptions = getUniversitiesForCity(cityId);
  const {
    closeWithAnimation,
    gesture: swipeGesture,
    swipeStyle,
  } = useCardSwipeBack({
    onSwipeBack: () => {
      Keyboard.dismiss();
      onClose();
    },
    visible,
  });

  function focusFormArea(y: number) {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ animated: true, y });
    }, 90);
  }

  return (
    <Modal animationType="slide" transparent onRequestClose={closeWithAnimation} visible={visible}>
      <GestureDetector gesture={swipeGesture}>
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
                  paddingBottom: 90,
                  paddingTop: stableTopInset + 8,
                }}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                scrollIndicatorInsets={{ bottom: 90 }}
              >
                <View className="mb-5 flex-row justify-end">
                  <Pressable
                    onPress={closeWithAnimation}
                    hitSlop={16}
                    className="h-12 w-12 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                  >
                    <X size={21} color="#6B818C" strokeWidth={2.4} />
                  </Pressable>
                </View>

                <View className="mb-7 items-center">
                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      onChangeAvatar();
                    }}
                    className="items-center active:opacity-85"
                  >
                    <View className="relative">
                      <Avatar initials={avatarInitials} uri={avatarUrl} size={104} iconSize={42} />
                      <View className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-primary">
                        <Camera size={17} color="white" strokeWidth={2.4} />
                      </View>
                    </View>
                    <Text className="mt-3 text-[14px] font-semibold text-primary">
                      Change profile photo
                    </Text>
                  </Pressable>
                </View>

                <Text className="mb-2 text-[13px] font-semibold text-ink">First name</Text>
                <TextInput
                  value={firstName}
                  onChangeText={onChangeFirstName}
                  onFocus={() => focusFormArea(180)}
                  placeholder="First name"
                  placeholderTextColor="#8B909A"
                  autoCapitalize="words"
                  textContentType="givenName"
                  autoComplete="given-name"
                  maxLength={textLimits.firstName}
                  className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
                />

                <Text className="mb-2 text-[13px] font-semibold text-ink">Last name</Text>
                <TextInput
                  value={lastName}
                  onChangeText={onChangeLastName}
                  onFocus={() => focusFormArea(250)}
                  placeholder="Last name"
                  placeholderTextColor="#8B909A"
                  autoCapitalize="words"
                  textContentType="familyName"
                  autoComplete="family-name"
                  maxLength={textLimits.lastName}
                  className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
                />

                <Text className="mb-2 text-[13px] font-semibold text-ink">City</Text>
                <View className="mb-5">
                  <CitySelector
                    value={cityId}
                    onChange={(nextCityId) => {
                      Keyboard.dismiss();
                      onChangeCity(nextCityId);
                    }}
                  />
                </View>

                <Text className="mb-6 text-[12px] leading-4 text-muted">
                  Profile details are saved to your account. Profile photos are kept as a device
                  image until cloud avatar storage is enabled.
                </Text>

                <View className="mb-6 rounded-3xl border border-primary/10 bg-primary/5 p-4">
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isStudent }}
                    accessibilityLabel="I am a student"
                    onPress={() => {
                      Keyboard.dismiss();
                      onToggleStudent(!isStudent);
                    }}
                    className="flex-row items-start gap-3 active:opacity-85"
                  >
                    <View
                      className={`mt-0.5 h-8 w-8 items-center justify-center rounded-full ${
                        isStudent ? 'bg-primary' : 'bg-white'
                      }`}
                    >
                      {isStudent ? (
                        <Check size={17} color="white" strokeWidth={2.7} />
                      ) : (
                        <GraduationCap size={17} color="#6B818C" strokeWidth={2.4} />
                      )}
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-[15px] font-extrabold text-ink">I am a student</Text>
                      <Text className="mt-0.5 text-[12px] leading-4 text-muted">
                        Link your university so your XP contributes to the campus ranking.
                      </Text>
                    </View>
                  </Pressable>

                  {isStudent && (
                    <View className="mt-4">
                      <Text className="mb-2 text-[13px] font-semibold text-ink">University</Text>
                      <View className="mb-4 gap-2">
                        {universityOptions.map((university) => {
                          const active = university.id === universityId;

                          return (
                            <Pressable
                              key={university.id}
                              accessibilityRole="radio"
                              accessibilityState={{ checked: active }}
                              accessibilityLabel={`University: ${university.name}`}
                              onPress={() => {
                                Keyboard.dismiss();
                                onChangeUniversity(university.id);
                              }}
                              className={`rounded-xl border px-3 py-2.5 active:opacity-85 ${
                                active ? 'border-primary bg-white' : 'border-gray-200 bg-white/70'
                              }`}
                            >
                              <Text
                                className={`text-[13px] font-semibold ${
                                  active ? 'text-primary' : 'text-ink'
                                }`}
                              >
                                {university.shortName}
                              </Text>
                              <Text className="mt-0.5 text-[11px] leading-4 text-muted">
                                {university.name}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      <Text className="mb-2 text-[13px] font-semibold text-ink">Student email</Text>
                      <TextInput
                        value={studentEmail}
                        onChangeText={onChangeStudentEmail}
                        onFocus={() => focusFormArea(380)}
                        placeholder="Add student email"
                        placeholderTextColor="#8B909A"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        textContentType="emailAddress"
                        autoComplete="email"
                        maxLength={textLimits.email}
                        className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-[15px] text-ink"
                      />
                      <Text className="mt-2 text-[11px] leading-4 text-muted">
                        Verification will be added later. For now this links you to the ranking.
                      </Text>
                    </View>
                  )}
                </View>

                {isOrganizer && (
                  <View className="mb-6 rounded-3xl border border-primary/10 bg-primary/5 p-4">
                    <Text className="mb-1 font-display text-[24px] text-ink">
                      Organizer profile
                    </Text>
                    <Text className="mb-4 text-[12px] leading-4 text-muted">
                      These details appear in Discover for students browsing organisers and partner
                      places.
                    </Text>

                    <Text className="mb-2 text-[13px] font-semibold text-ink">
                      Description optional
                    </Text>
                    <TextInput
                      value={organizerBio}
                      onChangeText={onChangeOrganizerBio}
                      onFocus={() => focusFormArea(430)}
                      placeholder="Shortly describe your venue, collective, or event organisation."
                      placeholderTextColor="#8B909A"
                      multiline
                      textAlignVertical="top"
                      maxLength={textLimits.organizerBio}
                      className="mb-4 min-h-[96px] rounded-xl border border-primary/15 bg-white px-4 py-3 text-[15px] leading-5 text-ink"
                    />
                    <Text className="-mt-3 mb-4 text-right text-[11px] text-muted">
                      {organizerBio.length}/{textLimits.organizerBio}
                    </Text>

                    <Text className="mb-2 text-[13px] font-semibold text-ink">
                      Main location optional
                    </Text>
                    <View className="rounded-xl border border-primary/15 bg-white px-4 py-3">
                      <View className="flex-row items-center gap-2">
                        <Search size={17} color="#6B818C" strokeWidth={2.4} />
                        <TextInput
                          value={organizerLocationQuery}
                          onChangeText={onChangeOrganizerLocationQuery}
                          onFocus={() => focusFormArea(535)}
                          placeholder="Search your venue or main location"
                          placeholderTextColor="#8B909A"
                          autoCapitalize="words"
                          maxLength={textLimits.organizerLocationSearch}
                          className="min-h-[24px] flex-1 text-[15px] text-ink"
                        />
                        {searchingOrganizerLocation && <ActivityIndicator size="small" />}
                      </View>

                      {selectedOrganizerLocation && (
                        <View className="mt-3 rounded-xl bg-primary/5 px-3 py-2">
                          <Text className="text-[13px] font-semibold text-primary">
                            {selectedOrganizerLocation.name}
                          </Text>
                          <Text className="mt-0.5 text-[12px] leading-4 text-muted">
                            {selectedOrganizerLocation.address}
                          </Text>
                        </View>
                      )}

                      {organizerLocationSearchError ? (
                        <View className="mt-3 flex-row items-center gap-3 rounded-xl bg-accent/10 px-3 py-2.5">
                          <Text className="min-w-0 flex-1 text-[11px] leading-4 text-ink">
                            {organizerLocationSearchError.message}
                          </Text>
                          {onRetryOrganizerLocationSearch ? (
                            <Pressable
                              onPress={onRetryOrganizerLocationSearch}
                              className="rounded-lg bg-accent px-2.5 py-1.5 active:opacity-75"
                              accessibilityLabel="Retry place search"
                            >
                              <Text className="text-[11px] font-bold text-white">Retry</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      ) : null}

                      {organizerLocationSuggestions.length > 0 && (
                        <View className="mt-3 overflow-hidden rounded-xl border border-gray-200">
                          {organizerLocationSuggestions.map((suggestion, index) => (
                            <Pressable
                              key={suggestion.id}
                              onPress={() => {
                                Keyboard.dismiss();
                                onSelectOrganizerLocation?.(suggestion);
                              }}
                              className={`flex-row items-start gap-2 bg-white px-3 py-3 active:bg-primary/5 ${
                                index > 0 ? 'border-t border-gray-100' : ''
                              }`}
                            >
                              <MapPin size={16} color="#6B818C" strokeWidth={2.4} />
                              <View className="min-w-0 flex-1">
                                <Text
                                  className="text-[13px] font-semibold text-ink"
                                  numberOfLines={1}
                                >
                                  {suggestion.name}
                                </Text>
                                <Text className="mt-0.5 text-[12px] leading-4 text-muted">
                                  {suggestion.address}
                                </Text>
                              </View>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>

                    <Text className="mt-3 text-[12px] leading-4 text-muted">
                      Leave this blank if you create events across different locations.
                    </Text>
                  </View>
                )}

                {profileError && (
                  <Text className="mb-4 text-[13px] font-medium text-destructive">
                    {profileError}
                  </Text>
                )}

                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    onSave();
                  }}
                  disabled={savingProfile}
                  className="h-[52px] items-center justify-center rounded-xl bg-primary active:opacity-85"
                >
                  {savingProfile ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-[15px] font-semibold text-white">Save changes</Text>
                  )}
                </Pressable>

                <View className="mt-8 border-t border-destructive/10 pt-6">
                  <Text className="mb-1 font-heading text-[20px] leading-6 text-ink">Account</Text>
                  <Text className="mb-3 text-[12px] leading-4 text-muted">
                    Permanently remove your profile, activity, events, rewards, and account data.
                  </Text>
                  <Pressable
                    accessibilityHint="Permanently removes your account and its personal data"
                    accessibilityLabel="Delete account"
                    disabled={deletingAccount || savingProfile}
                    onPress={() => {
                      Keyboard.dismiss();
                      onDeleteAccount();
                    }}
                    className="h-[52px] flex-row items-center justify-center gap-2 rounded-xl bg-destructive/10 active:opacity-75 disabled:opacity-50"
                  >
                    {deletingAccount ? (
                      <ActivityIndicator color={Colors.light.destructive} />
                    ) : (
                      <>
                        <Trash2 size={18} color={Colors.light.destructive} strokeWidth={2.4} />
                        <Text className="text-[14px] font-bold text-destructive">
                          Delete account
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}
