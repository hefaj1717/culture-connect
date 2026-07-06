import { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/providers/auth-provider';

type AuthScreenProps = {
  onCancel?: () => void;
};

export function AuthScreen({ onCancel }: AuthScreenProps) {
  const { signIn, signUp, verifySignUpCode, resendSignUpCode } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp' | 'confirmSignUp'>('signIn');
  const [email, setEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setNotice(null);

    const normalizedEmail = email.trim();
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

    if (mode === 'signUp' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    const result =
      mode === 'signIn'
        ? await signIn(normalizedEmail, password)
        : await signUp(normalizedEmail, password, normalizedFirstName, normalizedLastName);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (mode === 'signUp') {
      setPendingEmail(normalizedEmail);
      setMode('confirmSignUp');
      setNotice('Check your inbox and enter the confirmation code.');
    }
  }

  async function handleConfirmCode() {
    setError(null);
    setNotice(null);

    const normalizedEmail = (pendingEmail || email).trim();
    const normalizedCode = confirmationCode.trim();

    if (!normalizedEmail || !normalizedCode) {
      setError('Please enter the confirmation code from your email.');
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
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center">
          {onCancel && (
            <Pressable onPress={onCancel} className="absolute right-0 top-0 rounded-full px-3 py-2">
              <Text className="text-[14px] font-semibold text-primary">Cancel</Text>
            </Pressable>
          )}

          <Text className="mb-1 text-[28px] font-extrabold text-black">CultureQuest</Text>
          <Text className="mb-8 text-[15px] text-muted">
            {mode === 'signIn'
              ? 'Log in to continue'
              : mode === 'signUp'
                ? 'Create an account to start exploring'
                : 'Enter the code from your email'}
          </Text>

          {mode === 'confirmSignUp' ? (
            <>
              <TextInput
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
                className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-black"
              />
            </>
          ) : mode === 'signUp' ? (
            <>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor="#8B909A"
                autoCapitalize="words"
                textContentType="givenName"
                autoComplete="given-name"
                returnKeyType="next"
                className="mb-3 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-black"
              />
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor="#8B909A"
                autoCapitalize="words"
                textContentType="familyName"
                autoComplete="family-name"
                returnKeyType="next"
                className="mb-3 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-black"
              />
            </>
          ) : null}

          {mode !== 'confirmSignUp' && (
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#8B909A"
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="next"
              className="mb-3 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-black"
            />
          )}

          {mode !== 'confirmSignUp' && (
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#8B909A"
              secureTextEntry
              textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-black"
            />
          )}

          {error && <Text className="mb-4 text-[13px] text-destructive">{error}</Text>}
          {notice && <Text className="mb-4 text-[13px] text-success">{notice}</Text>}

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

          {onCancel && (
            <Pressable onPress={onCancel} className="mt-6">
              <Text className="text-center text-[14px] font-medium text-muted">
                Continue without logging in
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
