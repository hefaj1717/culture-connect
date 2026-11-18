import { Building2, CheckCircle2, CircleAlert } from 'lucide-react-native';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';

type OrganizerStatus = 'pending' | 'approved' | 'rejected';

export function OrganizerVerifiedBadge({ compact = false }: { compact?: boolean }) {
  return (
    <View
      className={`self-start flex-row items-center gap-1.5 rounded-full bg-accent/15 ${
        compact ? 'px-2 py-1' : 'px-2.5 py-1.5'
      }`}
    >
      <View
        className="items-center justify-center rounded-full bg-accent"
        style={{ height: compact ? 15 : 16, width: compact ? 15 : 16 }}
      >
        <CheckCircle2 size={compact ? 11 : 12} color="white" strokeWidth={3} />
      </View>
      <Text
        className={`font-inter-bold text-ink ${
          compact ? 'text-caption' : 'text-caption'
        }`}
      >
        Approved
      </Text>
    </View>
  );
}

export function OrganizerStatusCard({ status }: { status: OrganizerStatus }) {
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';
  const color = isApproved ? '#A63446' : isRejected ? '#EF4444' : '#A63446';
  const Icon = isApproved ? CheckCircle2 : isRejected ? CircleAlert : Building2;
  const title = isApproved
    ? 'Organizer approved'
    : isRejected
      ? 'Organizer application rejected'
      : 'Organizer application pending';
  const message = isApproved
    ? 'Your institution has been approved. Event creation tools are next.'
    : isRejected
      ? 'Your organizer request was not approved. Contact CultureQuest support before applying again.'
      : 'CultureQuest admin must approve the institution before event creation is enabled.';

  return (
    <View
      className="mb-3 flex-row gap-3 rounded-xl border p-3"
      style={{
        backgroundColor: `${color}14`,
        borderColor: `${color}35`,
      }}
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon size={17} color={color} strokeWidth={2.4} />
      </View>
      <View className="flex-1">
        <Text className="text-footnote font-inter-semibold text-ink">{title}</Text>
        <Text className="mt-0.5 text-caption leading-4 text-muted">{message}</Text>
      </View>
    </View>
  );
}
