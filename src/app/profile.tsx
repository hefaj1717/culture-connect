import { Award, Flame, Gift, LogOut, Sparkles, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthScreen } from '@/components/auth-screen';
import { rewardPartners } from '@/data/culture';
import { useAuth } from '@/providers/auth-provider';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const router = useRouter();

  if (!session) {
    return <AuthScreen onCancel={() => router.replace('/')} />;
  }

  const email = session.user.email ?? 'Student';
  const metadataName = [
    session.user.user_metadata?.first_name,
    session.user.user_metadata?.last_name,
  ]
    .filter(Boolean)
    .join(' ');
  const fullName = session.user.user_metadata?.full_name || metadataName || email.split('@')[0];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 112 }}>
        <View className="px-5 pt-4 pb-5">
          <Text className="text-[28px] font-bold tracking-tight text-black">Profile</Text>
          <Text className="text-[14px] text-muted">Your CultureQuest progress</Text>
        </View>

        <View className="mx-5 mb-5 rounded-2xl border border-gray-200 bg-white p-5">
          <View className="mb-5 flex-row items-center gap-4">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary">
              <User size={28} color="white" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[20px] font-bold text-black" numberOfLines={1}>
                {fullName}
              </Text>
              <Text className="text-[13px] text-muted" numberOfLines={1}>
                {email}
              </Text>
            </View>
          </View>

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
    </SafeAreaView>
  );
}
