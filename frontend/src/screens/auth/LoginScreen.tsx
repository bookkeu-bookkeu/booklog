import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import { useAuthStore } from '../../store/useAuthStore';

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);

  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('12345678');
  const [loading, setLoading] = useState(false);

  const onPressLogin = async () => {
    try {
      setLoading(true);
      await login({
        email: email.trim(),
        password: password.trim(),
      });
      Alert.alert('로그인 성공');
    } catch (error: any) {
      const message =
        typeof error?.response?.data === 'string'
          ? error.response.data
          : JSON.stringify(error?.response?.data ?? '로그인에 실패했습니다.');

      Alert.alert('로그인 실패', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.wrapper}>
        <Text style={styles.title}>북로그</Text>
        <Text style={styles.subtitle}>RBTI 기반 독서 기록 앱</Text>

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="이메일"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="비밀번호"
          secureTextEntry
        />

        <Pressable style={styles.button} onPress={onPressLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? '로그인 중...' : '로그인'}</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F1F1F',
  },
  subtitle: {
    fontSize: 16,
    color: '#6D655D',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD7CF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#5B4B3A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});