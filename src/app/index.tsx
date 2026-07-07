import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Flame,
  Gift,
  Globe,
  MapPin,
  Sparkles,
  TrendingUp,
  User,
  X,
} from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type CultureCityData, getCultureCityData, languageLabels } from '@/data/culture';

const notifications = [
  {
    id: 'pilot-live',
    title: 'Leuven Pilot is live',
    message: 'Start exploring today and earn your first XP reward.',
    time: 'Now',
    unread: true,
    icon: Sparkles,
    color: '#F59E0B',
  },
  {
    id: 'dance-night',
    title: 'Event tonight',
    message: 'Student Dance Night starts at STUK Arts Centre.',
    time: 'Today',
    unread: true,
    icon: CalendarDays,
    color: '#24458F',
  },
  {
    id: 'coffee-reward',
    title: 'Reward nearby',
    message: 'A cafe reward unlocks after two more check-ins.',
    time: 'This week',
    unread: false,
    icon: Gift,
    color: '#22C55E',
  },
];

type HomeScreenProps = {
  avatarInitials?: string | null;
  avatarUrl?: string | null;
  cityData?: CultureCityData;
  onOpenDiscover?: () => void;
  onOpenProfile?: () => void;
};

export default function HomeScreen({
  avatarInitials,
  avatarUrl,
  cityData = getCultureCityData(),
  onOpenDiscover,
  onOpenProfile,
}: HomeScreenProps) {
  const happeningNow = cityData.events.slice(0, 3);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(
    notifications.some((notification) => notification.unread),
  );

  function openNotifications() {
    setNotificationsOpen(true);
    setHasUnreadNotifications(false);
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ paddingBottom: 104 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="h-[520px] overflow-hidden bg-[#15233A]">
          <Image
            source={getHeroImageSource(cityData.heroImage)}
            contentFit="cover"
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={['rgba(14,28,58,0.16)', 'rgba(14,28,58,0.28)', 'rgba(14,28,58,0.86)']}
            locations={[0, 0.42, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0 z-20 px-5">
            <View className="flex-row items-center justify-between pt-3">
              <Text
                className="text-[23px] font-extrabold text-white"
                style={{ fontFamily: 'Georgia' }}
              >
                CultureQuest
              </Text>
              <View className="flex-row items-center gap-3">
                <Pressable
                  onPress={openNotifications}
                  className="relative h-11 w-11 items-center justify-center rounded-full bg-white/15 active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Open notifications"
                >
                  <Bell size={24} color="rgba(255,255,255,0.96)" strokeWidth={2.1} />
                  {hasUnreadNotifications && (
                    <View className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-destructive" />
                  )}
                </Pressable>
                <Pressable
                  onPress={onOpenProfile}
                  className="h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary active:opacity-85"
                >
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      contentFit="cover"
                      style={{ height: 44, width: 44 }}
                    />
                  ) : avatarInitials ? (
                    <Text className="text-[13px] font-extrabold text-white">{avatarInitials}</Text>
                  ) : (
                    <User size={22} color="white" strokeWidth={2.4} />
                  )}
                </Pressable>
              </View>
            </View>

            <View className="mt-10 items-center">
              <View className="flex-row items-center gap-2 rounded-full border border-white/25 bg-white/20 px-4 py-2">
                <View className="h-2 w-2 rounded-full bg-success" />
                <Text className="text-[12px] font-semibold text-white">{cityData.statusText}</Text>
              </View>
            </View>
          </SafeAreaView>

          <View className="absolute bottom-0 left-0 right-0 px-6 pb-7">
            <Text
              className="mb-2 text-[42px] font-extrabold leading-[45px] text-white"
              style={{ fontFamily: 'Georgia' }}
            >
              {cityData.heroTitle}
            </Text>
            <Text className="mb-4 max-w-[310px] text-[15px] leading-5 text-white/75">
              {cityData.heroSubtitle}
            </Text>

            <View className="mb-4 rounded-xl bg-secondary/95 px-4 py-2.5">
              <Text className="text-center text-[13px] font-semibold text-white">
                {cityData.pilotText}
              </Text>
            </View>

            <Pressable
              onPress={onOpenDiscover}
              className="h-[52px] flex-row items-center justify-center gap-2 rounded-xl bg-primary active:opacity-85"
            >
              <Text className="text-[16px] font-semibold text-white">Start Exploring</Text>
              <ArrowRight size={17} color="white" />
            </Pressable>
          </View>
        </View>

        <View className="bg-white px-5 py-5">
          <View className="flex-row items-center rounded-2xl border border-gray-200 bg-white p-4">
            <View className="flex-1 items-center">
              <Text className="text-[22px] font-bold text-black">1,860</Text>
              <Text className="text-[11px] font-medium text-muted">Your XP</Text>
            </View>
            <View className="h-8 w-px bg-gray-200" />
            <View className="flex-1 items-center">
              <View className="flex-row items-center gap-1">
                <Text className="text-[22px] font-bold text-black">12</Text>
                <Flame size={16} color="#F59E0B" />
              </View>
              <Text className="text-[11px] font-medium text-muted">Day Streak</Text>
            </View>
            <View className="h-8 w-px bg-gray-200" />
            <View className="flex-1 items-center">
              <Text className="text-[22px] font-bold text-black">#14</Text>
              <Text className="text-[11px] font-medium text-muted">Ranking</Text>
            </View>
          </View>
        </View>

        <View className="pb-8">
          <View className="mb-4 flex-row items-center gap-1.5 px-5">
            <Flame size={14} color="#F59E0B" />
            <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Happening Now
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          >
            {happeningNow.map((event) => (
              <Pressable
                onPress={onOpenDiscover}
                className="w-[178px] rounded-2xl border border-gray-200 bg-white p-4 active:opacity-85"
                key={event.id}
              >
                <View className="mb-3 h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                  <MapPin size={16} color="#24458F" />
                </View>
                <Text className="mb-0.5 text-[14px] font-semibold text-black" numberOfLines={2}>
                  {event.title}
                </Text>
                <Text className="mb-2 text-[12px] text-muted" numberOfLines={1}>
                  {event.venueName}
                </Text>
                <View className="flex-row flex-wrap items-center gap-2">
                  <View className="flex-row items-center gap-0.5">
                    <Sparkles size={12} color="#22C55E" />
                    <Text className="text-[12px] font-bold text-success">+{event.xpBonus} XP</Text>
                  </View>
                  {event.isFree && (
                    <View className="rounded-full bg-success/10 px-1.5 py-0.5">
                      <Text className="text-[10px] font-bold text-success">Free</Text>
                    </View>
                  )}
                </View>
                <View className="mt-1.5 flex-row items-center gap-1">
                  <Globe size={12} color="#24458F" />
                  <Text className="text-[11px] font-medium text-primary">
                    {languageLabels[event.language]}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View className="px-5">
          <View className="rounded-2xl border border-primary/10 bg-primary/5 p-5">
            <View className="mb-2 flex-row items-center gap-2">
              <TrendingUp size={16} color="#3B82F6" />
              <Text className="text-[13px] font-semibold text-primary">Level up tip</Text>
            </View>
            <Text className="text-[14px] leading-5 text-black/80">{cityData.levelTip}</Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setNotificationsOpen(false)}
        transparent
        visible={notificationsOpen}
      >
        <Pressable
          className="flex-1 bg-black/35 px-5 pt-14"
          onPress={() => setNotificationsOpen(false)}
        >
          <Pressable
            className="rounded-2xl bg-white p-4 shadow-lg"
            onPress={(event) => event.stopPropagation()}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Text className="text-[19px] font-extrabold text-black">Notifications</Text>
                <Text className="mt-0.5 text-[12px] font-medium text-muted">
                  Updates from CultureQuest
                </Text>
              </View>
              <Pressable
                onPress={() => setNotificationsOpen(false)}
                className="h-9 w-9 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                accessibilityRole="button"
                accessibilityLabel="Close notifications"
              >
                <X size={18} color="#5F6675" strokeWidth={2.4} />
              </Pressable>
            </View>

            <View className="gap-3">
              {notifications.map((notification) => {
                const Icon = notification.icon;

                return (
                  <Pressable
                    key={notification.id}
                    className="flex-row gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 active:opacity-85"
                    onPress={() => setNotificationsOpen(false)}
                  >
                    <View
                      className="h-10 w-10 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${notification.color}18` }}
                    >
                      <Icon size={18} color={notification.color} strokeWidth={2.4} />
                    </View>
                    <View className="flex-1">
                      <View className="mb-0.5 flex-row items-center justify-between gap-2">
                        <Text className="flex-1 text-[14px] font-bold text-black">
                          {notification.title}
                        </Text>
                        <Text className="text-[11px] font-semibold text-muted">
                          {notification.time}
                        </Text>
                      </View>
                      <Text className="text-[12px] leading-4 text-muted">
                        {notification.message}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function getHeroImageSource(heroImage: CultureCityData['heroImage']) {
  if (heroImage === 'lublin') {
    return require('@/assets/images/culture/hero-lublin.jpg');
  }

  return require('@/assets/images/culture/hero-culture.jpg');
}
