import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import { useAuthStore } from '../store/useAuthStore';
import RbtiSurveyScreen from '../screens/auth/RbtiSurveyScreen';
import { getCurrentUserRbti } from '../api/rbti';

type OnboardingStackParamList = {
  RbtiSurvey: undefined;
};

const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();

export default function RootNavigator() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const shouldPromptRbtiAfterLogin = useAuthStore((state) => state.shouldPromptRbtiAfterLogin);
  const setShouldPromptRbtiAfterLogin = useAuthStore((state) => state.setShouldPromptRbtiAfterLogin);
  const [hasRbti, setHasRbti] = useState(false);
  const [isCheckingRbti, setIsCheckingRbti] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkRbti = async () => {
      if (!isLoggedIn) {
        setHasRbti(false);
        setIsCheckingRbti(false);
        return;
      }

      if (!shouldPromptRbtiAfterLogin) {
        setHasRbti(true);
        setIsCheckingRbti(false);
        return;
      }

      setIsCheckingRbti(true);

      try {
        const response = await getCurrentUserRbti();
        if (mounted) {
          setHasRbti(Boolean(response.has_rbti));
          if (response.has_rbti) {
            setShouldPromptRbtiAfterLogin(false);
          }
        }
      } catch (error) {
        if (mounted) {
          setHasRbti(false);
        }
      } finally {
        if (mounted) {
          setIsCheckingRbti(false);
        }
      }
    };

    void checkRbti();

    return () => {
      mounted = false;
    };
  }, [isLoggedIn, setShouldPromptRbtiAfterLogin, shouldPromptRbtiAfterLogin]);

  if (!isLoggedIn) {
    return <AuthNavigator />;
  }

  if (isCheckingRbti) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#F5B82E" />
      </View>
    );
  }

  if (!hasRbti) {
    return (
      <OnboardingStack.Navigator screenOptions={{ headerShown: false, gestureEnabled: false }}>
        <OnboardingStack.Screen name="RbtiSurvey">
          {(props) => (
            <RbtiSurveyScreen
              {...props}
              isRequired
              onCompleted={() => {
                setHasRbti(true);
                setShouldPromptRbtiAfterLogin(false);
              }}
            />
          )}
        </OnboardingStack.Screen>
      </OnboardingStack.Navigator>
    );
  }

  return <MainTabNavigator />;
}
