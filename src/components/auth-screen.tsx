import { useEffect, useRef, useState } from 'react';
import { Building2, Check } from 'lucide-react-native';
import {
  ActivityIndicator,
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
import { type CityId, defaultCityId } from '@/data/culture';
import { useAuth } from '@/providers/auth-provider';

const organizerTypes = [
  { key: 'cultural_institution', label: 'Cultural institution' },
  { key: 'cafe_or_business', label: 'Cafe / business' },
  { key: 'student_organization', label: 'Student organization' },
  { key: 'city_partner', label: 'City partner' },
];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    <Pressable onPress={focusInput}>
      <TextInput
        ref={(node) => {
          internalRef.current = node;
          if (typeof inputRef === 'function') {
            inputRef(node);
          } else if (inputRef) {
            inputRef.current = node;
          }
        }}
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
  const { signIn, signUp, verifySignUpCode, resendSignUpCode } = useAuth();
  const confirmationCodeRef = useRef<TextInput>(null);
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const institutionNameRef = useRef<TextInput>(null);
  const websiteUrlRef = useRef<TextInput>(null);
  const contactRoleRef = useRef<TextInput>(null);
  const organizerNoteRef = useRef<TextInput>(null);
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
  const [applyAsOrganizer, setApplyAsOrganizer] = useState(false);
  const [institutionName, setInstitutionName] = useState('');
  const [institutionType, setInstitutionType] = useState(organizerTypes[0].key);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [organizerNote, setOrganizerNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    setError(null);
    setNotice(null);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();

    if (
      !normalizedEmail ||
      !password ||
      (mode === 'signUp' && (!normalizedFirstName || !normalizedLastName))
    ) {
      setError('Please fill in all fields.');
      return;
    }

    if (!emailPattern.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (mode === 'signUp' && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (mode === 'signUp' && !/[A-Za-z]/.test(password)) {
      setError('Password must include at least one letter.');
      return;
    }

    if (mode === 'signUp' && !/[0-9]/.test(password)) {
      setError('Password must include at least one number.');
      return;
    }

    if (mode === 'signUp' && applyAsOrganizer && !institutionName.trim()) {
      setError('Please enter the institution or business name.');
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
            institutionName: institutionName.trim(),
            institutionType,
            websiteUrl: websiteUrl.trim(),
            contactRole: contactRole.trim(),
            note: organizerNote.trim(),
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
      setNotice('Check your inbox. Confirm your email with the link, or enter the code here.');
      return;
    }

    setNotice(
      applyAsOrganizer
        ? 'Account created. Your organizer application is pending review.'
        : 'Account created. You are now logged in.',
    );
  }

  async function handleConfirmCode() {
    setError(null);
    setNotice(null);

    const normalizedEmail = (pendingEmail || email).trim();
    const normalizedCode = confirmationCode.trim();

    if (!normalizedEmail || !normalizedCode) {
      setError('Please enter the confirmation code from your email, or tap the email link.');
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

    setLoading(true);
    const result = await resendSignUpCode(normalizedEmail);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setNotice('A new confirmation code was sent.');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="always"
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
                  We sent a confirmation email to {pendingEmail || email}. Tap the link in that
                  email, or enter the confirmation code if one is shown.
                </Text>
                <AuthInput
                  inputRef={confirmationCodeRef}
                  value={confirmationCode}
                  onChangeText={setConfirmationCode}
                  placeholder="Confirmation code"
                  placeholderTextColor="#8B909A"
                  autoCapitalize="none"
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  returnKeyType="done"
                  onSubmitEditing={handleConfirmCode}
                  className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
                />
              </>
            ) : mode === 'signUp' ? (
              <>
                <AuthInput
                  inputRef={firstNameRef}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor="#8B909A"
                  autoCapitalize="words"
                  textContentType="givenName"
                  autoComplete="given-name"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                  className="mb-3 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
                />
                <AuthInput
                  inputRef={lastNameRef}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor="#8B909A"
                  autoCapitalize="words"
                  textContentType="familyName"
                  autoComplete="family-name"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => emailRef.current?.focus()}
                  className="mb-3 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
                />
                <Text className="mb-2 text-[13px] font-semibold text-ink">City</Text>
                <View className="mb-4">
                  <CitySelector value={cityId} onChange={setCityId} />
                </View>

                <Pressable
                  onPress={() => setApplyAsOrganizer((current) => !current)}
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
                      <Building2 size={15} color="#756F7B" strokeWidth={2.4} />
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
                      onChangeText={setInstitutionName}
                      placeholder="Institution or business name"
                      placeholderTextColor="#8B909A"
                      autoCapitalize="words"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => websiteUrlRef.current?.focus()}
                      className="mb-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-[15px] text-ink"
                    />
                    <Text className="mb-2 text-[12px] font-semibold text-ink">Type</Text>
                    <View className="mb-3 gap-2">
                      {organizerTypes.map((type) => {
                        const active = institutionType === type.key;

                        return (
                          <Pressable
                            key={type.key}
                            onPress={() => setInstitutionType(type.key)}
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
                      onChangeText={setWebsiteUrl}
                      placeholder="Website or social link"
                      placeholderTextColor="#8B909A"
                      autoCapitalize="none"
                      keyboardType="url"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => contactRoleRef.current?.focus()}
                      className="mb-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-[15px] text-ink"
                    />
                    <AuthInput
                      inputRef={contactRoleRef}
                      value={contactRole}
                      onChangeText={setContactRole}
                      placeholder="Your role, e.g. event manager"
                      placeholderTextColor="#8B909A"
                      autoCapitalize="sentences"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => organizerNoteRef.current?.focus()}
                      className="mb-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-[15px] text-ink"
                    />
                    <AuthInput
                      inputRef={organizerNoteRef}
                      value={organizerNote}
                      onChangeText={setOrganizerNote}
                      placeholder="Short note for CultureQuest admin"
                      placeholderTextColor="#8B909A"
                      multiline
                      textAlignVertical="top"
                      className="min-h-[86px] rounded-xl border border-gray-300 bg-white px-4 py-3 text-[15px] text-ink"
                    />
                  </View>
                )}
              </>
            ) : null}

            {mode !== 'confirmSignUp' && (
              <AuthInput
                inputRef={emailRef}
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#8B909A"
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
                className="mb-3 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
              />
            )}

            {mode !== 'confirmSignUp' && (
              <AuthInput
                inputRef={passwordRef}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#8B909A"
                secureTextEntry
                textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
              />
            )}

            {error && <Text className="mb-4 text-[13px] text-destructive">{error}</Text>}
            {notice && <Text className="mb-4 text-[13px] text-primary">{notice}</Text>}

            <Pressable
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
              <Pressable onPress={handleResendCode} disabled={loading} className="mb-4">
                <Text className="text-center text-[14px] font-medium text-primary">
                  Resend confirmation code
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => {
                setError(null);
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
