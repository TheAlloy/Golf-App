import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/constants/theme';

/**
 * Launchpad for the centre tab. Starting a live round (GPS, hole-by-hole) is
 * Phase 3 work — see docs/roadmap.md — so for now this offers the flows that
 * exist and is explicit about what is coming.
 */
export default function PlayScreen() {
  const router = useRouter();
  const colors = useThemeColors();

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-3 p-4 pt-16">
        <Text className="font-bold text-3xl text-foreground">Play</Text>
        <Text className="text-muted-foreground">Log a round you have finished, or add a course.</Text>

        <Button className="mt-2 h-14" onPress={() => router.push('/log-round')}>
          <Ionicons name="add-circle" size={20} color={colors.primaryForeground} />
          <Text>Log a round</Text>
        </Button>

        <Button variant="outline" className="h-14" onPress={() => router.push('/add-course')}>
          <Ionicons name="location" size={20} color={colors.foreground} />
          <Text>Add a course</Text>
        </Button>

        <View className="mt-4 rounded-xl bg-card p-4">
          <View className="flex-row items-center gap-2">
            <Ionicons name="navigate-circle-outline" size={18} color={colors.info} />
            <Text className="font-semibold">Live round tracking</Text>
          </View>
          <Text className="mt-1 text-sm text-muted-foreground">
            On-course GPS, distances to greens and hazards, and wind-adjusted yardages need licensed
            hole geometry. That is Phase 3 — the provider options are written up in
            docs/course-data-providers.md.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
