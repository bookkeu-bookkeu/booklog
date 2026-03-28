import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { AxiosError } from 'axios';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../../store/useAuthStore';

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const scrollViewRef = useRef<ScrollView>(null);
  const formSectionYRef = useRef(0);
  const emailFieldYRef = useRef(0);
  const passwordFieldYRef = useRef(0);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onPressLogin = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      Alert.alert('입력 확인', '이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      await login({ email: trimmedEmail, password });
    } catch (error) {
      Alert.alert('로그인 실패', getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToField = (fieldY: number) => {
    const targetY = Math.max(formSectionYRef.current + fieldY - 80, 0);

    // Wait for keyboard animation start, then bring password field into view.
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
    }, 120);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" backgroundColor="#FFF6EA" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior="padding"
          keyboardVerticalOffset={24}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topBanner}>
              <Ionicons name="image-outline" size={42} color="#FFD7A2" />
            </View>

            <View
              style={styles.formSection}
              onLayout={(event) => {
                formSectionYRef.current = event.nativeEvent.layout.y;
              }}
            >
              <Text style={styles.title}>Welcome!</Text>

          <View
            style={styles.inputWrapper}
            onLayout={(event) => {
              emailFieldYRef.current = event.nativeEvent.layout.y;
            }}
          >
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email Address"
              placeholderTextColor="#A4A4AD"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => scrollToField(emailFieldYRef.current)}
            />
          </View>

          <View
            style={styles.inputWrapper}
            onLayout={(event) => {
              passwordFieldYRef.current = event.nativeEvent.layout.y;
            }}
          >
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#A4A4AD"
              style={styles.input}
              secureTextEntry={!isPasswordVisible}
              autoCapitalize="none"
              onSubmitEditing={onPressLogin}
              onFocus={() => scrollToField(passwordFieldYRef.current)}
              editable={!isSubmitting}
            />
            <Pressable
              style={styles.eyeButton}
              onPress={() => setIsPasswordVisible((prev) => !prev)}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="비밀번호 보기 토글"
            >
              <Ionicons
                name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="#9D9DA6"
              />
            </Pressable>
          </View>

          <Pressable style={styles.forgotButton}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>

          <Pressable
            style={[styles.loginButton, isSubmitting && styles.loginButtonDisabled]}
            onPress={onPressLogin}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </Pressable>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Not a member? </Text>
            <Pressable>
              <Text style={styles.registerLink}>Register now</Text>
            </Pressable>
          </View>

          <View style={styles.dividerWrap}>
            <View style={styles.divider} />
          </View>

          <Text style={styles.socialTitle}>Or continue with</Text>

              <View style={styles.socialRow}>
                <Pressable style={[styles.socialButton, styles.googleButton]}>
                  <Text style={styles.googleText}>G</Text>
                </Pressable>

                <Pressable style={[styles.socialButton, styles.appleButton]}>
                  <Ionicons name="logo-apple" size={18} color="#FFFFFF" />
                </Pressable>

                <Pressable style={[styles.socialButton, styles.facebookButton]}>
                  <Text style={styles.facebookText}>f</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF6EA',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  scrollView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  scrollContent: {
    flexGrow: 1,
  },

  topBanner: {
    height: '38%',
    minHeight: 280,
    backgroundColor: '#FFF6EA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  formSection: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 22,
    paddingTop: 30,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 24,
  },

  inputWrapper: {
    height: 48,
    borderWidth: 1,
    borderColor: '#CFCFD6',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 14,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: '#222222',
    paddingVertical: 0,
  },

  eyeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  forgotButton: {
    alignSelf: 'flex-start',
    marginTop: 2,
    marginBottom: 18,
  },

  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F09B22',
  },

  loginButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F5C24B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  loginButtonDisabled: {
    opacity: 0.75,
  },

  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },

  registerText: {
    fontSize: 14,
    color: '#7E7E86',
  },

  registerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F09B22',
  },

  dividerWrap: {
    marginBottom: 18,
  },

  divider: {
    height: 1,
    backgroundColor: '#DDDEE3',
  },

  socialTitle: {
    textAlign: 'center',
    fontSize: 14,
    color: '#7E7E86',
    marginBottom: 16,
  },

  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
  },

  socialButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  googleButton: {
    backgroundColor: '#F44336',
  },

  appleButton: {
    backgroundColor: '#1F1F25',
  },

  facebookButton: {
    backgroundColor: '#1877F2',
  },

  googleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  facebookText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: -1,
  },
});

function getLoginErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const data = error.response?.data;

    if (typeof data === 'string' && data.trim()) {
      return data;
    }

    if (data && typeof data === 'object') {
      const message = (data as { detail?: unknown; message?: unknown }).detail ??
        (data as { detail?: unknown; message?: unknown }).message;

      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return '이메일/비밀번호 또는 서버 상태를 확인해 주세요.';
}