import { Camera, MapPin, Search, X } from 'lucide-react-native';
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

import { CitySelector } from '@/components/city-selector';
import { Avatar } from '@/components/profile/profile-avatar';
import { textLimits } from '@/constants/text-limits';
import type { CityId } from '@/data/culture';
import { useStableTopInset } from '@/hooks/use-stable-safe-area';
import type { PlaceSuggestion } from '@/lib/place-search';

type EditProfileModalProps = {
  avatarInitials: string | null;
  avatarUrl: string | null;
  cityId: CityId;
  firstName: string;
  isOrganizer?: boolean;
  lastName: string;
  onChangeAvatar: () => void;
  onChangeCity: (cityId: CityId) => void;
  onChangeFirstName: (firstName: string) => void;
  onChangeLastName: (lastName: string) => void;
  onChangeOrganizerBio?: (bio: string) => void;
  onChangeOrganizerLocationQuery?: (query: string) => void;
  onClose: () => void;
  onSave: () => void;
  onSelectOrganizerLocation?: (place: PlaceSuggestion) => void;
  organizerBio?: string;
  organizerLocationQuery?: string;
  organizerLocationSuggestions?: PlaceSuggestion[];
  profileError: string | null;
  searchingOrganizerLocation?: boolean;
  selectedOrganizerLocation?: PlaceSuggestion | null;
  savingProfile: boolean;
  visible: boolean;
};

export function EditProfileModal({
  avatarInitials,
  avatarUrl,
  cityId,
  firstName,
  isOrganizer = false,
  lastName,
  onChangeAvatar,
  onChangeCity,
  onChangeFirstName,
  onChangeLastName,
  onChangeOrganizerBio,
  onChangeOrganizerLocationQuery,
  onClose,
  onSave,
  onSelectOrganizerLocation,
  organizerBio = '',
  organizerLocationQuery = '',
  organizerLocationSuggestions = [],
  profileError,
  searchingOrganizerLocation = false,
  selectedOrganizerLocation = null,
  savingProfile,
  visible,
}: EditProfileModalProps) {
  const stableTopInset = useStableTopInset();
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
              paddingTop: stableTopInset + 8,
            }}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            scrollIndicatorInsets={{ bottom: 90 }}
          >
            <View className="mb-5 flex-row justify-end">
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                }}
                hitSlop={16}
                className="h-12 w-12 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
              >
                <X size={21} color="#756F7B" strokeWidth={2.4} />
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
              Profile details are saved to your account. Profile photos are kept as a device image
              until cloud avatar storage is enabled.
            </Text>

            {isOrganizer && (
              <View className="mb-6 rounded-3xl border border-primary/10 bg-primary/5 p-4">
                <Text className="mb-1 font-display text-[24px] text-ink">Organizer profile</Text>
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
                    <Search size={17} color="#7C3AED" strokeWidth={2.4} />
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
                          <MapPin size={16} color="#7C3AED" strokeWidth={2.4} />
                          <View className="min-w-0 flex-1">
                            <Text className="text-[13px] font-semibold text-ink" numberOfLines={1}>
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
              <Text className="mb-4 text-[13px] font-medium text-destructive">{profileError}</Text>
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
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
