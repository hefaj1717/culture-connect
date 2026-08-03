import { getNetworkAwareErrorMessage } from '@/lib/network-errors';
import { supabase } from '@/lib/supabase';

type XpTransactionRow = {
  id: string;
  amount: number | null;
  balance_after: number | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
  reason: string | null;
  source_id: string | null;
  source_key: string | null;
  source_type: string | null;
  transaction_type: 'earn' | 'spend' | 'adjustment' | null;
  user_id: string;
};

type ProfileSummaryRow = {
  id: string;
  username: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

export type XpTransaction = {
  amount: number;
  balanceAfter: number | null;
  createdAt: string;
  id: string;
  metadata: Record<string, unknown>;
  reason: string;
  sourceId: string | null;
  sourceKey: string | null;
  sourceType: string | null;
  transactionType: 'earn' | 'spend' | 'adjustment';
  userId: string;
  userLabel: string;
};

export async function fetchXpTransactions({
  limit = 30,
  userId,
}: {
  limit?: number;
  userId?: string;
} = {}) {
  let query = supabase
    .from('xp_transactions')
    .select(
      'id, user_id, amount, reason, source_key, transaction_type, source_type, source_id, balance_after, metadata, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    return { error: getNetworkAwareErrorMessage(error.message), transactions: [] as XpTransaction[] };
  }

  const rows = (data ?? []) as XpTransactionRow[];
  const profilesById = await fetchTransactionProfiles(rows.map((row) => row.user_id));

  return {
    error: null,
    transactions: rows.map((row) => mapXpTransaction(row, profilesById[row.user_id])),
  };
}

async function fetchTransactionProfiles(userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueUserIds.length === 0) return {} as Record<string, ProfileSummaryRow>;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name')
    .in('id', uniqueUserIds);

  if (error) return {} as Record<string, ProfileSummaryRow>;

  return ((data ?? []) as ProfileSummaryRow[]).reduce<Record<string, ProfileSummaryRow>>(
    (lookup, profile) => ({
      ...lookup,
      [profile.id]: profile,
    }),
    {},
  );
}

function mapXpTransaction(row: XpTransactionRow, profile?: ProfileSummaryRow): XpTransaction {
  return {
    amount: Math.max(0, Number(row.amount ?? 0)),
    balanceAfter: typeof row.balance_after === 'number' ? row.balance_after : null,
    createdAt: row.created_at,
    id: row.id,
    metadata: row.metadata ?? {},
    reason: row.reason?.trim() || 'CultureQuest activity',
    sourceId: row.source_id,
    sourceKey: row.source_key,
    sourceType: row.source_type,
    transactionType: row.transaction_type ?? 'earn',
    userId: row.user_id,
    userLabel: getProfileLabel(profile, row.user_id),
  };
}

function getProfileLabel(profile: ProfileSummaryRow | undefined, userId: string) {
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  if (profile?.username?.trim()) return profile.username.trim();

  return `User ${userId.slice(0, 8)}`;
}
