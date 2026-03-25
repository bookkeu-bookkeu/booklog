import { StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';

export default function HomeScreen() {
  return (
    <ScreenContainer>
      <View style={styles.card}>
        <Text style={styles.title}>북로그 홈</Text>
        <Text style={styles.description}>현재 RBTI, 추천 도서, 독서 현황이 들어갈 자리</Text>
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