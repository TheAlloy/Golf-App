import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useAppStore } from '@/store/use-app-store';

export default function AddCourseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ latitude?: string; longitude?: string }>();
  const addCustomCourse = useAppStore((s) => s.addCustomCourse);

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [par, setPar] = useState('72');

  const latitude = Number(params.latitude);
  const longitude = Number(params.longitude);
  const hasPin = Number.isFinite(latitude) && Number.isFinite(longitude);

  const save = () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give the course a name.');
      return;
    }
    if (!hasPin) {
      Alert.alert('No pin', 'Add courses by long-pressing their location on the map.');
      return;
    }
    const course = addCustomCourse({
      name: name.trim(),
      city: city.trim(),
      country: country.trim(),
      par: Number(par) || 72,
      coordinate: { latitude, longitude },
    });
    router.back();
    router.push({ pathname: '/course/[id]', params: { id: course.id } });
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-2 p-4" keyboardShouldPersistTaps="handled">
        {hasPin && (
          <Text className="text-sm text-muted-foreground">
            Pin: {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </Text>
        )}
        <Text className="font-semibold text-sm">Course name</Text>
        <Input value={name} onChangeText={setName} placeholder="e.g. Little Hay Golf Club" />
        <Text className="font-semibold text-sm">Town / city</Text>
        <Input value={city} onChangeText={setCity} placeholder="Optional" />
        <Text className="font-semibold text-sm">Country</Text>
        <Input value={country} onChangeText={setCountry} placeholder="Optional" />
        <Text className="font-semibold text-sm">Par</Text>
        <Input value={par} onChangeText={setPar} keyboardType="number-pad" />

        <Button className="mt-4" onPress={save}>
          <Text>Add course</Text>
        </Button>
      </ScrollView>
    </View>
  );
}
