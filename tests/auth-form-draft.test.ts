import { retainAuthDraft } from '@/lib/auth-form-draft';

describe('retainAuthDraft', () => {
  it('restores a credential if a native input clears after a rejected sign-in', () => {
    expect(retainAuthDraft('', 'student@example.com')).toBe('student@example.com');
    expect(retainAuthDraft('', 'correct horse battery staple')).toBe('correct horse battery staple');
  });

  it('never overwrites a value the user changed while a sign-in was pending', () => {
    expect(retainAuthDraft('new-password', 'old-password')).toBe('new-password');
  });
});
