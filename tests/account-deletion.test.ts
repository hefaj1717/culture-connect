const mockInvoke = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { signOut: (...args: unknown[]) => mockSignOut(...args) },
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

import { deleteCurrentAccount } from '@/lib/account-deletion';

describe('deleteCurrentAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
  });

  it('clears the local session only after server deletion succeeds', async () => {
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

    await expect(deleteCurrentAccount()).resolves.toEqual({ error: null });
    expect(mockInvoke).toHaveBeenCalledWith('delete-account', { body: {} });
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('keeps the session when server deletion fails', async () => {
    mockInvoke.mockResolvedValue({
      data: { error: 'account_deletion_failed' },
      error: null,
    });

    const result = await deleteCurrentAccount();

    expect(result.error).toContain('could not be deleted');
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('shows the offline message when the function cannot be reached', async () => {
    mockInvoke.mockRejectedValue(new Error('Network request failed'));

    await expect(deleteCurrentAccount()).resolves.toEqual({
      error: "You're offline. Check your connection, then try again.",
    });
  });
});
