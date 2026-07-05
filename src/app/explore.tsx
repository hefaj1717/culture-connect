import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  Globe,
  MapPin,
  Search,
  Sparkles,
  Star,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  categoryLabels,
  eventCategoryLabels,
  events,
  languageLabels,
  venues,
} from '@/data/culture';

const audienceFilters = [
  { key: 'all', label: 'All Events' },
  { key: 'international', label: 'International' },
  { key: 'english', label: 'In English' },
  { key: 'free', label: 'Free' },
  { key: 'tonight', label: 'Tonight' },
];

export default function ExploreScreen() {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'events' | 'venues'>('events');
  const [audienceFilter, setAudienceFilter] = useState('all');

  const normalizedSearch = search.trim().toLowerCase();

  const filteredVenues = useMemo(
    () =>
      venues.filter(
        (venue) =>
          venue.name.toLowerCase().includes(normalizedSearch) ||
          venue.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch)),
      ),
    [normalizedSearch],
  );

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const matchesSearch =
          event.title.toLowerCase().includes(normalizedSearch) ||
          event.venueName.toLowerCase().includes(normalizedSearch);

        let matchesAudience = true;
        if (audienceFilter === 'international') matchesAudience = event.isInternational;
        if (audienceFilter === 'english') {
          matchesAudience = event.language === 'en' || event.language === 'multilingual';
        }
        if (audienceFilter === 'free') matchesAudience = event.isFree;
        if (audienceFilter === 'tonight') {
          matchesAudience =
            event.date.toLowerCase().includes('thu') ||
            event.date.toLowerCase().includes('fri') ||
            event.date.toLowerCase().includes('sat');
        }

        return matchesSearch && matchesAudience;
      }),
    [audienceFilter, normalizedSearch],
  );

  const featuredEvent = events.find((event) => event.isFlashQuest);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 112 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-5 pt-4 pb-2">
          <Text className="text-[28px] font-bold tracking-tight text-black">Discover</Text>
          <Text className="text-[14px] text-muted">Find your next adventure</Text>
        </View>

        <View className="px-5 mb-4">
          <View className="h-12 flex-row items-center gap-3 rounded-xl border border-gray-200 bg-gray-100 px-4">
            <Search size={17} color="#60646C" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search events, venues..."
              placeholderTextColor="#60646C"
              autoCapitalize="none"
              className="flex-1 text-[14px] text-black"
            />
          </View>
        </View>

        <View className="mb-4 flex-row gap-2 px-5">
          {(['events', 'venues'] as const).map((nextTab) => {
            const active = tab === nextTab;
            return (
              <Pressable
                key={nextTab}
                onPress={() => setTab(nextTab)}
                className={`rounded-full px-5 py-2.5 ${active ? 'bg-primary' : 'border border-gray-200 bg-gray-100'}`}
              >
                <Text
                  className={`text-[13px] font-semibold capitalize ${active ? 'text-white' : 'text-muted'}`}
                >
                  {nextTab}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'events' ? (
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-3"
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
            >
              {audienceFilters.map((filter) => {
                const active = audienceFilter === filter.key;
                return (
                  <Pressable
                    key={filter.key}
                    onPress={() => setAudienceFilter(filter.key)}
                    className={`rounded-full px-4 py-2 ${active ? 'bg-primary' : 'border border-gray-200 bg-gray-100'}`}
                  >
                    <Text
                      className={`text-[13px] font-medium ${active ? 'text-white' : 'text-muted'}`}
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {featuredEvent && (
              <View className="mb-6 px-5">
                <View className="mb-3 flex-row items-center gap-1.5">
                  <Flame size={14} color="#F59E0B" />
                  <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Live Now
                  </Text>
                </View>

                <View className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 p-5">
                  <View className="mb-2 flex-row flex-wrap items-center gap-2">
                    <View className="rounded-full bg-secondary px-2.5 py-1">
                      <Text className="text-[11px] font-bold text-white">Flash Quest</Text>
                    </View>
                    <View className="rounded-full border border-gray-200 px-2 py-0.5">
                      <Text className="text-[11px] font-medium text-muted">
                        {eventCategoryLabels[featuredEvent.category]}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
                      <Globe size={12} color="#3B82F6" />
                      <Text className="text-[11px] font-medium text-primary">
                        {languageLabels[featuredEvent.language]}
                      </Text>
                    </View>
                    {featuredEvent.isFree && (
                      <View className="rounded-full bg-success/10 px-2 py-0.5">
                        <Text className="text-[11px] font-bold text-success">Free</Text>
                      </View>
                    )}
                  </View>

                  <Text className="mb-1 text-[18px] font-bold text-black">
                    {featuredEvent.title}
                  </Text>
                  <Text className="mb-3 text-[13px] leading-5 text-muted" numberOfLines={2}>
                    {featuredEvent.description}
                  </Text>
                  <View className="mb-4 flex-row flex-wrap items-center gap-4">
                    <Text className="text-[13px] text-muted">{featuredEvent.date}</Text>
                    <View className="flex-row items-center gap-1">
                      <Sparkles size={13} color="#22C55E" />
                      <Text className="text-[13px] font-bold text-success">
                        +{featuredEvent.xpBonus} XP
                      </Text>
                    </View>
                    {!!featuredEvent.spotsLeft && (
                      <Text className="text-[13px] font-bold text-secondary">
                        {featuredEvent.spotsLeft} spots
                      </Text>
                    )}
                  </View>
                  <Pressable className="h-11 flex-row items-center justify-center gap-2 rounded-xl bg-primary active:opacity-80">
                    <CheckCircle2 size={16} color="white" />
                    <Text className="text-[14px] font-semibold text-white">Check In Here</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <View className="px-5">
              <Text className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
                {audienceFilter === 'international'
                  ? 'International Events'
                  : audienceFilter === 'english'
                    ? 'Events in English'
                    : audienceFilter === 'free'
                      ? 'Free Events'
                      : 'Coming Up'}
              </Text>

              {filteredEvents.length === 0 ? (
                <View className="items-center py-12">
                  <Text className="text-[14px] text-muted">No events found for this filter.</Text>
                </View>
              ) : (
                <View className="gap-3">
                  {filteredEvents.map((event) => (
                    <View
                      key={event.id}
                      className="flex-row items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4"
                    >
                      <View className="h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <Calendar size={22} color="#3B82F6" />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text
                          className="mb-0.5 text-[15px] font-semibold text-black"
                          numberOfLines={2}
                        >
                          {event.title}
                        </Text>
                        <Text className="mb-1.5 text-[13px] text-muted">{event.venueName}</Text>
                        <View className="flex-row flex-wrap items-center gap-2">
                          <View className="flex-row items-center gap-1">
                            <Clock size={12} color="#60646C" />
                            <Text className="text-[12px] text-muted">{event.time}</Text>
                          </View>
                          <Text className="text-[12px] font-bold text-success">
                            +{event.xpBonus} XP
                          </Text>
                          {event.isInternational && (
                            <View className="flex-row items-center gap-0.5">
                              <Globe size={12} color="#3B82F6" />
                              <Text className="text-[12px] font-medium text-primary">
                                {languageLabels[event.language]}
                              </Text>
                            </View>
                          )}
                          {event.isFree && (
                            <Text className="text-[12px] font-bold text-success">Free</Text>
                          )}
                        </View>
                      </View>
                      <Pressable className="h-9 flex-row items-center justify-center gap-1 rounded-full bg-primary/10 px-3 active:opacity-80">
                        <CheckCircle2 size={14} color="#3B82F6" />
                        <Text className="text-[12px] font-semibold text-primary">Check In</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : (
          <View className="gap-3 px-5">
            {filteredVenues.map((venue) => (
              <Pressable
                key={venue.id}
                className="flex-row items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 active:opacity-80"
              >
                <View
                  className="h-14 w-14 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${venue.color}20` }}
                >
                  <MapPin size={22} color={venue.color} />
                </View>
                <View className="min-w-0 flex-1">
                  <View className="mb-0.5 flex-row items-center gap-2">
                    <Text className="shrink text-[15px] font-semibold text-black" numberOfLines={1}>
                      {venue.name}
                    </Text>
                    {venue.isLive && (
                      <View className="rounded-full bg-success/10 px-1.5 py-0.5">
                        <Text className="text-[10px] font-bold text-success">LIVE</Text>
                      </View>
                    )}
                    {venue.isPartner && (
                      <View className="rounded-full bg-primary/10 px-1.5 py-0.5">
                        <Text className="text-[10px] font-bold text-primary">Partner</Text>
                      </View>
                    )}
                  </View>
                  <Text className="mb-1 text-[13px] text-muted">
                    {categoryLabels[venue.category]}
                  </Text>
                  <View className="flex-row items-center gap-3">
                    <View className="flex-row items-center gap-1">
                      <Star size={12} color="#F59E0B" fill="#F59E0B" />
                      <Text className="text-[12px] text-muted">{venue.rating}</Text>
                    </View>
                    <Text className="text-[12px] font-bold text-success">+{venue.xpReward} XP</Text>
                  </View>
                </View>
                <ChevronRight size={18} color="#60646C" />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
