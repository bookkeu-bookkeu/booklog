import React from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StackActions } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import ProfileNavigator from './ProfileNavigator';
import HomeNavigator from './HomeNavigator';
import LibraryNavigator from './LibraryNavigator';
import SearchNavigator from './SearchNavigator';

const Tab = createBottomTabNavigator();

type TabItemProps = {
  label: string;
  focused: boolean;
  onPress: () => void;
  icon: React.ReactNode;
  style?: ViewStyle;
};

function TabItem({ label, focused, onPress, icon, style }: TabItemProps) {
  return (
    <Pressable style={[styles.tabItem, style]} onPress={onPress}>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
        {label}
      </Text>
    </Pressable>
  );
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const [isQuickMenuOpen, setIsQuickMenuOpen] = React.useState(false);
  const menuAnimation = React.useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const activeIndex = state.index;
  const activeRoute = state.routes[activeIndex];

  const nestedSearchState =
    activeRoute.name === 'SearchTab'
      ? (activeRoute.state as
          | {
              index?: number;
              routes?: Array<{ name?: string }>;
            }
          | undefined)
      : undefined;
  const focusedSearchRouteName =
    nestedSearchState?.routes?.[nestedSearchState.index ?? 0]?.name;
  const nestedHomeState =
    activeRoute.name === 'HomeTab'
      ? (activeRoute.state as
          | {
              index?: number;
              routes?: Array<{ name?: string }>;
            }
          | undefined)
      : undefined;
  const focusedHomeRouteName =
    nestedHomeState?.routes?.[nestedHomeState.index ?? 0]?.name;
  const nestedLibraryState =
    activeRoute.name === 'LibraryTab'
      ? (activeRoute.state as
          | {
              index?: number;
              routes?: Array<{ name?: string }>;
            }
          | undefined)
      : undefined;
  const focusedLibraryRouteName =
    nestedLibraryState?.routes?.[nestedLibraryState.index ?? 0]?.name;
  const nestedProfileState =
    activeRoute.name === 'ProfileTab'
      ? (activeRoute.state as
          | {
              index?: number;
              routes?: Array<{ name?: string }>;
            }
          | undefined)
      : undefined;
  const focusedProfileRouteName =
    nestedProfileState?.routes?.[nestedProfileState.index ?? 0]?.name;
  const shouldHideTabBar =
    focusedHomeRouteName === 'BookDetail' ||
    focusedHomeRouteName === 'BookReview' ||
    focusedHomeRouteName === 'BookReviewCreate' ||
    focusedHomeRouteName === 'QuoteNote' ||
    focusedHomeRouteName === 'QuoteNoteBookSelect' ||
    focusedHomeRouteName === 'QuoteNoteCreate' ||
    focusedSearchRouteName === 'BookDetail' ||
    focusedSearchRouteName === 'BookReview' ||
    focusedSearchRouteName === 'BookReviewCreate' ||
    focusedSearchRouteName === 'QuoteNote' ||
    focusedSearchRouteName === 'QuoteNoteBookSelect' ||
    focusedSearchRouteName === 'QuoteNoteCreate' ||
    focusedLibraryRouteName === 'BookDetail' ||
    focusedLibraryRouteName === 'BookReview' ||
    focusedLibraryRouteName === 'BookReviewCreate' ||
    focusedLibraryRouteName === 'QuoteNote' ||
    focusedLibraryRouteName === 'QuoteNoteBookSelect' ||
    focusedLibraryRouteName === 'QuoteNoteCreate' ||
    focusedProfileRouteName === 'RbtiSurvey' ||
    focusedProfileRouteName === 'RbtiHistory' ||
    focusedProfileRouteName === 'BookReviewCreate' ||
    focusedProfileRouteName === 'QuoteNote' ||
    focusedProfileRouteName === 'Settings';

  const homeFocused = activeIndex === 0;
  const searchFocused = activeIndex === 1;
  const libraryFocused = activeIndex === 2;
  const profileFocused = activeIndex === 3;

  const baseHeight = 70;
  const tabBarHeight = baseHeight + insets.bottom;

  React.useEffect(() => {
    Animated.timing(menuAnimation, {
      toValue: isQuickMenuOpen ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isQuickMenuOpen, menuAnimation]);

  React.useEffect(() => {
    if (!shouldHideTabBar) {
      return;
    }

    setIsQuickMenuOpen(false);
    menuAnimation.stopAnimation();
    menuAnimation.setValue(0);
  }, [shouldHideTabBar, menuAnimation]);

  const quickMenuAnimatedStyle = {
    opacity: menuAnimation,
    transform: [
      {
        translateY: menuAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [16, 0],
        }),
      },
    ],
  };

  const backdropAnimatedStyle = {
    opacity: menuAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
  };

  const plusIconAnimatedStyle = {
    transform: [
      {
        rotate: menuAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '45deg'],
        }),
      },
    ],
  };

  if (shouldHideTabBar) {
    return null;
  }

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
    setIsQuickMenuOpen(false);

    const route = state.routes[routeIndex];
    const isFocused = activeIndex === routeIndex;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (event.defaultPrevented) {
      return;
    }

    navigation.navigate(route.name);

    if (!isFocused) {
      return;
    }

    const nestedState = route.state as { key?: string } | undefined;
    if (nestedState?.key) {
      navigation.dispatch({
        ...StackActions.popToTop(),
        target: nestedState.key,
      });
    }
  };

  const openReviewCreate = () => {
    setIsQuickMenuOpen(false);
    navigation.navigate('SearchTab', {
      screen: 'QuoteNoteBookSelect',
      params: { mode: 'review' },
    });
  };

  const openQuoteNoteCreate = () => {
    setIsQuickMenuOpen(false);
    navigation.navigate('SearchTab', { screen: 'QuoteNoteBookSelect' });
  };

  return (
    <View style={styles.tabOverlayRoot} pointerEvents="box-none">
      <Animated.View
        pointerEvents={isQuickMenuOpen ? 'auto' : 'none'}
        style={[styles.backdrop, backdropAnimatedStyle]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsQuickMenuOpen(false)} />
      </Animated.View>

      <View style={[styles.tabBarContainer, { height: tabBarHeight }]} pointerEvents="box-none">
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={width} height={tabBarHeight}>
            <Path d={backgroundPath} fill="#FFF6EA" />
          </Svg>
        </View>

        <View style={styles.centerButtonArea} pointerEvents="box-none">
          <Animated.View
            style={[styles.quickActionWrap, quickMenuAnimatedStyle]}
            pointerEvents={isQuickMenuOpen ? 'auto' : 'none'}
          >
            <Pressable
              style={styles.quickActionButton}
              onPress={openQuoteNoteCreate}
            >
              <Ionicons name="book-outline" size={24} color="#F3B331" />
            </Pressable>

            <Pressable
              style={styles.quickActionButton}
              onPress={openReviewCreate}
            >
              <Ionicons name="chatbubble-outline" size={24} color="#F3B331" />
            </Pressable>
          </Animated.View>

          <Pressable
            style={styles.plusButton}
            onPress={() => setIsQuickMenuOpen((prev) => !prev)}
          >
            <Animated.View style={plusIconAnimatedStyle}>
              <Ionicons name="add" size={38} color="#FFFFFF" />
            </Animated.View>
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
              label="검색"
              focused={searchFocused}
              onPress={() => handleTabPress(1)}
              style={styles.searchTabNudge}
              icon={<Ionicons name={searchFocused ? 'book' : 'book-outline'} size={24} color={searchFocused ? '#FEC54B' : '#C9C8D1'} />}
            />
          </View>

          <View style={styles.centerSpacer} />

          <View style={styles.sideTabs}>
            <TabItem
              label="내서재"
              focused={libraryFocused}
              onPress={() => handleTabPress(2)}
              style={styles.libraryTabNudge}
              icon={<Ionicons name={libraryFocused ? 'library' : 'library-outline'} size={24} color={libraryFocused ? '#FEC54B' : '#C9C8D1'} />}
            />
            <TabItem
              label="프로필"
              focused={profileFocused}
              onPress={() => handleTabPress(3)}
              icon={<Ionicons name={profileFocused ? 'person' : 'person-outline'} size={24} color={profileFocused ? '#FEC54B' : '#C9C8D1'} />}
            />
          </View>
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
      <Tab.Screen name="HomeTab" component={HomeNavigator} />
      <Tab.Screen name="SearchTab" component={SearchNavigator} />
      <Tab.Screen name="LibraryTab" component={LibraryNavigator} />
      <Tab.Screen name="ProfileTab" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabOverlayRoot: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  tabBarContainer: {
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -5 },
  },
  centerButtonArea: {
    position: 'absolute',
    top: -24,
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
  quickActionWrap: {
    position: 'absolute',
    bottom: 78,
    width: 126,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
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
  searchTabNudge: {
    transform: [{ translateX: -10 }],
  },
  libraryTabNudge: {
    transform: [{ translateX: 10 }],
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
