import '@/global.css';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

SplashScreen.preventAutoHideAsync();
SplashScreen.hideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="log-round" options={{ presentation: 'modal', title: 'Log a round' }} />
        <Stack.Screen name="add-course" options={{ presentation: 'modal', title: 'Add a course' }} />
        <Stack.Screen name="course/[id]" options={{ title: 'Course' }} />
      </Stack>
    </ThemeProvider>
  );
}
