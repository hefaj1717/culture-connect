import { DefaultTheme, ThemeProvider } from 'expo-router';
import '@/global.css';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts as useInterFonts,
} from '@expo-google-fonts/inter';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_800ExtraBold,
  PlayfairDisplay_900Black,
  useFonts as usePlayfairFonts,
} from '@expo-google-fonts/playfair-display';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AppTabs from '@/components/app-tabs';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { NetworkProvider } from '@/providers/network-provider';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const [interLoaded] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  const [playfairLoaded] = usePlayfairFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_800ExtraBold,
    PlayfairDisplay_900Black,
  });
  const fontsLoaded = interLoaded && playfairLoaded;

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={DefaultTheme}>
        <NetworkProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </NetworkProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function AppContent() {
  const { loading } = useAuth();

  useEffect(() => {
    // Keep the native CultureQuest splash visible until the stored session has
    // resolved. This prevents the old React loading view from flashing between
    // the native splash and the first real screen.
    if (!loading) {
      void SplashScreen.hideAsync();
    }
  }, [loading]);

  return <AppTabs />;
}
