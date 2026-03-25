import React from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StackActions } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import CalendarScreen from '../screens/calendar/CalendarScreen';
import HomeScreen from '../screens/home/HomeScreen';
import LibraryScreen from '../screens/home/LibraryScreen';
import SearchNavigator from './SearchNavigator';

const Tab = createBottomTabNavigator();

type TabItemProps = {
  label: string;
  focused: boolean;
  onPress: () => void;
  icon: React.ReactNode;
};

function TabItem({ label, focused, onPress, icon }: TabItemProps) {
  return (
    <Pressable style={styles.tabItem} onPress={onPress}>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
        {label}
      </Text>
    </Pressable>
  );
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const activeIndex = state.index;

  const homeFocused = activeIndex === 0;
  const calendarFocused = activeIndex === 1;
  const searchFocused = activeIndex === 2;
  const libraryFocused = activeIndex === 3;

  const baseHeight = 84;
  const tabBarHeight = baseHeight + insets.bottom;

  // --- SVG 경로(Path) 계산 ---
  const center = width / 2;
  const curveWidth = 150; // 파인 부분의 절반 너비
  const curveDepth = 50; // 파인 깊이
  const radius = 28;     // 양옆 모서리의 둥글기

  // SVG Path: 화면 크기와 곡선 깊이에 맞춰 커스텀 모양을 그림
  const backgroundPath = `
    M 0 ${radius}
    Q 0 0 ${radius} 0
    L ${center - curveWidth} 0
    C ${center - 25} 0, ${center - 35} ${curveDepth}, ${center} ${curveDepth}
    C ${center + 35} ${curveDepth}, ${center + 25} 0, ${center + curveWidth} 0
    L ${width - radius} 0
    Q ${width} 0 ${width} ${radius}
    L ${width} ${tabBarHeight}
    L 0 ${tabBarHeight}
    Z
  `;

  const handleTabPress = (routeIndex: number) => {
    const route = state.routes[routeIndex];
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (event.defaultPrevented) {
      return;
    }

    navigation.navigate(route.name);

    const nestedState = route.state as { key?: string } | undefined;
    if (nestedState?.key) {
      navigation.dispatch({
        ...StackActions.popToTop(),
        target: nestedState.key,
      });
    }
  };

  return (
    <View style={[styles.tabBarContainer, { height: tabBarHeight }]} pointerEvents="box-none">
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={width} height={tabBarHeight}>
          <Path d={backgroundPath} fill="#FFF6EA" />
        </Svg>
      </View>

      <View style={styles.centerButtonArea} pointerEvents="box-none">
        <Pressable
          style={styles.plusButton}
          onPress={() => Alert.alert('안내', '추가 기능은 나중에 연결하면 됩니다.')}
        >
          <Ionicons name="add" size={38} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={[styles.tabContentRow, { paddingBottom: insets.bottom > 0 ? insets.bottom - 10 : 0 }]} pointerEvents="box-none">
        <View style={styles.sideTabs}>
          <TabItem
            label="홈"
            focused={homeFocused}
            onPress={() => handleTabPress(0)}
            icon={<Ionicons name={homeFocused ? 'home' : 'home-outline'} size={24} color={homeFocused ? '#FEC54B' : '#C9C8D1'} />}
          />
          <TabItem
            label="달력"
            focused={calendarFocused}
            onPress={() => handleTabPress(1)}
            icon={<Ionicons name={calendarFocused ? 'calendar' : 'calendar-outline'} size={24} color={calendarFocused ? '#FEC54B' : '#C9C8D1'} />}
          />
        </View>

        <View style={styles.centerSpacer} />

        <View style={styles.sideTabs}>
          <TabItem
            label="검색"
            focused={searchFocused}
            onPress={() => handleTabPress(2)}
            icon={<Ionicons name={searchFocused ? 'document-text' : 'document-text-outline'} size={24} color={searchFocused ? '#FEC54B' : '#C9C8D1'} />}
          />
          <TabItem
            label="내서재"
            focused={libraryFocused}
            onPress={() => handleTabPress(3)}
            icon={<Ionicons name={libraryFocused ? 'people' : 'people-outline'} size={24} color={libraryFocused ? '#FEC54B' : '#C9C8D1'} />}
          />
        </View>
      </View>
    </View>
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="CalendarTab" component={CalendarScreen} />
      <Tab.Screen name="SearchTab" component={SearchNavigator} />
      <Tab.Screen name="LibraryTab" component={LibraryScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -5 },
  },
  centerButtonArea: {
    position: 'absolute',
    top: -28, 
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  plusButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FEC54B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ffae00',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  tabContentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  sideTabs: {
    width: '38%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  centerSpacer: {
    width: '24%',
  },
  tabItem: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#A09CA8',
  },
  tabLabelFocused: {
    color: '#2A2A2A',
    fontWeight: '700',
  },
});