import { useEffect, useRef, useState } from 'react';
import { Building2, Check, Eye, EyeOff, GraduationCap } from 'lucide-react-native';
import {
  ActivityIndicator,
  findNodeHandle,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  type TextInputProps,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewInstance,
  type TextInputInstance,
} from 'react-native';

import { BrandImage } from '@/components/brand-image';
import { CitySelector } from '@/components/city-selector';
import { FormFieldError } from '@/components/form-field-error';
import { Colors } from '@/constants/theme';
import { limitText, textLimits } from '@/constants/text-limits';
import { type CityId, defaultCityId } from '@/data/culture';
import { getUniversitiesForCity } from '@/data/universities';
import {
  type AuthFieldErrors,
  type AuthValidationInput,
  validateAuthField,
  validateAuthForm,
} from '@/lib/auth-validation';
import { retainAuthDraft } from '@/lib/auth-form-draft';
import { OFFLINE_ERROR_MESSAGE } from '@/lib/network-errors';
import { useAuth } from '@/providers/auth-provider';
import { useNetworkStatus } from '@/providers/network-provider';
import { Text, TextInput } from '@/components/ui/text';

const organizerTypes = [
  { key: 'cultural_institution', label: 'Cultural institution' },
  { key: 'cafe_or_business', label: 'Cafe / business' },
  { key: 'student_organization', label: 'Student organization' },
  { key: 'city_partner', label: 'City partner' },
];

type AuthInputProps = TextInputProps & {
  inputClassName?: string;
  inputRef?: ((node: TextInputInstance | null) => void) | { current: TextInputInstance | null };
  className?: string;
  /** Visible field label. Defaults to the placeholder, which is then not repeated inside the field. */
  label?: string;
};

function AuthInput({
  inputRef,
  inputClassName,
  className,
  label,
  onBlur,
  onFocus,
  ...props
}: AuthInputProps) {
  const internalRef = useRef<TextInputInstance>(null);
  const [focused, setFocused] = useState(false);
  const visibleLabel = label ?? props.placeholder;

  function focusInput() {
    internalRef.current?.focus();
  }

  return (
    <Pressable accessible={false} onPress={focusInput}>
      {visibleLabel ? (
        <Text className="mb-1.5 text-footnote font-inter-medium text-ink">{visibleLabel}</Text>
      ) : null}
      <TextInput
        ref={(node) => {
          internalRef.current = node;
          if (typeof inputRef === 'function') {
            inputRef(node);
          } else if (inputRef) {
            inputRef.current = node;
          }
        }}
        accessibilityLabel={props.accessibilityLabel ?? visibleLabel}
        {...props}
        placeholder={label ? props.placeholder : undefined}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        className={
          inputClassName ??
          className ??
          'min-h-[48px] rounded-xl border border-line bg-surface px-4 py-3 text-body text-ink'
        }
        style={focused ? { borderColor: Colors.light.primary } : undefined}
      />
    </Pressable>
  );
}

export function AuthScreen() {
  const { authError, clearAuthError, signIn, signUp, verifySignUpCode, resendSignUpCode } = useAuth();
  const { isOffline } = useNetworkStatus();
  const scrollViewRef = useRef<ScrollViewInstance>(null);
  const confirmationCodeRef = useRef<TextInputInstance>(null);
  const firstNameRef = useRef<TextInputInstance>(null);
  const lastNameRef = useRef<TextInputInstance>(null);
  const institutionNameRef = useRef<TextInputInstance>(null);
  const websiteUrlRef = useRef<TextInputInstance>(null);
  const contactRoleRef = useRef<TextInputInstance>(null);
  const organizerNoteRef = useRef<TextInputInstance>(null);
  const studentEmailRef = useRef<TextInputInstance>(null);
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const [mode, setMode] = useState<'signIn' | 'signUp' | 'confirmSignUp'>('signIn');
  const [email, setEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cityId, setCityId] = useState<CityId>(defaultCityId);
  const [isStudent, setIsStudent] = useState(false);
  const [selectedUniversityId, setSelectedUniversityId] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [applyAsOrganizer, setApplyAsOrganizer] = useState(false);
  const [institutionName, setInstitutionName] = useState('');
  const [institutionType, setInstitutionType] = useState(organizerTypes[0].key);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [organizerNote, setOrganizerNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  const validationInput: AuthValidationInput = {
    applyAsOrganizer,
    confirmationCode,
    email: mode === 'confirmSignUp' ? pendingEmail || email : email,
    firstName,
    institutionName,
    isStudent,
    lastName,
    mode,
    password,
    studentEmail,
    universityId: selectedUniversityId,
  };
  const cityUniversities = getUniversitiesForCity(cityId);

  function keepInputAboveKeyboard(inputRef: React.RefObject<TextInputInstance | null>) {
    setTimeout(() => {
      const nodeHandle = findNodeHandle(inputRef.current);
      const scrollResponder = scrollViewRef.current as
        | (ScrollView & {
            scrollResponderScrollNativeHandleToKeyboard?: (
              nodeHandle: number,
              extraHeight: number,
              preventNegativeScrollOffset: boolean,
            ) => void;
          })
        | null;

      if (!nodeHandle || !scrollResponder?.scrollResponderScrollNativeHandleToKeyboard) {
        return;
      }

      scrollResponder.scrollResponderScrollNativeHandleToKeyboard(nodeHandle, 14, true);
    }, 80);
  }

  async function handleSubmit() {
    clearAuthError();
    setError(null);
    setNotice(null);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFirstName = limitText(firstName.trim(), textLimits.firstName);
    const normalizedLastName = limitText(lastName.trim(), textLimits.lastName);

    const validation = validateAuthForm(validationInput);
    setFieldErrors(validation.fieldErrors);

    if (!validation.isValid) {
      setError('Please fix the highlighted fields.');
      return;
    }

    if (isOffline) {
      setError(OFFLINE_ERROR_MESSAGE);
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    if (mode === 'signIn') {
      const submittedEmail = email;
      const submittedPassword = password;
      const result = await signIn(normalizedEmail, password);
      setLoading(false);

      if (result.error) {
        // Some native password managers clear a secure TextInput after a rejected
        // sign-in. Keep the user's draft so they can correct it instead of typing
        // both fields again. Never overwrite a value changed while the request ran.
        setEmail((currentEmail) => retainAuthDraft(currentEmail, submittedEmail));
        setPassword((currentPassword) => retainAuthDraft(currentPassword, submittedPassword));
        setError(result.error);
      }
      return;
    }

    const result = await signUp(
      normalizedEmail,
      password,
      normalizedFirstName,
      normalizedLastName,
      cityId,
      applyAsOrganizer
        ? {
            institutionName: limitText(institutionName.trim(), textLimits.organizerInstitutionName),
            institutionType,
            websiteUrl: limitText(websiteUrl.trim(), textLimits.websiteUrl),
            contactRole: limitText(contactRole.trim(), textLimits.organizerRole),
            note: limitText(organizerNote.trim(), textLimits.organizerNote),
          }
        : null,
      isStudent
        ? {
            isStudent: true,
            studentEmail: limitText(studentEmail.trim().toLowerCase(), textLimits.email),
            universityId: selectedUniversityId,
          }
        : null,
    );
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.needsConfirmation) {
      setPendingEmail(normalizedEmail);
      setMode('confirmSignUp');
      setNotice('Check your inbox. Enter the code if shown, or use the confirmation link.');
      return;
    }

    setNotice(
      applyAsOrganizer
        ? 'Account created. Your organizer application is pending review.'
        : 'Account created. You are now logged in.',
    );
  }

  async function handleConfirmCode() {
    clearAuthError();
    setError(null);
    setNotice(null);

    const normalizedEmail = (pendingEmail || email).trim();
    const normalizedCode = confirmationCode.trim();

    const validation = validateAuthForm(validationInput);
    setFieldErrors(validation.fieldErrors);

    if (!normalizedEmail || !validation.isValid) {
      setError('Please fix the highlighted fields.');
      return;
    }

    if (isOffline) {
      setError(OFFLINE_ERROR_MESSAGE);
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    const result = await verifySignUpCode(normalizedEmail, normalizedCode);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setNotice('Email confirmed. You are now logged in.');
  }

  async function handleResendCode() {
    setError(null);
    setNotice(null);

    const normalizedEmail = (pendingEmail || email).trim();
    if (!normalizedEmail) {
      setError('Enter your email first.');
      return;
    }

    if (isOffline) {
      setError(OFFLINE_ERROR_MESSAGE);
      return;
    }

    setLoading(true);
    const result = await resendSignUpCode(normalizedEmail);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setNotice('A new confirmation code was sent.');
  }

  function handleFieldBlur(field: keyof AuthFieldErrors) {
    setFieldErrors((current) => ({
      ...current,
      [field]: validateAuthField(field, validationInput),
    }));
  }

  function clearFieldError(field: keyof AuthFieldErrors) {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-canvas"
    >
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 44 }}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        scrollIndicatorInsets={{ bottom: 44 }}
      >
        <View className="flex-1 bg-canvas" testID="auth.screen">
          <BrandImage
            source={require('@/assets/images/culture/hero-culture.jpg')}
            withTextGradient
            className="h-[268px] bg-ink"
            style={styles.hero}
          >
            <View className="absolute inset-x-0 bottom-0 px-6 pb-8">
              <Text className="font-heading text-largeTitle leading-[43px] text-white">
                CultureQuest
              </Text>
              <Text className="mt-3 max-w-[300px] font-body text-body leading-6 text-white/85">
                Discover the city, earn XP, and unlock student rewards.
              </Text>
            </View>
          </BrandImage>

          <View className="-mt-5 flex-1 rounded-t-3xl bg-canvas px-6 pb-8 pt-7">
            <Text className="mb-6 font-ui text-headline text-ink">
              {mode === 'signIn'
                ? 'Log in to continue'
                : mode === 'signUp'
                  ? 'Create an account to start exploring'
                  : 'Verify your email'}
            </Text>

            {mode === 'confirmSignUp' ? (
              <>
                <Text className="mb-4 text-body leading-5 text-muted">
                  We sent a confirmation email to {pendingEmail || email}. Enter the verification
                  code if your email shows one, or use the confirmation link.
                </Text>
                <AuthInput
                  inputRef={confirmationCodeRef}
                  value={confirmationCode}
                  onChangeText={setConfirmationCode}
                  placeholder="Verification code"
                  placeholderTextColor={Colors.light.inputPlaceholder}
                  accessibilityHint="Enter the code sent to your email"
                  autoCapitalize="none"
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  maxLength={8}
                  returnKeyType="done"
                  onFocus={() => keepInputAboveKeyboard(confirmationCodeRef)}
                  onBlur={() => handleFieldBlur('confirmationCode')}
                  onSubmitEditing={handleConfirmCode}
                  className="mb-4 rounded-xl border border-line bg-surface px-4 py-3 text-body text-ink"
                />
                <FormFieldError message={fieldErrors.confirmationCode} />
              </>
            ) : mode === 'signUp' ? (
              <>
                <AuthInput
                  inputRef={firstNameRef}
                  value={firstName}
                  onChangeText={(value) => {
                    setFirstName(limitText(value, textLimits.firstName));
                    clearFieldError('firstName');
                  }}
                  maxLength={textLimits.firstName}
                  placeholder="First name"
                  placeholderTextColor={Colors.light.inputPlaceholder}
                  autoCapitalize="words"
                  textContentType="givenName"
                  autoComplete="given-name"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onFocus={() => keepInputAboveKeyboard(firstNameRef)}
                  onBlur={() => handleFieldBlur('firstName')}
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                  className="mb-3 rounded-xl border border-line bg-surface px-4 py-3 text-body text-ink"
                />
                <FormFieldError message={fieldErrors.firstName} />
                <AuthInput
                  inputRef={lastNameRef}
                  value={lastName}
                  onChangeText={(value) => {
                    setLastName(limitText(value, textLimits.lastName));
                    clearFieldError('lastName');
                  }}
                  maxLength={textLimits.lastName}
                  placeholder="Last name"
                  placeholderTextColor={Colors.light.inputPlaceholder}
                  autoCapitalize="words"
                  textContentType="familyName"
                  autoComplete="family-name"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onFocus={() => keepInputAboveKeyboard(lastNameRef)}
                  onBlur={() => handleFieldBlur('lastName')}
                  onSubmitEditing={() => emailRef.current?.focus()}
                  className="mb-3 rounded-xl border border-line bg-surface px-4 py-3 text-body text-ink"
                />
                <FormFieldError message={fieldErrors.lastName} />
                <Text className="mb-2 text-footnote font-inter-semibold text-ink">City</Text>
                <View className="mb-4">
                  <CitySelector
                    value={cityId}
                    onChange={(nextCityId) => {
                      Keyboard.dismiss();
                      setCityId(nextCityId);
                      setSelectedUniversityId('');
                      setStudentEmail('');
                    }}
                  />
                </View>

                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isStudent }}
                  accessibilityLabel="I am a student"
                  onPress={() => {
                    Keyboard.dismiss();
                    setIsStudent((current) => {
                      const next = !current;
                      if (!next) {
                        setSelectedUniversityId('');
                        setStudentEmail('');
                      }
                      return next;
                    });
                  }}
                  className={`mb-4 flex-row items-center gap-3 rounded-xl border p-4 active:opacity-85 ${
                    isStudent ? 'border-primary bg-primary/10' : 'border-line bg-white'
                  }`}
                >
                  <View
                    className={`h-7 w-7 items-center justify-center rounded-full ${
                      isStudent ? 'bg-primary' : 'bg-subtle'
                    }`}
                  >
                    {isStudent ? (
                      <Check size={16} color="white" strokeWidth={2.7} />
                    ) : (
                      <GraduationCap size={15} color={Colors.light.textSecondary} strokeWidth={2.4} />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-body font-inter-semibold text-ink">I am a student</Text>
                    <Text className="mt-0.5 text-caption leading-4 text-muted">
                      Optional. Add a university only if you want to join its campus ranking.
                    </Text>
                  </View>
                </Pressable>

                {isStudent && (
                  <View className="mb-4 rounded-2xl border border-line bg-primary/5 p-4">
                    <Text className="mb-3 text-footnote font-inter-semibold text-ink">
                      University ranking (optional)
                    </Text>
                    <Text className="mb-3 text-caption leading-4 text-muted">
                      You can use CultureQuest without a university. Choose one only to add your XP
                      to its ranking.
                    </Text>
                    <View className="mb-3 gap-2">
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ checked: !selectedUniversityId }}
                        accessibilityLabel="No university affiliation"
                        onPress={() => {
                          Keyboard.dismiss();
                          setSelectedUniversityId('');
                          setStudentEmail('');
                          clearFieldError('studentEmail');
                        }}
                        className={`rounded-xl border px-3 py-2.5 active:opacity-85 ${
                          !selectedUniversityId ? 'border-primary bg-white' : 'border-line bg-white/70'
                        }`}
                      >
                        <Text
                          className={`text-footnote font-inter-semibold ${
                            !selectedUniversityId ? 'text-primary' : 'text-ink'
                          }`}
                        >
                          No university affiliation
                        </Text>
                        <Text className="mt-0.5 text-caption leading-4 text-muted">
                          Continue as a student without joining a ranking.
                        </Text>
                      </Pressable>
                      {cityUniversities.map((university) => {
                        const active = selectedUniversityId === university.id;

                        return (
                          <Pressable
                            key={university.id}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: active }}
                            accessibilityLabel={`University: ${university.name}`}
                            onPress={() => {
                              Keyboard.dismiss();
                              setSelectedUniversityId(university.id);
                              clearFieldError('studentEmail');
                            }}
                            className={`rounded-xl border px-3 py-2.5 active:opacity-85 ${
                              active ? 'border-primary bg-white' : 'border-line bg-white/70'
                            }`}
                          >
                            <Text
                              className={`text-footnote font-inter-semibold ${
                                active ? 'text-primary' : 'text-ink'
                              }`}
                            >
                              {university.shortName}
                            </Text>
                            <Text className="mt-0.5 text-caption leading-4 text-muted">
                              {university.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {selectedUniversityId && (
                      <>
                        <AuthInput
                          inputRef={studentEmailRef}
                          value={studentEmail}
                          onChangeText={(value) => {
                            setStudentEmail(limitText(value, textLimits.email));
                            clearFieldError('studentEmail');
                          }}
                          maxLength={textLimits.email}
                          placeholder="Student email"
                          placeholderTextColor={Colors.light.inputPlaceholder}
                          autoCapitalize="none"
                          keyboardType="email-address"
                          textContentType="emailAddress"
                          autoComplete="email"
                          returnKeyType="next"
                          blurOnSubmit={false}
                          onFocus={() => keepInputAboveKeyboard(studentEmailRef)}
                          onBlur={() => handleFieldBlur('studentEmail')}
                          onSubmitEditing={() => emailRef.current?.focus()}
                          className="mb-2 rounded-xl border border-line bg-surface px-4 py-3 text-body text-ink"
                        />
                        <FormFieldError message={fieldErrors.studentEmail} />
                        <Text className="text-caption leading-4 text-muted">
                          Use your university email to join the ranking. Verification will be enabled
                          after CultureQuest has a domain and sending setup.
                        </Text>
                      </>
                    )}
                  </View>
                )}

                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: applyAsOrganizer }}
                  accessibilityLabel="Apply as an organizer"
                  onPress={() => {
                    Keyboard.dismiss();
                    setApplyAsOrganizer((current) => !current);
                  }}
                  className={`mb-4 flex-row items-center gap-3 rounded-xl border p-4 active:opacity-85 ${
                    applyAsOrganizer ? 'border-primary bg-primary/10' : 'border-line bg-white'
                  }`}
                >
                  <View
                    className={`h-7 w-7 items-center justify-center rounded-full ${
                      applyAsOrganizer ? 'bg-primary' : 'bg-subtle'
                    }`}
                  >
                    {applyAsOrganizer ? (
                      <Check size={16} color="white" strokeWidth={2.7} />
                    ) : (
                      <Building2 size={15} color={Colors.light.textSecondary} strokeWidth={2.4} />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-body font-inter-semibold text-ink">Apply as an organizer</Text>
                    <Text className="mt-0.5 text-caption leading-4 text-muted">
                      For institutions, cafes, student groups, and city partners. Approval is
                      required.
                    </Text>
                  </View>
                </Pressable>

                {applyAsOrganizer && (
                  <View className="mb-4 rounded-2xl border border-line bg-primary/5 p-4">
                    <Text className="mb-3 text-footnote font-inter-semibold text-ink">
                      Organizer application
                    </Text>
                    <AuthInput
                      inputRef={institutionNameRef}
                      value={institutionName}
                      onChangeText={(value) => {
                        setInstitutionName(limitText(value, textLimits.organizerInstitutionName));
                        clearFieldError('institutionName');
                      }}
                      maxLength={textLimits.organizerInstitutionName}
                      placeholder="Institution or business name"
                      placeholderTextColor={Colors.light.inputPlaceholder}
                      autoCapitalize="words"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onFocus={() => keepInputAboveKeyboard(institutionNameRef)}
                      onBlur={() => handleFieldBlur('institutionName')}
                      onSubmitEditing={() => websiteUrlRef.current?.focus()}
                      className="mb-3 rounded-xl border border-line bg-surface px-4 py-3 text-body text-ink"
                    />
                    <FormFieldError message={fieldErrors.institutionName} />
                    <Text className="mb-2 text-caption font-inter-semibold text-ink">Type</Text>
                    <View className="mb-3 gap-2">
                      {organizerTypes.map((type) => {
                        const active = institutionType === type.key;

                        return (
                          <Pressable
                            key={type.key}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: active }}
                            accessibilityLabel={`Organizer type: ${type.label}`}
                            onPress={() => {
                              Keyboard.dismiss();
                              setInstitutionType(type.key);
                            }}
                            className={`rounded-xl border px-3 py-2 active:opacity-85 ${
                              active ? 'border-primary bg-white' : 'border-line bg-white/70'
                            }`}
                          >
                            <Text
                              className={`text-footnote font-inter-semibold ${
                                active ? 'text-primary' : 'text-muted'
                              }`}
                            >
                              {type.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <AuthInput
                      inputRef={websiteUrlRef}
                      value={websiteUrl}
                      onChangeText={(value) =>
                        setWebsiteUrl(limitText(value, textLimits.websiteUrl))
                      }
                      maxLength={textLimits.websiteUrl}
                      placeholder="Website or social link"
                      placeholderTextColor={Colors.light.inputPlaceholder}
                      autoCapitalize="none"
                      keyboardType="url"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onFocus={() => keepInputAboveKeyboard(websiteUrlRef)}
                      onSubmitEditing={() => contactRoleRef.current?.focus()}
                      className="mb-3 rounded-xl border border-line bg-surface px-4 py-3 text-body text-ink"
                    />
                    <AuthInput
                      inputRef={contactRoleRef}
                      value={contactRole}
                      onChangeText={(value) =>
                        setContactRole(limitText(value, textLimits.organizerRole))
                      }
                      maxLength={textLimits.organizerRole}
                      placeholder="Your role, e.g. event manager"
                      placeholderTextColor={Colors.light.inputPlaceholder}
                      autoCapitalize="sentences"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onFocus={() => keepInputAboveKeyboard(contactRoleRef)}
                      onSubmitEditing={() => organizerNoteRef.current?.focus()}
                      className="mb-3 rounded-xl border border-line bg-surface px-4 py-3 text-body text-ink"
                    />
                    <AuthInput
                      inputRef={organizerNoteRef}
                      value={organizerNote}
                      onChangeText={(value) =>
                        setOrganizerNote(limitText(value, textLimits.organizerNote))
                      }
                      maxLength={textLimits.organizerNote}
                      placeholder="Short note for CultureQuest admin"
                      placeholderTextColor={Colors.light.inputPlaceholder}
                      multiline
                      textAlignVertical="top"
                      onFocus={() => keepInputAboveKeyboard(organizerNoteRef)}
                      className="min-h-[86px] rounded-xl border border-line bg-surface px-4 py-3 text-body text-ink"
                    />
                    <Text className="mt-1 text-right text-caption text-muted">
                      {organizerNote.length}/{textLimits.organizerNote}
                    </Text>
                  </View>
                )}
              </>
            ) : null}

            {mode !== 'confirmSignUp' && (
              <AuthInput
                inputRef={emailRef}
                testID="auth.email"
                value={email}
                onChangeText={(value) => {
                  setEmail(limitText(value, textLimits.email));
                  clearFieldError('email');
                }}
                maxLength={textLimits.email}
                placeholder="Email"
                placeholderTextColor={Colors.light.inputPlaceholder}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="next"
                blurOnSubmit={false}
                onFocus={() => keepInputAboveKeyboard(emailRef)}
                onBlur={() => handleFieldBlur('email')}
                onSubmitEditing={() => passwordRef.current?.focus()}
                className="mb-3 rounded-xl border border-line bg-surface px-4 py-3 text-body text-ink"
              />
            )}
            {mode !== 'confirmSignUp' && <FormFieldError message={fieldErrors.email} />}

            {mode !== 'confirmSignUp' && (
              <View className="relative">
                <AuthInput
                  inputRef={passwordRef}
                  testID="auth.password"
                  value={password}
                  onChangeText={(value) => {
                    setPassword(limitText(value, textLimits.password));
                    clearFieldError('password');
                  }}
                  maxLength={textLimits.password}
                  placeholder="Password"
                  placeholderTextColor={Colors.light.inputPlaceholder}
                  secureTextEntry={!passwordVisible}
                  textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
                  autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                  returnKeyType="done"
                  onFocus={() => keepInputAboveKeyboard(passwordRef)}
                  onBlur={() => handleFieldBlur('password')}
                  onSubmitEditing={handleSubmit}
                  className="mb-4 rounded-xl border border-line bg-surface px-4 py-3 pr-14 text-body text-ink"
                />
                <Pressable
                  accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
                  className="absolute right-1 top-[26px] h-11 w-11 items-center justify-center active:opacity-70"
                  onPress={() => setPasswordVisible((visible) => !visible)}
                >
                  {passwordVisible ? <EyeOff size={19} color={Colors.light.textSecondary} /> : <Eye size={19} color={Colors.light.textSecondary} />}
                </Pressable>
              </View>
            )}
            {mode !== 'confirmSignUp' && <FormFieldError message={fieldErrors.password} />}

            {error && <Text className="mb-4 text-footnote text-destructive">{error}</Text>}
            {notice && <Text className="mb-4 text-footnote text-primary">{notice}</Text>}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: loading, disabled: loading }}
              testID="auth.submit"
              onPress={mode === 'confirmSignUp' ? handleConfirmCode : handleSubmit}
              disabled={loading}
              className="mb-4 h-[52px] items-center justify-center rounded-xl bg-action active:opacity-80"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-headline font-inter-semibold text-white">
                  {mode === 'signIn'
                    ? 'Log in'
                    : mode === 'signUp'
                      ? 'Create account'
                      : 'Confirm email'}
                </Text>
              )}
            </Pressable>

            {mode === 'confirmSignUp' && (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: loading }}
                onPress={handleResendCode}
                disabled={loading}
                className="mb-4"
              >
                <Text className="text-center text-body font-inter-medium text-primary">
                  Resend confirmation code
                </Text>
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              testID="auth.toggle-mode"
              onPress={() => {
                setError(null);
                setFieldErrors({});
                setNotice(null);
                setMode(mode === 'signIn' ? 'signUp' : 'signIn');
              }}
            >
              <Text className="text-center text-body font-inter-medium text-primary">
                {mode === 'signIn' ? "Don't have an account? Sign up" : 'Back to log in'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
});
