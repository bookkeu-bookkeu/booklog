import { StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';

export default function LibraryScreen() {
  return (
    <ScreenContainer>
      <View style={styles.card}>
        <Text style={styles.title}>내 서재</Text>
        <Text style={styles.description}>읽고 싶은 책 / 읽는 중 / 다 읽은 책</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E2DD',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#6D655D',
  },
});