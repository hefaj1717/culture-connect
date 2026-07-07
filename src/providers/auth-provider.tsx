import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { type CityId, defaultCityId } from '@/data/culture';
import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    cityId: CityId,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  verifySignUpCode: (email: string, token: string) => Promise<{ error: string | null }>;
  resendSignUpCode: (email: string) => Promise<{ error: string | null }>;
  updateProfile: (profile: {
    firstName: string;
    lastName: string;
    cityId: CityId;
    avatarUrl?: string | null;
  }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getUrlParam(url: string, key: string) {
  const match = url.match(new RegExp(`[?#&]${key}=([^&#]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function handleAuthUrl(url: string | null) {
      if (!url) return;

      const code = getUrlParam(url, 'code');
      const accessToken = getUrlParam(url, 'access_token');
      const refreshToken = getUrlParam(url, 'refresh_token');

      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        return;
      }

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    Linking.getInitialURL().then(handleAuthUrl);
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      handleAuthUrl(url);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      linkingSubscription.remove();
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    cityId: CityId,
  ) {
    const fullName = `${firstName} ${lastName}`.trim();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          city_id: cityId,
        },
      },
    });
    return {
      error: error?.message ?? null,
      needsConfirmation: !data.session,
    };
  }

  async function verifySignUpCode(email: string, token: string) {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });
    return { error: error?.message ?? null };
  }

  async function resendSignUpCode(email: string) {
    const { error } = await supabase.auth.resend({
      email,
      type: 'signup',
    });
    return { error: error?.message ?? null };
  }

  async function updateProfile({
    firstName,
    lastName,
    cityId,
    avatarUrl,
  }: {
    firstName: string;
    lastName: string;
    cityId: CityId;
    avatarUrl?: string | null;
  }) {
    if (!session?.user.id) {
      return { error: 'You must be logged in to update your profile.' };
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const { error } = await supabase.auth.updateUser({
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        city_id: cityId || defaultCityId,
        avatar_url: avatarUrl ?? null,
      },
    });
    if (error) {
      return { error: error.message };
    }

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: session.user.id,
        username: fullName,
        avatar_url: avatarUrl ?? null,
      },
      { onConflict: 'id' },
    );

    return { error: profileError?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signIn,
        signUp,
        verifySignUpCode,
        resendSignUpCode,
        updateProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
