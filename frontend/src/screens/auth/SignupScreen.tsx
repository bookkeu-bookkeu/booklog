import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import { signup } from '../../api/auth';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const onPressSignup = async () => {
    try {
      const data = await signup({
        email,
        nickname,
        password,
        password_confirm: passwordConfirm,
      });
      Alert.alert('회원가입 성공', JSON.stringify(data));
    } catch (error) {
      Alert.alert('회원가입 실패', '입력값과 서버 연결을 확인해 주세요.');
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.wrapper}>
        <Text style={styles.title}>회원가입</Text>

        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="이메일" />
        <TextInput style={styles.input} value={nickname} onChangeText={setNickname} placeholder="닉네임" />
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="비밀번호" secureTextEntry />
        <TextInput
          style={styles.input}
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
          placeholder="비밀번호 확인"
          secureTextEntry
        />

        <Pressable style={styles.button} onPress={onPressSignup}>
          <Text style={styles.buttonText}>가입하기</Text>
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
    fontSize: 28,
    fontWeight: '700',
    color: '#1F1F1F',
    marginBottom: 8,
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