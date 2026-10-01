import '@/global.css';

import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { DarkTheme, ThemeProvider } from 'expo-router';
import Stack from 'expo-router/js-stack';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { HeaderBack } from '@/components/header-back';
import { colors } from '@/constants/theme';
import { installOverlayScrollbars } from '@/lib/scrollbars';

SplashScreen.preventAutoHideAsync();
installOverlayScrollbars();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { fontFamily: 'Manrope_600SemiBold', color: colors.foreground },
          headerTintColor: colors.primaryBright,
          cardStyle: { backgroundColor: colors.background },
          // Every page change is a cross-fade. The JS stack is used because
          // it animates on the web too; the native one only does on devices.
          animation: 'fade',
          headerLeft: () => <HeaderBack />,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Home' }} />
        <Stack.Screen name="rounds" options={{ title: 'Rounds' }} />
        <Stack.Screen name="friends" options={{ title: 'Friends' }} />
        <Stack.Screen name="coverage" options={{ title: 'Course coverage' }} />
        <Stack.Screen
          name="log-round"
          options={{
            title: 'Log a round',
            headerLeft: () => <HeaderBack variant="close" />,
          }}
        />
        <Stack.Screen
          name="add-course"
          options={{
            title: 'Add a course',
            headerLeft: () => <HeaderBack variant="close" />,
          }}
        />
        <Stack.Screen name="course/[id]" options={{ title: 'Course' }} />
        <Stack.Screen name="round/[id]" options={{ title: 'Round' }} />
      </Stack>
    </ThemeProvider>
  );
}
