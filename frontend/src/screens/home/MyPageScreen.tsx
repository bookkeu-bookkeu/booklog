import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import { useAuthStore } from '../../store/useAuthStore';

export default function MyPageScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const onPressLogout = () => {
    Alert.alert('로그아웃', '로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <View style={styles.card}>
        <Text style={styles.title}>마이페이지</Text>
        <Text style={styles.description}>이메일: {user?.email ?? '-'}</Text>
        <Text style={styles.description}>닉네임: {user?.nickname ?? '-'}</Text>

        <Pressable style={styles.logoutButton} onPress={onPressLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
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
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  description: {
    fontSize: 15,
    color: '#6D655D',
  },
  logoutButton: {
    marginTop: 16,
    backgroundColor: '#5B4B3A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});