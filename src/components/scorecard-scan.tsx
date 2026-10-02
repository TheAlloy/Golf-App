import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { cn } from '@/lib/cn';
import { OCR_SUPPORTED, recognizeText } from '@/lib/scorecard-ocr';
import { parseScorecardScores } from '@/lib/scorecard-parse';

type Props = {
  holes: 9 | 18;
  pars?: (number | undefined)[];
  /** Called with one score per hole when the card has been read and accepted. */
  onScores: (strokes: number[]) => void;
  /** The photo is worth keeping with the round either way. */
  onPhoto?: (uri: string) => void;
};

type Status =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'found'; scores: number[] }
  | { kind: 'unreadable' }
  | { kind: 'unsupported' };

/**
 * Photograph (or pick) a scorecard. Where text recognition is available the
 * numbers are read off it and offered for review; otherwise the photo sits
 * above the hole grid as a reference while you type.
 */
export default function ScorecardScan({ holes, pars, onScores, onPhoto }: Props) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const read = async (uri: string) => {
    setPhoto(uri);
    onPhoto?.(uri);
    if (!OCR_SUPPORTED) {
      setStatus({ kind: 'unsupported' });
      return;
    }
    setStatus({ kind: 'reading' });
    try {
      const text = await recognizeText(uri);
      const scores = parseScorecardScores(text, holes, pars);
      setStatus(scores ? { kind: 'found', scores } : { kind: 'unreadable' });
    } catch {
      setStatus({ kind: 'unreadable' });
    }
  };

  const fromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) read(result.assets[0].uri);
  };

  const fromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) read(result.assets[0].uri);
  };

  return (
    <View className="gap-2 rounded-xl bg-card p-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-semibold text-sm">Scan your card</Text>
        <View className="flex-row gap-2">
          <ScanButton icon="camera-outline" label="Camera" onPress={fromCamera} />
          <ScanButton icon="images-outline" label="Photo" onPress={fromLibrary} />
        </View>
      </View>

      {photo && (
        <Image
          source={{ uri: photo }}
          style={{ width: '100%', height: 150, borderRadius: 8, backgroundColor: colors.muted }}
          resizeMode="contain"
          accessibilityLabel="Your scorecard"
        />
      )}

      {status.kind === 'reading' && (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" color={colors.primaryBright} />
          <Text className="text-xs text-muted-foreground">Reading the numbers…</Text>
        </View>
      )}

      {status.kind === 'found' && (
        <View className="gap-2">
          <Text className="text-xs text-muted-foreground">Read from the card. Check and use:</Text>
          <View className="flex-row flex-wrap gap-1">
            {status.scores.map((s, i) => (
              <View key={i} className="w-8 items-center rounded-md bg-elevated py-1">
                <Text className="font-semibold text-sm text-foreground">{s}</Text>
              </View>
            ))}
          </View>
          <Pressable
            className="flex-row items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 active:opacity-80"
            onPress={() => onScores(status.scores)}
            accessibilityRole="button"
          >
            <Ionicons name="checkmark" size={16} color={colors.primaryForeground} />
            <Text className="font-semibold text-sm text-primary-foreground">
              Use these {status.scores.length} scores
            </Text>
          </Pressable>
        </View>
      )}

      {status.kind === 'unreadable' && (
        <Text className="text-xs text-muted-foreground">
          Couldn&apos;t make out a row of scores. Keep the photo for reference and type them in
          below.
        </Text>
      )}

      {status.kind === 'unsupported' && (
        <Text className="text-xs text-muted-foreground">
          Reading cards automatically isn&apos;t available on this device yet. The photo is kept
          with the round; type the scores in below.
        </Text>
      )}

      {status.kind === 'idle' && (
        <Text className="text-xs text-muted-foreground">
          Photograph the card flat and well lit. Scores are read off it for you to check.
        </Text>
      )}
    </View>
  );
}

function ScanButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={cn(
        'flex-row items-center gap-1.5 rounded-full border border-border bg-elevated px-3 py-1.5 active:opacity-80'
      )}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Scan scorecard from ${label.toLowerCase()}`}
    >
      <Ionicons name={icon} size={14} color={colors.foreground} />
      <Text className="text-xs text-foreground">{label}</Text>
    </Pressable>
  );
}
