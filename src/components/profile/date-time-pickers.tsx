import { Pressable, ScrollView, Text, View } from 'react-native';

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
            className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"
          >
            <Text className="text-[20px] font-bold text-primary">{'‹'}</Text>
          </Pressable>
          <Text className="text-[17px] font-extrabold text-ink">
            {monthNames[month.getMonth()]} {month.getFullYear()}
          </Text>
          <Pressable
            onPress={() => onChangeMonth(addMonths(month, 1))}
            className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"
          >
            <Text className="text-[20px] font-bold text-primary">{'›'}</Text>
          </Pressable>
        </View>

        <View className="mb-2 flex-row">
          {weekdayLabels.map((day) => (
            <Text
              className="flex-1 text-center text-[11px] font-bold uppercase text-muted"
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
                    <Text className="text-[13px] font-bold text-primary">{date.getDate()}</Text>
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
          <Text className="text-[19px] font-extrabold text-ink">Choose time</Text>
          <Text className="text-[17px] font-extrabold text-primary">
            {formatTimeUnit(hour)}:{formatTimeUnit(minute)}
          </Text>
        </View>

        <View className="mb-4 flex-row gap-3">
          <ScrollView className="max-h-[220px] flex-1 rounded-xl bg-gray-100">
            {timeHours.map((nextHour) => (
              <Pressable
                key={nextHour}
                onPress={() => onChangeHour(nextHour)}
                className={`items-center py-3 ${
                  hour === nextHour ? 'bg-primary' : 'border-b border-white'
                }`}
              >
                <Text
                  className={`text-[16px] font-bold ${
                    hour === nextHour ? 'text-white' : 'text-ink'
                  }`}
                >
                  {formatTimeUnit(nextHour)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView className="max-h-[220px] flex-1 rounded-xl bg-gray-100">
            {timeMinutes.map((nextMinute) => (
              <Pressable
                key={nextMinute}
                onPress={() => onChangeMinute(nextMinute)}
                className={`items-center py-3 ${
                  minute === nextMinute ? 'bg-primary' : 'border-b border-white'
                }`}
              >
                <Text
                  className={`text-[16px] font-bold ${
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
          className="h-12 items-center justify-center rounded-xl bg-primary active:opacity-85"
        >
          <Text className="text-[14px] font-semibold text-white">Set time</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
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
    days.push(new Date(firstDay.getFullYear(), firstDay.getMonth(), day));
  }

  return days;
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function isBeforeToday(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const comparisonDate = new Date(date);
  comparisonDate.setHours(0, 0, 0, 0);
  return comparisonDate < today;
}
