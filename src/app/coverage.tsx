import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/constants/theme';
import { catalogueByContinent, catalogueByCountry, CATALOGUE_COUNT } from '@/data/course-catalogue';

/**
 * What the bundled catalogue actually covers. Coverage is uneven by design —
 * the US comes from a ready-made open dataset while the rest of the world has
 * to be imported from OpenStreetMap — so it is better shown than hidden.
 */
export default function CoverageScreen() {
  const colors = useThemeColors();
  const byContinent = catalogueByContinent();
  const byCountry = catalogueByCountry();

  const max = Math.max(...Object.values(byContinent), 1);
  const thin = byCountry.filter((c) => c.count < 100 && c.country).length;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: 'Course coverage' }} />
      <ScrollView contentContainerClassName="gap-4 p-4">
        <View className="rounded-xl bg-card p-4">
          <Text className="font-bold text-3xl text-primary">
            {CATALOGUE_COUNT.toLocaleString()}
          </Text>
          <Text className="text-sm text-muted-foreground">courses in the app right now</Text>
        </View>

        <View className="rounded-xl bg-card p-4">
          <Text className="font-semibold text-base">By continent</Text>
          <View className="mt-3 gap-3">
            {Object.entries(byContinent).map(([continent, count]) => (
              <View key={continent} className="gap-1">
                <View className="flex-row justify-between">
                  <Text className="text-sm">{continent}</Text>
                  <Text className="font-semibold text-sm text-foreground">
                    {count.toLocaleString()}
                  </Text>
                </View>
                <View className="h-1.5 overflow-hidden rounded-full bg-elevated">
                  <View
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(1, (count / max) * 100)}%` }}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="rounded-xl bg-card p-4">
          <View className="flex-row items-center gap-2">
            <Ionicons name="information-circle" size={18} color={colors.info} />
            <Text className="font-semibold">Why the gaps?</Text>
          </View>
          <Text className="mt-2 text-sm text-muted-foreground">
            US courses come from the OpenGolfAPI open dataset, which is complete but
            US-only. Everywhere else is currently a curated shortlist of {thin > 0 ? 'notable' : ''} courses.
          </Text>
          <Text className="mt-2 text-sm text-muted-foreground">
            Full worldwide coverage comes from OpenStreetMap. Run{' '}
            <Text className="text-sm text-primary">npm run catalogue:import -- --region=europe</Text>{' '}
            in the repo to pull every mapped course in a region, then rebuild the app.
          </Text>
        </View>

        <View className="rounded-xl bg-card p-4">
          <Text className="font-semibold text-base">By country</Text>
          <View className="mt-2">
            {byCountry.slice(0, 25).map((c) => (
              <View
                key={c.country || 'unknown'}
                className="flex-row justify-between border-b border-border py-2"
              >
                <Text className="text-sm">{c.country || 'Unassigned'}</Text>
                <Text className="text-sm text-muted-foreground">{c.count.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
