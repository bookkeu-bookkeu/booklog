import { StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';

export default function SearchScreen() {
  return (
    <ScreenContainer>
      <View style={styles.card}>
        <Text style={styles.title}>책 검색</Text>
        <Text style={styles.description}>도서 검색 API 연결 예정</Text>
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