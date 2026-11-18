import type { Session, User } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { limitText, textLimits } from '@/constants/text-limits';
import { type CityId, defaultCityId } from '@/data/culture';
import { deleteCurrentAccount } from '@/lib/account-deletion';
import { getNetworkAwareErrorMessage, OFFLINE_ERROR_MESSAGE } from '@/lib/network-errors';
import { supabase } from '@/lib/supabase';

export type OrganizerApplicationInput = {
  institutionName: string;
  institutionType: string;
  websiteUrl?: string;
  contactRole?: string;
  note?: string;
};

export type StudentUniversityInput = {
  isStudent: boolean;
  studentEmail?: string;
  universityId?: string;
};

export type OrganizerApplicationStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type AppRole = 'admin' | 'organizer' | 'user' | 'guest';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  roles: AppRole[];
  hasRole: (role: AppRole) => boolean;
  organizerApplicationStatus: OrganizerApplicationStatus;
  refreshOrganizerApplicationStatus: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    cityId: CityId,
    organizerApplication?: OrganizerApplicationInput | null,
    studentUniversity?: StudentUniversityInput | null,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  verifySignUpCode: (email: string, token: string) => Promise<{ error: string | null }>;
  resendSignUpCode: (email: string) => Promise<{ error: string | null }>;
  updateProfile: (profile: {
    cityId: CityId;
    avatarUrl?: string | null;
    firstName: string;
    lastName: string;
    organizerBio?: string;
    organizerLocationAddress?: string | null;
    organizerLocationLatitude?: number | null;
    organizerLocationLongitude?: number | null;
    organizerLocationName?: string | null;
  }) => Promise<{ error: string | null }>;
  deleteAccount: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getUrlParam(url: string, key: string) {
  const match = url.match(new RegExp(`[?#&]${key}=([^&#]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function getExpoGoHostUri() {
  const expoConfigHostUri = Constants.expoConfig?.hostUri;
  const expoGoConfig = Constants.expoGoConfig as { debuggerHost?: string } | null;
  const debuggerHost = expoGoConfig?.debuggerHost;
  const hostUri = expoConfigHostUri ?? debuggerHost;

  return hostUri?.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

function getAuthRedirectUrl() {
  const expoGoHostUri = Constants.appOwnership === 'expo' ? getExpoGoHostUri() : null;

  if (expoGoHostUri) {
    return `exp://${expoGoHostUri}/--/auth/callback`;
  }

  return Linking.createURL('/auth/callback');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [roles, setRoles] = useState<AppRole[]>(['guest']);
  const [organizerApplicationStatus, setOrganizerApplicationStatus] =
    useState<OrganizerApplicationStatus>('none');

  useEffect(() => {
    async function handleAuthUrl(url: string | null) {
      if (!url) return;

      const code = getUrlParam(url, 'code');
      const tokenHash = getUrlParam(url, 'token_hash');
      const type = getUrlParam(url, 'type') ?? 'signup';
      const accessToken = getUrlParam(url, 'access_token');
      const refreshToken = getUrlParam(url, 'refresh_token');

      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });
        setAuthError(error ? getNetworkAwareErrorMessage(error.message) : null);
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        setAuthError(error ? getNetworkAwareErrorMessage(error.message) : null);
        return;
      }

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        setAuthError(error ? getNetworkAwareErrorMessage(error.message) : null);
      }
    }

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        setSession(data.session);
        if (error) {
          setAuthError(getNetworkAwareErrorMessage(error.message));
        }
        setLoading(false);
      })
      .catch(() => {
        setAuthError(OFFLINE_ERROR_MESSAGE);
        setLoading(false);
      });

    Linking.getInitialURL()
      .then(handleAuthUrl)
      .catch(() => {
        setAuthError('Could not finish the sign-in link. Please try again.');
      });
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

  const refreshRoles = useCallback(async () => {
    if (!session?.user.id) {
      setRoles(['guest']);
      return;
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);

    if (error) {
      setRoles(['user']);
      return;
    }

    const nextRoles = data
      .map((row) => row.role)
      .filter(
        (role): role is AppRole =>
          role === 'admin' || role === 'organizer' || role === 'user' || role === 'guest',
      );

    setRoles(nextRoles.length > 0 ? nextRoles : ['user']);
  }, [session?.user.id]);

  const refreshOrganizerApplicationStatus = useCallback(async () => {
    if (!session?.user.id) {
      setOrganizerApplicationStatus('none');
      return;
    }

    const metadataFallback =
      session.user.user_metadata?.requested_role === 'organizer_pending' ? 'pending' : 'none';

    const [applicationResult, roleResult] = await Promise.all([
      supabase
        .from('organizer_applications')
        .select('status')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'organizer')
        .maybeSingle(),
    ]);

    if (roleResult.data?.role === 'organizer') {
      setOrganizerApplicationStatus('approved');
      return;
    }

    const { data, error } = applicationResult;

    if (error) {
      setOrganizerApplicationStatus(metadataFallback);
      return;
    }

    if (data?.status === 'pending' || data?.status === 'approved' || data?.status === 'rejected') {
      setOrganizerApplicationStatus(data.status);
      return;
    }

    setOrganizerApplicationStatus(metadataFallback);
  }, [session?.user.id, session?.user.user_metadata?.requested_role]);

  useEffect(() => {
    if (!session?.user.id) {
      setOrganizerApplicationStatus('none');
      return undefined;
    }

    refreshOrganizerApplicationStatus();
    const refreshInterval = setInterval(refreshOrganizerApplicationStatus, 15000);

    return () => clearInterval(refreshInterval);
  }, [refreshOrganizerApplicationStatus, session?.user.id]);

  useEffect(() => {
    refreshRoles();
  }, [refreshRoles]);

  async function signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      return { error: getNetworkAwareErrorMessage(error?.message, '') || null };
    } catch {
      return { error: OFFLINE_ERROR_MESSAGE };
    }
  }

  async function signUp(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    cityId: CityId,
    organizerApplication?: OrganizerApplicationInput | null,
    studentUniversity?: StudentUniversityInput | null,
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFirstName = limitText(firstName.trim(), textLimits.firstName);
    const normalizedLastName = limitText(lastName.trim(), textLimits.lastName);
    const fullName = `${normalizedFirstName} ${normalizedLastName}`.trim();
    const normalizedOrganizerApplication = organizerApplication
      ? {
          institution_name: limitText(
            organizerApplication.institutionName.trim(),
            textLimits.organizerInstitutionName,
          ),
          institution_type: organizerApplication.institutionType,
          website_url: limitText(
            organizerApplication.websiteUrl?.trim() ?? '',
            textLimits.websiteUrl,
          ),
          contact_role: limitText(
            organizerApplication.contactRole?.trim() ?? '',
            textLimits.organizerRole,
          ),
          note: limitText(organizerApplication.note?.trim() ?? '', textLimits.organizerNote),
        }
      : null;
    const normalizedStudentUniversity = studentUniversity?.isStudent
      ? {
          is_student: true,
          student_email: limitText(
            studentUniversity.studentEmail?.trim().toLowerCase() ?? '',
            textLimits.email,
          ),
          university_id: studentUniversity.universityId?.trim() ?? '',
        }
      : null;
    const normalizedStudentMembership =
      normalizedStudentUniversity?.university_id && normalizedStudentUniversity.student_email
        ? normalizedStudentUniversity
        : null;

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
          data: {
            first_name: normalizedFirstName,
            last_name: normalizedLastName,
            full_name: fullName,
            city_id: cityId,
            requested_role: normalizedOrganizerApplication ? 'organizer_pending' : 'user',
            organizer_application: normalizedOrganizerApplication,
            student_university: normalizedStudentUniversity,
          },
        },
      });

      if (!error && data.session && normalizedStudentMembership) {
        await supabase.rpc('upsert_my_university_membership', {
          _student_email: normalizedStudentMembership.student_email,
          _university_id: normalizedStudentMembership.university_id,
        });
      }

      return {
        error: getNetworkAwareErrorMessage(error?.message, '') || null,
        needsConfirmation: !data.session,
      };
    } catch {
      return { error: OFFLINE_ERROR_MESSAGE, needsConfirmation: false };
    }
  }

  async function verifySignUpCode(email: string, token: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedToken = token.trim();
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: normalizedToken,
        type: 'email',
      });

      if (!error) {
        return { error: null };
      }

      const fallback = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: normalizedToken,
        type: 'signup',
      });

      return { error: getNetworkAwareErrorMessage(fallback.error?.message ?? error.message) };
    } catch {
      return { error: OFFLINE_ERROR_MESSAGE };
    }
  }

  async function resendSignUpCode(email: string) {
    try {
      const { error } = await supabase.auth.resend({
        email: email.trim().toLowerCase(),
        type: 'signup',
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });
      return { error: getNetworkAwareErrorMessage(error?.message, '') || null };
    } catch {
      return { error: OFFLINE_ERROR_MESSAGE };
    }
  }

  async function updateProfile({
    cityId,
    avatarUrl,
    firstName,
    lastName,
    organizerBio = '',
    organizerLocationAddress = null,
    organizerLocationLatitude = null,
    organizerLocationLongitude = null,
    organizerLocationName = null,
  }: {
    cityId: CityId;
    avatarUrl?: string | null;
    firstName: string;
    lastName: string;
    organizerBio?: string;
    organizerLocationAddress?: string | null;
    organizerLocationLatitude?: number | null;
    organizerLocationLongitude?: number | null;
    organizerLocationName?: string | null;
  }) {
    if (!session?.user.id) {
      return { error: 'You must be logged in to update your profile.' };
    }

    const normalizedFirstName = limitText(firstName.trim(), textLimits.firstName);
    const normalizedLastName = limitText(lastName.trim(), textLimits.lastName);
    const normalizedCityId = cityId || defaultCityId;
    const normalizedAvatarUrl = avatarUrl ?? null;
    const normalizedOrganizerBio = limitText(organizerBio.trim(), textLimits.organizerBio);
    const normalizedOrganizerLocationName =
      limitText(organizerLocationName?.trim() ?? '', textLimits.organizerLocationSearch) || null;
    const normalizedOrganizerLocationAddress = organizerLocationAddress?.trim() || null;
    const fullName = `${normalizedFirstName} ${normalizedLastName}`.trim();

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          first_name: normalizedFirstName,
          last_name: normalizedLastName,
          full_name: fullName,
          city_id: normalizedCityId,
          avatar_url: normalizedAvatarUrl,
          organizer_bio: normalizedOrganizerBio,
          organizer_location_address: normalizedOrganizerLocationAddress,
          organizer_location_latitude: organizerLocationLatitude,
          organizer_location_longitude: organizerLocationLongitude,
          organizer_location_name: normalizedOrganizerLocationName,
        },
      });
      if (error) {
        return { error: getNetworkAwareErrorMessage(error.message) };
      }

      if (data.user && session) {
        setSession({
          ...session,
          user: data.user,
        });
      }

      const { data: profileResult, error: profileError } = await supabase.rpc('upsert_my_profile', {
        _avatar_url: normalizedAvatarUrl,
        _city_key: normalizedCityId,
        _first_name: normalizedFirstName,
        _last_name: normalizedLastName,
        _organizer_bio: normalizedOrganizerBio,
        _organizer_location_address: normalizedOrganizerLocationAddress,
        _organizer_location_latitude: organizerLocationLatitude,
        _organizer_location_longitude: organizerLocationLongitude,
        _organizer_location_name: normalizedOrganizerLocationName,
        _username: fullName,
      });

      if (profileError || !profileResult?.success) {
        return {
          error: getProfileSyncError(profileError?.message ?? profileResult?.error),
        };
      }
    } catch {
      return { error: OFFLINE_ERROR_MESSAGE };
    }

    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function deleteAccount() {
    return deleteCurrentAccount();
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        authError,
        clearAuthError: () => setAuthError(null),
        roles,
        hasRole: (role) => roles.includes(role),
        organizerApplicationStatus,
        refreshOrganizerApplicationStatus,
        signIn,
        signUp,
        verifySignUpCode,
        resendSignUpCode,
        updateProfile,
        deleteAccount,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function getProfileSyncError(error?: string | null) {
  if (error === 'not_authenticated') return 'Your session expired. Please sign in again.';
  if (error === 'invalid_location') return 'Choose a valid organizer location and try again.';
  if (error === 'invalid_city') return 'Choose a supported city and try again.';
  if (error === 'invalid_name') return 'Enter your first and last name.';

  return getNetworkAwareErrorMessage(error, 'Your profile could not be saved. Please try again.');
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
