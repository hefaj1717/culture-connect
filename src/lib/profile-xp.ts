import { getNetworkAwareErrorMessage } from '@/lib/network-errors';
import { supabase } from '@/lib/supabase';

type AwardXpResponse = {
  duplicate?: boolean;
  error?: string;
  success?: boolean;
  total_xp?: number;
  xp_earned?: number;
  qc_earned?: number;
  total_qc?: number;
};

type ConfirmEventAttendanceResponse = AwardXpResponse & {
  distance_m?: number;
};

export async function fetchUserXp(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('total_xp, total_qc')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return { error: getNetworkAwareErrorMessage(error.message), totalXp: 0, totalQc: 0 };
  }

  return { error: null, totalXp: Number(data?.total_xp ?? 0), totalQc: Number(data?.total_qc ?? 0) };
}

export async function awardUserXp({
  amount,
  reason,
  sourceKey,
}: {
  amount: number;
  reason: string;
  sourceKey: string;
}) {
  const { data, error } = await supabase.rpc('award_user_xp', {
    _amount: amount,
    _reason: reason,
    _source_key: sourceKey,
  });

  if (error) {
    return {
      duplicate: false,
      error: getNetworkAwareErrorMessage(error.message),
      totalXp: null,
      xpEarned: 0,
    };
  }

  const result = data as AwardXpResponse;

  if (!result.success) {
    return {
      duplicate: false,
      error: result.error ?? 'Could not award XP.',
      totalXp: typeof result.total_xp === 'number' ? result.total_xp : null,
    };
  }

  return {
    duplicate: !!result.duplicate,
    error: null,
    totalXp: typeof result.total_xp === 'number' ? result.total_xp : null,
  };
}

export async function confirmOrganizerEventAttendance({
  checkInCode,
  eventId,
  userLatitude,
  userLongitude,
}: {
  checkInCode: string;
  eventId: string;
  userLatitude: number;
  userLongitude: number;
}) {
  const { data, error } = await supabase.rpc('confirm_organizer_event_attendance', {
    _check_in_code: checkInCode,
    _event_id: eventId,
    _user_lat: userLatitude,
    _user_lng: userLongitude,
  });

  if (error) {
    return { duplicate: false, error: getNetworkAwareErrorMessage(error.message), totalXp: null, totalQc: null };
  }

  const result = data as ConfirmEventAttendanceResponse;

  if (!result.success) {
    return {
      duplicate: false,
      error: getAttendanceErrorMessage(result.error, result.distance_m),
      xpEarned: 0,
      qcEarned: 0,
      totalXp: typeof result.total_xp === 'number' ? result.total_xp : null,
      totalQc: typeof result.total_qc === 'number' ? result.total_qc : null,
    };
  }

  return {
    duplicate: !!result.duplicate,
    error: null,
    xpEarned: typeof result.xp_earned === 'number' ? result.xp_earned : 0,
    qcEarned: typeof result.qc_earned === 'number' ? result.qc_earned : 0,
    totalXp: typeof result.total_xp === 'number' ? result.total_xp : null,
    totalQc: typeof result.total_qc === 'number' ? result.total_qc : null,
  };
}

function getAttendanceErrorMessage(error?: string, distance?: number) {
  if (error === 'not_authenticated') return 'Log in again to confirm attendance.';
  if (error === 'event_unavailable') return 'This event is not available for check-in.';
  if (error === 'event_not_started')
    return 'Check-in is not open yet. Try again when the event starts.';
  if (error === 'event_finished') return 'Check-in for this event has already closed.';
  if (error === 'wrong_code') return 'This QR code does not match this event.';
  if (error === 'qr_expired') return 'This QR code has expired. Ask the organiser to open a new one.';
  if (error === 'missing_location') return 'This event is missing venue location data.';
  if (error === 'invalid_location') return 'Your location could not be verified. Try again at the venue.';
  if (error === 'too_far') {
    const distanceLabel =
      typeof distance === 'number' ? ` You are about ${Math.round(distance)}m away.` : '';
    return `You need to be within 500m of the venue.${distanceLabel}`;
  }

  return 'Could not confirm attendance. Try again.';
}
