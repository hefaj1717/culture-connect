import {
  validateAuthField,
  validateAuthForm,
  type AuthValidationInput,
} from '@/lib/auth-validation';

const validSignUp: AuthValidationInput = {
  applyAsOrganizer: false,
  confirmationCode: '',
  email: 'student@example.com',
  firstName: 'Ada',
  institutionName: '',
  isStudent: false,
  lastName: 'Lovelace',
  mode: 'signUp',
  password: 'Culture123',
  studentEmail: '',
  universityId: '',
};

describe('auth validation', () => {
  it('accepts a regular account without a student or organizer affiliation', () => {
    expect(validateAuthForm(validSignUp)).toEqual({ fieldErrors: {}, isValid: true });
  });

  it('requires a valid email and password for sign in without applying sign-up rules', () => {
    const result = validateAuthForm({
      ...validSignUp,
      email: 'invalid',
      mode: 'signIn',
      password: '',
    });

    expect(result.isValid).toBe(false);
    expect(result.fieldErrors).toEqual({
      email: 'Enter a valid email address.',
      password: 'Password is required.',
    });
  });

  it('enforces the stronger password rules only during sign up', () => {
    expect(validateAuthField('password', { ...validSignUp, password: '12345678' })).toBe(
      'Password must include at least one letter.',
    );
    expect(validateAuthField('password', { ...validSignUp, password: 'abcdefgh' })).toBe(
      'Password must include at least one number.',
    );
    expect(
      validateAuthField('password', { ...validSignUp, mode: 'signIn', password: 'short' }),
    ).toBeNull();
  });

  it('requires an institution only when applying as an organizer', () => {
    const result = validateAuthForm({ ...validSignUp, applyAsOrganizer: true });

    expect(result.isValid).toBe(false);
    expect(result.fieldErrors.institutionName).toBe('Institution or business name is required.');
  });

  it('requires a student email only after a university is selected', () => {
    expect(validateAuthForm({ ...validSignUp, isStudent: true }).isValid).toBe(true);

    const selectedUniversity = validateAuthForm({
      ...validSignUp,
      isStudent: true,
      universityId: 'umcs',
    });

    expect(selectedUniversity.isValid).toBe(false);
    expect(selectedUniversity.fieldErrors.studentEmail).toBe('Student email is required.');
  });

  it('validates email confirmation codes independently of the sign-up fields', () => {
    const invalid = validateAuthForm({
      ...validSignUp,
      confirmationCode: '12AB',
      email: '',
      mode: 'confirmSignUp',
      password: '',
    });
    const valid = validateAuthForm({
      ...validSignUp,
      confirmationCode: '123456',
      email: '',
      mode: 'confirmSignUp',
      password: '',
    });

    expect(invalid.fieldErrors).toEqual({
      confirmationCode: 'Enter the verification code from your email.',
    });
    expect(valid).toEqual({ fieldErrors: {}, isValid: true });
  });
});
