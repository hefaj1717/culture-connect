import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import '@/global.css';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { SwipeTabNavigation } from '@/components/swipe-tab-navigation';
import { AuthProvider } from '@/providers/auth-provider';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={DefaultTheme}>
        <AuthProvider>
          <AnimatedSplashOverlay />
          <SwipeTabNavigation>
            <AppTabs />
          </SwipeTabNavigation>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
