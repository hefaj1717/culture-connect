import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Award, Camera, Flame, Gift, LogOut, Pencil, Sparkles, User, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { AuthScreen } from '@/components/auth-screen';
import { rewardPartners } from '@/data/culture';
import { useAuth } from '@/providers/auth-provider';

export default function ProfileScreen() {
  const { session, signOut, updateProfile } = useAuth();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const email = session?.user.email ?? 'Student';
  const metadataName = [
    session?.user.user_metadata?.first_name,
    session?.user.user_metadata?.last_name,
  ]
    .filter(Boolean)
    .join(' ');
  const fullName = session?.user.user_metadata?.full_name || metadataName || email.split('@')[0];
  const savedFirstName = session?.user.user_metadata?.first_name || '';
  const savedLastName = session?.user.user_metadata?.last_name || '';
  const savedAvatarUrl = session?.user.user_metadata?.avatar_url || null;

  useEffect(() => {
    setFirstName(savedFirstName);
    setLastName(savedLastName);
    setAvatarUrl(savedAvatarUrl);
  }, [savedAvatarUrl, savedFirstName, savedLastName]);

  if (!session) {
    return <AuthScreen onCancel={() => router.replace('/')} />;
  }

  async function pickAvatar() {
    setProfileError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo access to choose a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatarUrl(result.assets[0]?.uri ?? null);
    }
  }

  async function saveProfile() {
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();

    if (!normalizedFirstName || !normalizedLastName) {
      setProfileError('Please enter your first and last name.');
      return;
    }

    setProfileError(null);
    setSavingProfile(true);
    const result = await updateProfile({
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      avatarUrl,
    });
    setSavingProfile(false);

    if (result.error) {
      setProfileError(result.error);
      return;
    }

    setEditOpen(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 112 }}>
        <View className="px-5 pt-4 pb-5">
          <Text className="text-[28px] font-bold tracking-tight text-black">Profile</Text>
          <Text className="text-[14px] text-muted">Your CultureQuest progress</Text>
        </View>

        <View className="mx-5 mb-5 rounded-2xl border border-gray-200 bg-white p-5">
          <View className="mb-5 flex-row items-center gap-4">
            <Avatar uri={savedAvatarUrl} size={64} iconSize={28} />
            <View className="min-w-0 flex-1">
              <Text className="text-[20px] font-bold text-black" numberOfLines={1}>
                {fullName}
              </Text>
              <Text className="text-[13px] text-muted" numberOfLines={1}>
                {email}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => {
              setProfileError(null);
              setFirstName(savedFirstName);
              setLastName(savedLastName);
              setAvatarUrl(savedAvatarUrl);
              setEditOpen(true);
            }}
            className="mb-3 h-12 flex-row items-center justify-center gap-2 rounded-xl bg-primary active:opacity-85"
          >
            <Pencil size={16} color="white" strokeWidth={2.4} />
            <Text className="text-[14px] font-semibold text-white">Edit profile</Text>
          </Pressable>

          <View className="mb-5 flex-row rounded-2xl bg-gray-100 p-4">
            <View className="flex-1 items-center">
              <Text className="text-[22px] font-bold text-black">1,860</Text>
              <Text className="text-[11px] font-medium text-muted">XP</Text>
            </View>
            <View className="w-px bg-gray-200" />
            <View className="flex-1 items-center">
              <View className="flex-row items-center gap-1">
                <Text className="text-[22px] font-bold text-black">12</Text>
                <Flame size={16} color="#F59E0B" />
              </View>
              <Text className="text-[11px] font-medium text-muted">Streak</Text>
            </View>
            <View className="w-px bg-gray-200" />
            <View className="flex-1 items-center">
              <Award size={22} color="#3B82F6" />
              <Text className="text-[11px] font-medium text-muted">Badges</Text>
            </View>
          </View>

          <Pressable
            onPress={signOut}
            className="h-12 flex-row items-center justify-center gap-2 rounded-xl border border-gray-200 active:opacity-80"
          >
            <LogOut size={17} color="#60646C" />
            <Text className="text-[14px] font-semibold text-muted">Log out</Text>
          </Pressable>
        </View>

        <View className="px-5">
          <View className="mb-3 flex-row items-center gap-2">
            <Sparkles size={16} color="#24458F" />
            <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Rewards
            </Text>
          </View>

          <View className="gap-3">
            {rewardPartners.map((reward) => (
              <View key={reward.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <View className="flex-row items-start gap-3">
                  <View
                    className="h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${reward.color}20` }}
                  >
                    <Gift size={20} color={reward.color} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <View className="mb-1 flex-row items-center gap-2">
                      <Text className="shrink text-[15px] font-bold text-black" numberOfLines={1}>
                        {reward.name}
                      </Text>
                      {!!reward.badge && (
                        <View className="rounded-full bg-secondary/10 px-2 py-0.5">
                          <Text className="text-[10px] font-bold text-secondary">
                            {reward.badge}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="mb-1 text-[13px] text-muted">{reward.discount}</Text>
                    <Text className="text-[12px] font-semibold text-success">
                      {reward.xpCost} XP
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal animationType="slide" onRequestClose={() => setEditOpen(false)} visible={editOpen}>
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1"
          >
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
            >
              <View className="mb-6 flex-row items-center justify-between">
                <View>
                  <Text className="text-[26px] font-extrabold text-black">Edit profile</Text>
                  <Text className="mt-0.5 text-[13px] text-muted">Update your public details</Text>
                </View>
                <Pressable
                  onPress={() => setEditOpen(false)}
                  className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                >
                  <X size={19} color="#5F6675" strokeWidth={2.4} />
                </Pressable>
              </View>

              <View className="mb-7 items-center">
                <Pressable onPress={pickAvatar} className="items-center active:opacity-85">
                  <View className="relative">
                    <Avatar uri={avatarUrl} size={104} iconSize={42} />
                    <View className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-primary">
                      <Camera size={17} color="white" strokeWidth={2.4} />
                    </View>
                  </View>
                  <Text className="mt-3 text-[14px] font-semibold text-primary">
                    Change profile photo
                  </Text>
                </Pressable>
              </View>

              <Text className="mb-2 text-[13px] font-semibold text-black">First name</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor="#8B909A"
                autoCapitalize="words"
                textContentType="givenName"
                autoComplete="given-name"
                className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-black"
              />

              <Text className="mb-2 text-[13px] font-semibold text-black">Last name</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor="#8B909A"
                autoCapitalize="words"
                textContentType="familyName"
                autoComplete="family-name"
                className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-black"
              />

              <Text className="mb-6 text-[12px] leading-4 text-muted">
                Profile photos are stored on this device for now. Cloud avatar uploads will be added
                when we set up production storage.
              </Text>

              {profileError && (
                <Text className="mb-4 text-[13px] font-medium text-destructive">
                  {profileError}
                </Text>
              )}

              <Pressable
                onPress={saveProfile}
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
    </SafeAreaView>
  );
}

function Avatar({
  uri,
  size,
  iconSize,
}: {
  uri?: string | null;
  size: number;
  iconSize: number;
}) {
  return (
    <View
      className="items-center justify-center overflow-hidden rounded-full bg-primary"
      style={{ height: size, width: size }}
    >
      {uri ? (
        <Image source={{ uri }} contentFit="cover" style={{ height: size, width: size }} />
      ) : (
        <User size={iconSize} color="white" strokeWidth={2.2} />
      )}
    </View>
  );
}
