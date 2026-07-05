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
} from 'react-native';

import { useAuth } from '@/providers/auth-provider';

type AuthScreenProps = {
  onCancel?: () => void;
};

export function AuthScreen({ onCancel }: AuthScreenProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setNotice(null);

    const normalizedEmail = email.trim();
    const normalizedUsername = username.trim();

    if (!normalizedEmail || !password || (mode === 'signUp' && !normalizedUsername)) {
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
        : await signUp(normalizedEmail, password, normalizedUsername);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (mode === 'signUp') {
      setNotice('Account created. If email confirmation is enabled, check your inbox.');
    }
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
        <Pressable onPress={Keyboard.dismiss} className="flex-1 justify-center">
          {onCancel && (
            <Pressable onPress={onCancel} className="absolute right-0 top-0 rounded-full px-3 py-2">
              <Text className="text-[14px] font-semibold text-primary">Cancel</Text>
            </Pressable>
          )}

          <Text className="mb-1 text-[28px] font-extrabold text-black">CultureQuest</Text>
          <Text className="mb-8 text-[15px] text-muted">
            {mode === 'signIn' ? 'Log in to continue' : 'Create an account to start exploring'}
          </Text>

          {mode === 'signUp' && (
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              placeholderTextColor="#8B909A"
              autoCapitalize="none"
              returnKeyType="next"
              className="mb-3 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-black"
            />
          )}

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

          {error && <Text className="mb-4 text-[13px] text-destructive">{error}</Text>}
          {notice && <Text className="mb-4 text-[13px] text-success">{notice}</Text>}

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            className="mb-4 h-[52px] items-center justify-center rounded-xl bg-primary active:opacity-80"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-[16px] font-semibold text-white">
                {mode === 'signIn' ? 'Log in' : 'Create account'}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setError(null);
              setNotice(null);
              setMode(mode === 'signIn' ? 'signUp' : 'signIn');
            }}
          >
            <Text className="text-center text-[14px] font-medium text-primary">
              {mode === 'signIn'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Log in'}
            </Text>
          </Pressable>

          {onCancel && (
            <Pressable onPress={onCancel} className="mt-6">
              <Text className="text-center text-[14px] font-medium text-muted">
                Continue without logging in
              </Text>
            </Pressable>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
