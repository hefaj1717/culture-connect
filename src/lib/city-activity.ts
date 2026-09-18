import type { CityId } from '@/data/culture';
import { supabase } from '@/lib/supabase';

export type CityActivityBaseline = {
  activeUsers: number;
  registeredUsers: number;
};

export const EMPTY_CITY_ACTIVITY_BASELINE: CityActivityBaseline = {
  activeUsers: 0,
  registeredUsers: 0,
};

type CityActivityBaselineRow = {
  active_users: number | null;
  registered_users: number | null;
};

export async function fetchCityActivityBaseline(cityId: CityId) {
  const { data, error } = await supabase.rpc('city_activity_baseline', {
    _city_key: cityId,
  });

  if (error) {
    return { baseline: EMPTY_CITY_ACTIVITY_BASELINE, error: error.message };
  }

  const row = Array.isArray(data) ? (data[0] as CityActivityBaselineRow | undefined) : undefined;

  return {
    baseline: {
      activeUsers: Math.max(0, Number(row?.active_users ?? 0)),
      registeredUsers: Math.max(0, Number(row?.registered_users ?? 0)),
    },
    error: null,
  };
}
