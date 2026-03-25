import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/home/HomeScreen';
import LibraryScreen from '../screens/home/LibraryScreen';
import MyPageScreen from '../screens/home/MyPageScreen';
import { MainTabParamList } from './types';
import SearchNavigator from './SearchNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
        tabBarActiveTintColor: '#5B4B3A',
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '홈' }} />
      <Tab.Screen name="Search" component={SearchNavigator} options={{ title: '책 검색', headerShown: false }} />
      <Tab.Screen name="Library" component={LibraryScreen} options={{ title: '내 서재' }} />
      <Tab.Screen name="MyPage" component={MyPageScreen} options={{ title: '마이페이지' }} />
    </Tab.Navigator>
  );
}