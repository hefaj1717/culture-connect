import { textLimits } from '@/constants/text-limits';

export type AuthMode = 'signIn' | 'signUp' | 'confirmSignUp';

export type AuthFieldErrors = Partial<
  Record<
    'email' | 'password' | 'firstName' | 'lastName' | 'confirmationCode' | 'institutionName',
    string
  >
>;

export type AuthValidationInput = {
  applyAsOrganizer: boolean;
  confirmationCode: string;
  email: string;
  firstName: string;
  institutionName: string;
  lastName: string;
  mode: AuthMode;
  password: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAuthField(
  field: keyof AuthFieldErrors,
  input: AuthValidationInput,
): string | null {
  const normalizedEmail = input.email.trim().toLowerCase();

  if (field === 'email') {
    if (!normalizedEmail) return 'Email is required.';
    if (!emailPattern.test(normalizedEmail)) return 'Enter a valid email address.';
  }

  if (field === 'password') {
    if (!input.password) return 'Password is required.';
    if (input.mode === 'signUp' && input.password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    if (input.mode === 'signUp' && !/[A-Za-z]/.test(input.password)) {
      return 'Password must include at least one letter.';
    }
    if (input.mode === 'signUp' && !/[0-9]/.test(input.password)) {
      return 'Password must include at least one number.';
    }
  }

  if (input.mode === 'signUp' && field === 'firstName' && !input.firstName.trim()) {
    return 'First name is required.';
  }

  if (
    input.mode === 'signUp' &&
    field === 'firstName' &&
    input.firstName.length > textLimits.firstName
  ) {
    return `First name must be ${textLimits.firstName} characters or fewer.`;
  }

  if (input.mode === 'signUp' && field === 'lastName' && !input.lastName.trim()) {
    return 'Last name is required.';
  }

  if (
    input.mode === 'signUp' &&
    field === 'lastName' &&
    input.lastName.length > textLimits.lastName
  ) {
    return `Last name must be ${textLimits.lastName} characters or fewer.`;
  }

  if (
    input.mode === 'signUp' &&
    input.applyAsOrganizer &&
    field === 'institutionName' &&
    !input.institutionName.trim()
  ) {
    return 'Institution or business name is required.';
  }

  if (
    input.mode === 'signUp' &&
    input.applyAsOrganizer &&
    field === 'institutionName' &&
    input.institutionName.length > textLimits.organizerInstitutionName
  ) {
    return `Institution name must be ${textLimits.organizerInstitutionName} characters or fewer.`;
  }

  if (input.mode === 'confirmSignUp' && field === 'confirmationCode') {
    if (!input.confirmationCode.trim()) return 'Verification code is required.';
    if (!/^\d{4,8}$/.test(input.confirmationCode.trim())) {
      return 'Enter the verification code from your email.';
    }
  }

  return null;
}

export function validateAuthForm(input: AuthValidationInput) {
  const fields =
    input.mode === 'confirmSignUp'
      ? (['confirmationCode'] as const)
      : input.mode === 'signUp'
        ? ([
            'firstName',
            'lastName',
            'email',
            'password',
            ...(input.applyAsOrganizer ? (['institutionName'] as const) : []),
          ] as const)
        : (['email', 'password'] as const);

  const fieldErrors = fields.reduce<AuthFieldErrors>((errors, field) => {
    const error = validateAuthField(field, input);

    if (error) {
      errors[field] = error;
    }

    return errors;
  }, {});

  return {
    fieldErrors,
    isValid: Object.keys(fieldErrors).length === 0,
  };
}
