import { getNetworkAwareErrorMessage } from '@/lib/network-errors';
import { supabase } from '@/lib/supabase';

type DeleteAccountResponse = {
  error?: string;
  success?: boolean;
};

export async function deleteCurrentAccount() {
  try {
    const { data, error } = await supabase.functions.invoke<DeleteAccountResponse>(
      'delete-account',
      { body: {} },
    );

    if (error || !data?.success) {
      return {
        error: getDeleteAccountError(error?.message ?? data?.error),
      };
    }

    // The server has removed the Auth user and refresh tokens. Clear the local
    // session immediately so an already-issued JWT is not retained by the app.
    await supabase.auth.signOut({ scope: 'local' });
    return { error: null };
  } catch (error) {
    return {
      error: getDeleteAccountError(error instanceof Error ? error.message : null),
    };
  }
}

function getDeleteAccountError(error?: string | null) {
  if (error === 'not_authenticated') return 'Your session expired. Please sign in again.';
  if (error === 'account_deletion_failed') {
    return 'Your account could not be deleted. No account data was removed. Please try again.';
  }

  return getNetworkAwareErrorMessage(error, 'Your account could not be deleted. Please try again.');
}
