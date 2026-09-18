import { useEffect, useRef, useState } from 'react';
import { Building2, Check, GraduationCap } from 'lucide-react-native';
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
  Text,
  TextInput,
  View,
} from 'react-native';

import { BrandImage } from '@/components/brand-image';
import { CitySelector } from '@/components/city-selector';
import { FormFieldError } from '@/components/form-field-error';
import { limitText, textLimits } from '@/constants/text-limits';
import { type CityId, defaultCityId } from '@/data/culture';
import { getUniversitiesForCity } from '@/data/universities';
import {
  type AuthFieldErrors,
  type AuthValidationInput,
  validateAuthField,
  validateAuthForm,
} from '@/lib/auth-validation';
import { OFFLINE_ERROR_MESSAGE } from '@/lib/network-errors';
import { useAuth } from '@/providers/auth-provider';
import { useNetworkStatus } from '@/providers/network-provider';

const organizerTypes = [
  { key: 'cultural_institution', label: 'Cultural institution' },
  { key: 'cafe_or_business', label: 'Cafe / business' },
  { key: 'student_organization', label: 'Student organization' },
  { key: 'city_partner', label: 'City partner' },
];

type AuthInputProps = TextInputProps & {
  inputClassName?: string;
  inputRef?: ((node: TextInput | null) => void) | { current: TextInput | null };
  className?: string;
};

function AuthInput({ inputRef, inputClassName, className, ...props }: AuthInputProps) {
  const internalRef = useRef<TextInput>(null);

  function focusInput() {
    internalRef.current?.focus();
  }

  return (
    <Pressable accessible={false} onPress={focusInput}>
      <TextInput
        ref={(node) => {
          internalRef.current = node;
          if (typeof inputRef === 'function') {
            inputRef(node);
          } else if (inputRef) {
            inputRef.current = node;
          }
        }}
        accessibilityLabel={props.accessibilityLabel ?? props.placeholder}
        {...props}
        className={
          inputClassName ??
          className ??
          'min-h-[48px] rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink'
        }
      />
    </Pressable>
  );
}

export function AuthScreen() {
  const { authError, clearAuthError, signIn, signUp, verifySignUpCode, resendSignUpCode } = useAuth();
  const { isOffline } = useNetworkStatus();
  const scrollViewRef = useRef<ScrollView>(null);
  const confirmationCodeRef = useRef<TextInput>(null);
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const institutionNameRef = useRef<TextInput>(null);
  const websiteUrlRef = useRef<TextInput>(null);
  const contactRoleRef = useRef<TextInput>(null);
  const organizerNoteRef = useRef<TextInput>(null);
  const studentEmailRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [mode, setMode] = useState<'signIn' | 'signUp' | 'confirmSignUp'>('signIn');
  const [email, setEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [password, setPassword] = useState('');
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

  function keepInputAboveKeyboard(inputRef: React.RefObject<TextInput | null>) {
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

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (mode === 'signUp') {
        firstNameRef.current?.focus();
        return;
      }

      if (mode === 'confirmSignUp') {
        confirmationCodeRef.current?.focus();
        return;
      }

      emailRef.current?.focus();
    }, 280);

    return () => clearTimeout(timeout);
  }, [mode]);

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
      const result = await signIn(normalizedEmail, password);
      setLoading(false);

      if (result.error) {
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
      className="flex-1 bg-white"
    >
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 44 }}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        scrollIndicatorInsets={{ bottom: 44 }}
      >
        <View className="flex-1 bg-white">
          <BrandImage
            source={require('@/assets/images/culture/hero-culture.jpg')}
            withTextGradient
            className="h-[268px] bg-ink"
            style={styles.hero}
          >
            <View className="absolute inset-x-0 bottom-0 px-6 pb-8">
              <Text className="font-heading text-[38px] leading-[43px] text-white">
                CultureQuest
              </Text>
              <Text className="mt-3 max-w-[300px] font-body text-[15px] leading-6 text-white/85">
                Discover the city, earn XP, and unlock student rewards.
              </Text>
            </View>
          </BrandImage>

          <View className="-mt-5 flex-1 rounded-t-[28px] bg-white px-6 pb-8 pt-7">
            <Text className="mb-6 font-ui text-[17px] text-ink">
              {mode === 'signIn'
                ? 'Log in to continue'
                : mode === 'signUp'
                  ? 'Create an account to start exploring'
                  : 'Verify your email'}
            </Text>

            {mode === 'confirmSignUp' ? (
              <>
                <Text className="mb-4 text-[14px] leading-5 text-muted">
                  We sent a confirmation email to {pendingEmail || email}. Enter the verification
                  code if your email shows one, or use the confirmation link.
                </Text>
                <AuthInput
                  inputRef={confirmationCodeRef}
                  value={confirmationCode}
                  onChangeText={setConfirmationCode}
                  placeholder="Verification code"
                  placeholderTextColor="#8B909A"
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
                  className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
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
                  placeholderTextColor="#8B909A"
                  autoCapitalize="words"
                  textContentType="givenName"
                  autoComplete="given-name"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onFocus={() => keepInputAboveKeyboard(firstNameRef)}
                  onBlur={() => handleFieldBlur('firstName')}
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                  className="mb-3 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
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
                  placeholderTextColor="#8B909A"
                  autoCapitalize="words"
                  textContentType="familyName"
                  autoComplete="family-name"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onFocus={() => keepInputAboveKeyboard(lastNameRef)}
                  onBlur={() => handleFieldBlur('lastName')}
                  onSubmitEditing={() => emailRef.current?.focus()}
                  className="mb-3 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
                />
                <FormFieldError message={fieldErrors.lastName} />
                <Text className="mb-2 text-[13px] font-semibold text-ink">City</Text>
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
                    isStudent ? 'border-primary bg-primary/10' : 'border-gray-300 bg-white'
                  }`}
                >
                  <View
                    className={`h-7 w-7 items-center justify-center rounded-full ${
                      isStudent ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  >
                    {isStudent ? (
                      <Check size={16} color="white" strokeWidth={2.7} />
                    ) : (
                      <GraduationCap size={15} color="#6B818C" strokeWidth={2.4} />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] font-bold text-ink">I am a student</Text>
                    <Text className="mt-0.5 text-[12px] leading-4 text-muted">
                      Optional. Add a university only if you want to join its campus ranking.
                    </Text>
                  </View>
                </Pressable>

                {isStudent && (
                  <View className="mb-4 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                    <Text className="mb-3 text-[13px] font-semibold text-ink">
                      University ranking (optional)
                    </Text>
                    <Text className="mb-3 text-[12px] leading-4 text-muted">
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
                          !selectedUniversityId ? 'border-primary bg-white' : 'border-gray-200 bg-white/70'
                        }`}
                      >
                        <Text
                          className={`text-[13px] font-semibold ${
                            !selectedUniversityId ? 'text-primary' : 'text-ink'
                          }`}
                        >
                          No university affiliation
                        </Text>
                        <Text className="mt-0.5 text-[11px] leading-4 text-muted">
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
                              active ? 'border-primary bg-white' : 'border-gray-200 bg-white/70'
                            }`}
                          >
                            <Text
                              className={`text-[13px] font-semibold ${
                                active ? 'text-primary' : 'text-ink'
                              }`}
                            >
                              {university.shortName}
                            </Text>
                            <Text className="mt-0.5 text-[11px] leading-4 text-muted">
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
                          placeholderTextColor="#8B909A"
                          autoCapitalize="none"
                          keyboardType="email-address"
                          textContentType="emailAddress"
                          autoComplete="email"
                          returnKeyType="next"
                          blurOnSubmit={false}
                          onFocus={() => keepInputAboveKeyboard(studentEmailRef)}
                          onBlur={() => handleFieldBlur('studentEmail')}
                          onSubmitEditing={() => emailRef.current?.focus()}
                          className="mb-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-[15px] text-ink"
                        />
                        <FormFieldError message={fieldErrors.studentEmail} />
                        <Text className="text-[11px] leading-4 text-muted">
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
                    applyAsOrganizer ? 'border-primary bg-primary/10' : 'border-gray-300 bg-white'
                  }`}
                >
                  <View
                    className={`h-7 w-7 items-center justify-center rounded-full ${
                      applyAsOrganizer ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  >
                    {applyAsOrganizer ? (
                      <Check size={16} color="white" strokeWidth={2.7} />
                    ) : (
                      <Building2 size={15} color="#6B818C" strokeWidth={2.4} />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] font-bold text-ink">Apply as an organizer</Text>
                    <Text className="mt-0.5 text-[12px] leading-4 text-muted">
                      For institutions, cafes, student groups, and city partners. Approval is
                      required.
                    </Text>
                  </View>
                </Pressable>

                {applyAsOrganizer && (
                  <View className="mb-4 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                    <Text className="mb-3 text-[13px] font-semibold text-ink">
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
                      placeholderTextColor="#8B909A"
                      autoCapitalize="words"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onFocus={() => keepInputAboveKeyboard(institutionNameRef)}
                      onBlur={() => handleFieldBlur('institutionName')}
                      onSubmitEditing={() => websiteUrlRef.current?.focus()}
                      className="mb-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-[15px] text-ink"
                    />
                    <FormFieldError message={fieldErrors.institutionName} />
                    <Text className="mb-2 text-[12px] font-semibold text-ink">Type</Text>
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
                              active ? 'border-primary bg-white' : 'border-gray-200 bg-white/70'
                            }`}
                          >
                            <Text
                              className={`text-[13px] font-semibold ${
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
                      placeholderTextColor="#8B909A"
                      autoCapitalize="none"
                      keyboardType="url"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onFocus={() => keepInputAboveKeyboard(websiteUrlRef)}
                      onSubmitEditing={() => contactRoleRef.current?.focus()}
                      className="mb-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-[15px] text-ink"
                    />
                    <AuthInput
                      inputRef={contactRoleRef}
                      value={contactRole}
                      onChangeText={(value) =>
                        setContactRole(limitText(value, textLimits.organizerRole))
                      }
                      maxLength={textLimits.organizerRole}
                      placeholder="Your role, e.g. event manager"
                      placeholderTextColor="#8B909A"
                      autoCapitalize="sentences"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onFocus={() => keepInputAboveKeyboard(contactRoleRef)}
                      onSubmitEditing={() => organizerNoteRef.current?.focus()}
                      className="mb-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-[15px] text-ink"
                    />
                    <AuthInput
                      inputRef={organizerNoteRef}
                      value={organizerNote}
                      onChangeText={(value) =>
                        setOrganizerNote(limitText(value, textLimits.organizerNote))
                      }
                      maxLength={textLimits.organizerNote}
                      placeholder="Short note for CultureQuest admin"
                      placeholderTextColor="#8B909A"
                      multiline
                      textAlignVertical="top"
                      onFocus={() => keepInputAboveKeyboard(organizerNoteRef)}
                      className="min-h-[86px] rounded-xl border border-gray-300 bg-white px-4 py-3 text-[15px] text-ink"
                    />
                    <Text className="mt-1 text-right text-[11px] text-muted">
                      {organizerNote.length}/{textLimits.organizerNote}
                    </Text>
                  </View>
                )}
              </>
            ) : null}

            {mode !== 'confirmSignUp' && (
              <AuthInput
                inputRef={emailRef}
                value={email}
                onChangeText={(value) => {
                  setEmail(limitText(value, textLimits.email));
                  clearFieldError('email');
                }}
                maxLength={textLimits.email}
                placeholder="Email"
                placeholderTextColor="#8B909A"
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="next"
                blurOnSubmit={false}
                onFocus={() => keepInputAboveKeyboard(emailRef)}
                onBlur={() => handleFieldBlur('email')}
                onSubmitEditing={() => passwordRef.current?.focus()}
                className="mb-3 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
              />
            )}
            {mode !== 'confirmSignUp' && <FormFieldError message={fieldErrors.email} />}

            {mode !== 'confirmSignUp' && (
              <AuthInput
                inputRef={passwordRef}
                value={password}
                onChangeText={(value) => {
                  setPassword(limitText(value, textLimits.password));
                  clearFieldError('password');
                }}
                maxLength={textLimits.password}
                placeholder="Password"
                placeholderTextColor="#8B909A"
                secureTextEntry
                textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                returnKeyType="done"
                onFocus={() => keepInputAboveKeyboard(passwordRef)}
                onBlur={() => handleFieldBlur('password')}
                onSubmitEditing={handleSubmit}
                className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
              />
            )}
            {mode !== 'confirmSignUp' && <FormFieldError message={fieldErrors.password} />}

            {error && <Text className="mb-4 text-[13px] text-destructive">{error}</Text>}
            {notice && <Text className="mb-4 text-[13px] text-primary">{notice}</Text>}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: loading, disabled: loading }}
              onPress={mode === 'confirmSignUp' ? handleConfirmCode : handleSubmit}
              disabled={loading}
              className="mb-4 h-[52px] items-center justify-center rounded-xl bg-primary active:opacity-80"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-[16px] font-semibold text-white">
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
                <Text className="text-center text-[14px] font-medium text-primary">
                  Resend confirmation code
                </Text>
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setError(null);
                setFieldErrors({});
                setNotice(null);
                setMode(mode === 'signIn' ? 'signUp' : 'signIn');
              }}
            >
              <Text className="text-center text-[14px] font-medium text-primary">
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
