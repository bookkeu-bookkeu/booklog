import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import { useAuthStore } from '../store/useAuthStore';

export default function RootNavigator() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  return isLoggedIn ? <MainTabNavigator /> : <AuthNavigator />;
}