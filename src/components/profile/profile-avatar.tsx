import { Image } from 'expo-image';
import { User } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Colors, GamificationColors } from '@/constants/theme';

type AvatarProps = {
  iconSize: number;
  initials?: string | null;
  size: number;
  uri?: string | null;
};

export function Avatar({ iconSize, initials, size, uri }: AvatarProps) {
  return (
    <View
      className="items-center justify-center overflow-hidden rounded-full bg-primary"
      style={{ height: size, width: size }}
    >
      {uri ? (
        <Image source={{ uri }} contentFit="cover" style={{ height: size, width: size }} />
      ) : initials ? (
        <Text className="font-ui text-[32px] text-white">{initials}</Text>
      ) : (
        <User size={iconSize} color="white" strokeWidth={2.2} />
      )}
    </View>
  );
}

type RankAvatarProps = {
  initials: string | null;
  progressPercent: number;
  uri?: string | null;
};

export function RankAvatar({ initials, progressPercent, uri }: RankAvatarProps) {
  return (
    <View className="relative h-[96px] w-[96px] items-center justify-center">
      <ProgressRing progressPercent={progressPercent} size={96} strokeWidth={8} />
      <View className="h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full bg-white/15">
        {uri ? (
          <Image source={{ uri }} contentFit="cover" style={{ height: 72, width: 72 }} />
        ) : (
          <View className="h-[72px] w-[72px] items-center justify-center bg-primary">
            <Text className="font-ui text-[22px] font-extrabold text-white">
              {initials ?? 'CQ'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function ProgressRing({
  progressPercent,
  size,
  strokeWidth,
}: {
  progressPercent: number;
  size: number;
  strokeWidth: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(100, Math.max(0, progressPercent));
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <Svg height={size} style={styles.progressRing} width={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        fill="transparent"
        r={radius}
        stroke={Colors.light.progressTrack}
        strokeWidth={strokeWidth}
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        fill="transparent"
        r={radius}
        stroke={GamificationColors.xp}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        strokeWidth={strokeWidth}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  progressRing: {
    position: 'absolute',
  },
});
