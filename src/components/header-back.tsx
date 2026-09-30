import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Platform, Pressable } from 'react-native';

import { colors } from '@/constants/theme';

/**
 * Header back button drawn with the icon font rather than the navigator's
 * bundled arrow image, so it always renders. Modals get a close cross.
 * Opened with nothing behind it (a deep link, a web reload), it goes home.
 */
export function HeaderBack({ variant = 'back' }: { variant?: 'back' | 'close' }) {
  const router = useRouter();
  return (
    <Pressable
      // Native headers inset their left button; the web header does not.
      className={`h-9 w-9 items-center justify-center rounded-full bg-card active:opacity-70 ${Platform.OS === 'web' ? 'ml-3' : ''}`}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={variant === 'close' ? 'Close' : 'Back'}
    >
      <Ionicons
        name={variant === 'close' ? 'close' : 'chevron-back'}
        size={20}
        color={colors.foreground}
      />
    </Pressable>
  );
}
