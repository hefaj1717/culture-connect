import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/text';

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const timeHours = Array.from({ length: 24 }, (_, index) => index);
const timeMinutes = [0, 15, 30, 45];

type DatePickerModalProps = {
  month: Date;
  onChangeMonth: (date: Date) => void;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  visible: boolean;
};

export function DatePickerModal({
  month,
  onChangeMonth,
  onClose,
  onSelectDate,
  visible,
}: DatePickerModalProps) {
  const days = getCalendarDays(month);

  if (!visible) {
    return null;
  }

  return (
    <View className="absolute inset-0 z-50 justify-center bg-black/35 px-5">
      <Pressable className="absolute inset-0" onPress={onClose} />
      <View className="rounded-2xl bg-white p-4">
        <View className="mb-4 flex-row items-center justify-between">
          <Pressable
            onPress={() => onChangeMonth(addMonths(month, -1))}
            className="h-9 w-9 items-center justify-center rounded-full bg-subtle"
          >
            <Text className="text-title3 font-inter-semibold text-primary">{'‹'}</Text>
          </Pressable>
          <Text className="text-headline font-inter-bold text-ink">
            {monthNames[month.getMonth()]} {month.getFullYear()}
          </Text>
          <Pressable
            onPress={() => onChangeMonth(addMonths(month, 1))}
            className="h-9 w-9 items-center justify-center rounded-full bg-subtle"
          >
            <Text className="text-title3 font-inter-semibold text-primary">{'›'}</Text>
          </Pressable>
        </View>

        <View className="mb-2 flex-row">
          {weekdayLabels.map((day) => (
            <Text
              className="flex-1 text-center text-caption font-inter-semibold text-muted"
              key={day}
            >
              {day}
            </Text>
          ))}
        </View>

        <View className="flex-row flex-wrap">
          {days.map((date, index) => {
            const disabled = !date || isBeforeToday(date);

            return (
              <Pressable
                disabled={disabled}
                key={date ? date.toISOString() : `empty-${index}`}
                onPress={() => date && onSelectDate(date)}
                style={{ width: '14.2857%' }}
                className="aspect-square items-center justify-center p-1 disabled:opacity-35"
              >
                {date && (
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <Text className="text-footnote font-inter-semibold text-primary">{date.getDate()}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

type TimePickerModalProps = {
  hour: number;
  minute: number;
  onChangeHour: (hour: number) => void;
  onChangeMinute: (minute: number) => void;
  onClose: () => void;
  onConfirm: () => void;
  visible: boolean;
};

export function TimePickerModal({
  hour,
  minute,
  onChangeHour,
  onChangeMinute,
  onClose,
  onConfirm,
  visible,
}: TimePickerModalProps) {
  if (!visible) {
    return null;
  }

  return (
    <View className="absolute inset-0 z-50 justify-center bg-black/35 px-5">
      <Pressable className="absolute inset-0" onPress={onClose} />
      <View className="rounded-2xl bg-white p-4">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-title3 font-inter-bold text-ink">Choose time</Text>
          <Text className="text-headline font-inter-bold text-primary">
            {formatTimeUnit(hour)}:{formatTimeUnit(minute)}
          </Text>
        </View>

        <View className="mb-4 flex-row gap-3">
          <ScrollView className="max-h-[220px] flex-1 rounded-xl bg-subtle">
            {timeHours.map((nextHour) => (
              <Pressable
                key={nextHour}
                onPress={() => onChangeHour(nextHour)}
                className={`items-center py-3 ${
                  hour === nextHour ? 'bg-primary' : 'border-b border-white'
                }`}
              >
                <Text
                  className={`text-headline font-inter-semibold ${
                    hour === nextHour ? 'text-white' : 'text-ink'
                  }`}
                >
                  {formatTimeUnit(nextHour)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView className="max-h-[220px] flex-1 rounded-xl bg-subtle">
            {timeMinutes.map((nextMinute) => (
              <Pressable
                key={nextMinute}
                onPress={() => onChangeMinute(nextMinute)}
                className={`items-center py-3 ${
                  minute === nextMinute ? 'bg-primary' : 'border-b border-white'
                }`}
              >
                <Text
                  className={`text-headline font-inter-semibold ${
                    minute === nextMinute ? 'text-white' : 'text-ink'
                  }`}
                >
                  {formatTimeUnit(nextMinute)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <Pressable
          onPress={onConfirm}
          className="h-12 items-center justify-center rounded-xl bg-action active:opacity-85"
        >
          <Text className="text-body font-inter-semibold text-white">Set time</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function startOfMonth(date: Date) {
  return createCalendarDate(date.getFullYear(), date.getMonth(), 1);
}

export function formatEventDate(date: Date) {
  return `${weekdayLabels[(date.getDay() + 6) % 7]}, ${monthNames[date.getMonth()].slice(
    0,
    3,
  )} ${date.getDate()}`;
}

export function formatTimeUnit(value: number) {
  return value.toString().padStart(2, '0');
}

function getCalendarDays(month: Date) {
  const firstDay = startOfMonth(month);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate();
  const days: (Date | null)[] = Array.from({ length: startOffset }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(createCalendarDate(firstDay.getFullYear(), firstDay.getMonth(), day));
  }

  return days;
}

function addMonths(date: Date, amount: number) {
  return createCalendarDate(date.getFullYear(), date.getMonth() + amount, 1);
}

// A calendar day is not an instant in UTC. Keeping picker values at local noon
// prevents an ISO/time-zone conversion from moving a chosen day backwards.
function createCalendarDate(year: number, month: number, day: number) {
  return new Date(year, month, day, 12, 0, 0, 0);
}

function isBeforeToday(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const comparisonDate = new Date(date);
  comparisonDate.setHours(0, 0, 0, 0);
  return comparisonDate < today;
}
