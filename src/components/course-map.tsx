import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import MapView, { LongPressEvent, Marker } from 'react-native-maps';

import { Course } from '@/models/types';

type Props = {
  courses: Course[];
  playedCourseIds: Set<string>;
};

const PLAYED_PIN = '#2E7D32';
const UNPLAYED_PIN = '#9E9E9E';

export default function CourseMap({ courses, playedCourseIds }: Props) {
  const router = useRouter();

  const onLongPress = (e: LongPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    router.push({
      pathname: '/add-course',
      params: { latitude: String(latitude), longitude: String(longitude) },
    });
  };

  return (
    <MapView
      style={StyleSheet.absoluteFill}
      initialRegion={{ latitude: 53.5, longitude: -3.5, latitudeDelta: 12, longitudeDelta: 12 }}
      onLongPress={onLongPress}
    >
      {courses.map((course) => (
        <Marker
          key={course.id}
          coordinate={course.coordinate}
          title={course.name}
          description={playedCourseIds.has(course.id) ? 'Played ✓' : 'Not played yet'}
          pinColor={playedCourseIds.has(course.id) ? PLAYED_PIN : UNPLAYED_PIN}
          onCalloutPress={() => router.push({ pathname: '/course/[id]', params: { id: course.id } })}
        />
      ))}
    </MapView>
  );
}
