import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { type CityId, cultureCities } from '@/data/culture';
import { Text } from '@/components/ui/text';

type CitySelectorProps = {
  value: CityId;
  onChange: (cityId: CityId) => void;
};

export function CitySelector({ value, onChange }: CitySelectorProps) {
  return (
    <View className="gap-2">
      {cultureCities.map((city) => {
        const active = value === city.id;

        return (
          <Pressable
            key={city.id}
            onPress={() => onChange(city.id)}
            className={`min-h-[48px] flex-row items-center justify-between rounded-xl border px-4 py-3 active:opacity-85 ${
              active ? 'border-primary bg-primary/10' : 'border-line bg-white'
            }`}
          >
            <View>
              <Text className={`text-body font-inter-semibold ${active ? 'text-primary' : 'text-ink'}`}>
                {city.name}
              </Text>
              <Text className="text-caption text-muted">{city.country}</Text>
            </View>
            {active && (
              <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
                <Check size={14} color="white" strokeWidth={2.6} />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
