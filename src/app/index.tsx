import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { ArrowRight, Bell, Flame, Globe, MapPin, Sparkles, TrendingUp } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const EVENTS = [
  {
    title: 'Student Dance Night',
    venue: 'STUK Arts Centre',
    xp: 80,
    lang: 'English',
    free: true,
  },
  {
    title: 'Photography Exhibition',
    venue: 'M-Museum Leuven',
    xp: 100,
    lang: 'English',
    free: false,
  },
  {
    title: 'Free Sunday at M-Museum',
    venue: 'M-Museum Leuven',
    xp: 100,
    lang: 'Multilingual',
    free: true,
  },
];

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Hero */}
        <View className="h-[420px] justify-end overflow-hidden bg-slate-800">
          <LinearGradient
            colors={['rgba(15,30,60,0.2)', 'rgba(15,30,60,0.9)']}
            style={StyleSheet.absoluteFillObject}
          />

          <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0 z-20 px-5">
            <View className="flex-row items-center justify-between pt-2">
              <Text className="text-[17px] font-bold text-white">CultureQuest</Text>
              <View className="flex-row items-center gap-3">
                <View>
                  <Bell size={20} color="rgba(255,255,255,0.8)" />
                  <View className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive" />
                </View>
                <View className="h-8 w-8 rounded-full bg-primary items-center justify-center">
                  <Text className="text-[11px] font-bold text-white">ME</Text>
                </View>
              </View>
            </View>

            <View className="items-center mt-10">
              <View className="flex-row items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15">
                <View className="h-2 w-2 rounded-full bg-success" />
                <Text className="text-[12px] font-medium text-white">
                  Students exploring your city right now
                </Text>
              </View>
            </View>
          </SafeAreaView>

          <View className="relative z-10 px-6 pb-6">
            <Text className="text-[34px] leading-[38px] font-extrabold text-white mb-1">
              Your city.{'\n'}Your adventure.
            </Text>
            <Text className="text-[15px] text-white/70 mb-4 max-w-[300px]">
              Explore your city&apos;s cultural scene. Earn XP. Unlock real rewards at local cafés.
            </Text>

            <View className="mb-4 px-4 py-2.5 rounded-xl bg-secondary/90">
              <Text className="text-[13px] font-semibold text-center text-white">
                🎉 Pilot is LIVE — join now
              </Text>
            </View>

            <Link href="/explore" asChild>
              <Pressable className="h-[52px] rounded-xl bg-primary flex-row items-center justify-center gap-2 active:opacity-80">
                <Text className="text-white font-semibold text-[16px]">Start Exploring</Text>
                <ArrowRight size={16} color="white" />
              </Pressable>
            </Link>
          </View>
        </View>

        {/* Stats strip */}
        <View className="px-5 py-5">
          <View className="flex-row items-center gap-3 p-4 rounded-2xl bg-white border border-gray-200">
            <View className="flex-1 items-center">
              <Text className="text-[22px] font-bold text-black">1,860</Text>
              <Text className="text-[11px] text-muted font-medium">Your XP</Text>
            </View>
            <View className="w-px h-8 bg-gray-200" />
            <View className="flex-1 items-center">
              <View className="flex-row items-center gap-1">
                <Text className="text-[22px] font-bold text-black">12</Text>
                <Flame size={16} color="#F59E0B" />
              </View>
              <Text className="text-[11px] text-muted font-medium">Day Streak</Text>
            </View>
            <View className="w-px h-8 bg-gray-200" />
            <View className="flex-1 items-center">
              <Text className="text-[22px] font-bold text-black">#14</Text>
              <Text className="text-[11px] text-muted font-medium">Ranking</Text>
            </View>
          </View>
        </View>

        {/* Happening Now */}
        <View className="pb-8">
          <Text className="px-5 mb-4 text-[11px] font-semibold uppercase text-muted tracking-wide">
            Happening Now
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5">
            {EVENTS.map((ev) => (
              <Link href="/explore" asChild key={ev.title}>
                <Pressable className="w-[170px] mr-3 bg-white rounded-2xl p-4 border border-gray-200">
                  <View className="h-10 w-10 rounded-xl mb-3 items-center justify-center bg-primary/15">
                    <MapPin size={16} color="#3B82F6" />
                  </View>
                  <Text className="text-[14px] font-semibold text-black mb-0.5" numberOfLines={2}>
                    {ev.title}
                  </Text>
                  <Text className="text-[12px] text-muted mb-2">{ev.venue}</Text>
                  <View className="flex-row items-center gap-2 flex-wrap">
                    <View className="flex-row items-center gap-0.5">
                      <Sparkles size={12} color="#22C55E" />
                      <Text className="text-[12px] font-bold text-success">+{ev.xp} XP</Text>
                    </View>
                    {ev.free && (
                      <View className="bg-success/10 px-1.5 py-0.5 rounded-full">
                        <Text className="text-[10px] font-bold text-success">Free</Text>
                      </View>
                    )}
                  </View>
                  <View className="flex-row items-center gap-1 mt-1.5">
                    <Globe size={12} color="#3B82F6" />
                    <Text className="text-[11px] text-primary font-medium">{ev.lang}</Text>
                  </View>
                </Pressable>
              </Link>
            ))}
          </ScrollView>
        </View>

        {/* Motivation */}
        <View className="px-5 pb-10">
          <View className="rounded-2xl p-5 bg-primary/5 border border-primary/10">
            <View className="flex-row items-center gap-2 mb-2">
              <TrendingUp size={16} color="#3B82F6" />
              <Text className="text-[13px] font-semibold text-primary">Level up tip</Text>
            </View>
            <Text className="text-[14px] text-black/80">
              Check in at 2 more venues this week to unlock the{' '}
              <Text className="font-semibold text-black">Weekend Explorer</Text> badge! 🏅
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
