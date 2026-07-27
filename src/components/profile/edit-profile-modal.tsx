import { Camera, X } from 'lucide-react-native';
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

import { CitySelector } from '@/components/city-selector';
import { Avatar } from '@/components/profile/profile-avatar';
import type { CityId } from '@/data/culture';

type EditProfileModalProps = {
  avatarInitials: string | null;
  avatarUrl: string | null;
  cityId: CityId;
  firstName: string;
  lastName: string;
  onChangeAvatar: () => void;
  onChangeCity: (cityId: CityId) => void;
  onChangeFirstName: (firstName: string) => void;
  onChangeLastName: (lastName: string) => void;
  onClose: () => void;
  onSave: () => void;
  profileError: string | null;
  savingProfile: boolean;
  visible: boolean;
};

export function EditProfileModal({
  avatarInitials,
  avatarUrl,
  cityId,
  firstName,
  lastName,
  onChangeAvatar,
  onChangeCity,
  onChangeFirstName,
  onChangeLastName,
  onClose,
  onSave,
  profileError,
  savingProfile,
  visible,
}: EditProfileModalProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36, paddingTop: 34 }}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          >
            <View className="mb-5 flex-row justify-end">
              <Pressable
                onPress={onClose}
                hitSlop={16}
                className="h-12 w-12 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
              >
                <X size={21} color="#756F7B" strokeWidth={2.4} />
              </Pressable>
            </View>

            <View className="mb-7 items-center">
              <Pressable onPress={onChangeAvatar} className="items-center active:opacity-85">
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
              placeholder="First name"
              placeholderTextColor="#8B909A"
              autoCapitalize="words"
              textContentType="givenName"
              autoComplete="given-name"
              className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
            />

            <Text className="mb-2 text-[13px] font-semibold text-ink">Last name</Text>
            <TextInput
              value={lastName}
              onChangeText={onChangeLastName}
              placeholder="Last name"
              placeholderTextColor="#8B909A"
              autoCapitalize="words"
              textContentType="familyName"
              autoComplete="family-name"
              className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
            />

            <Text className="mb-2 text-[13px] font-semibold text-ink">City</Text>
            <View className="mb-5">
              <CitySelector value={cityId} onChange={onChangeCity} />
            </View>

            <Text className="mb-6 text-[12px] leading-4 text-muted">
              Profile details are saved to your account. Profile photos are kept as a device image
              until cloud avatar storage is enabled.
            </Text>

            {profileError && (
              <Text className="mb-4 text-[13px] font-medium text-destructive">{profileError}</Text>
            )}

            <Pressable
              onPress={onSave}
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
