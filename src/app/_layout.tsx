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
  DMSerifDisplay_400Regular,
  useFonts as useDMSerifDisplayFonts,
} from '@expo-google-fonts/dm-serif-display';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Text, TextInput } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AppTabs from '@/components/app-tabs';
import { AuthProvider } from '@/providers/auth-provider';
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
  const [dmSerifDisplayLoaded] = useDMSerifDisplayFonts({
    DMSerifDisplay_400Regular,
  });
  const fontsLoaded = interLoaded && dmSerifDisplayLoaded;

  useEffect(() => {
    if (fontsLoaded) {
      const textComponent = Text as typeof Text & { defaultProps?: { style?: unknown } };
      const textInputComponent = TextInput as typeof TextInput & {
        defaultProps?: { style?: unknown };
      };

      textComponent.defaultProps = textComponent.defaultProps ?? {};
      textComponent.defaultProps.style = [
        { fontFamily: 'Inter_400Regular' },
        textComponent.defaultProps.style,
      ];
      textInputComponent.defaultProps = textInputComponent.defaultProps ?? {};
      textInputComponent.defaultProps.style = [
        { fontFamily: 'Inter_400Regular' },
        textInputComponent.defaultProps.style,
      ];
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={DefaultTheme}>
        <NetworkProvider>
          <AuthProvider>
            <AppTabs />
          </AuthProvider>
        </NetworkProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
