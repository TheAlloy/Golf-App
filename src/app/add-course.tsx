import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/use-app-store';

export default function AddCourseScreen() {
  const router = useRouter();
  const theme = useTheme();
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

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {hasPin && (
          <ThemedText type="small" themeColor="textSecondary">
            Pin: {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </ThemedText>
        )}
        <ThemedText type="smallBold">Course name</ThemedText>
        <TextInput
          style={inputStyle}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Little Hay Golf Club"
          placeholderTextColor={theme.textSecondary}
        />
        <ThemedText type="smallBold">Town / city</ThemedText>
        <TextInput style={inputStyle} value={city} onChangeText={setCity} placeholder="Optional" placeholderTextColor={theme.textSecondary} />
        <ThemedText type="smallBold">Country</ThemedText>
        <TextInput style={inputStyle} value={country} onChangeText={setCountry} placeholder="Optional" placeholderTextColor={theme.textSecondary} />
        <ThemedText type="smallBold">Par</ThemedText>
        <TextInput style={inputStyle} value={par} onChangeText={setPar} keyboardType="number-pad" placeholderTextColor={theme.textSecondary} />

        <Pressable style={styles.saveButton} onPress={save}>
          <ThemedText type="smallBold" style={styles.saveText}>Add course</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two },
  input: { borderRadius: 10, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 2, fontSize: 16 },
  saveButton: {
    marginTop: Spacing.three,
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  saveText: { color: '#fff' },
});
