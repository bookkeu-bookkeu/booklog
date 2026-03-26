import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getMyLibraryBooks } from '../../api/books';
import AnimatedContentSwitcher from './components/AnimatedContentSwitcher';
import LibraryGridLayer from './components/LibraryGridLayer';
import { mapShelfCodeToTab, mapUserLibraryBook } from './libraryMappers';
import {
  ESTIMATED_GRID_ROW_HEIGHT,
  INITIAL_BOOKS_BY_TAB,
  LibraryBook,
  ShelfTabKey,
  TAB_ORDER,
  TabTransitionState,
} from './libraryTypes';

export default function LibraryScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<ShelfTabKey>('reading');
  const [displayedTab, setDisplayedTab] = useState<ShelfTabKey>('reading');
  const [transition, setTransition] = useState<TabTransitionState | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingScrollTarget, setPendingScrollTarget] = useState<{
    tab: ShelfTabKey;
    index: number;
  } | null>(null);
  const [booksByTab, setBooksByTab] = useState<Record<ShelfTabKey, LibraryBook[]>>(
    INITIAL_BOOKS_BY_TAB,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { width } = useWindowDimensions();

  const isAnimatingRef = useRef(false);
  const searchInputRef = useRef<TextInput | null>(null);
  const scrollRefs = useRef<Partial<Record<ShelfTabKey, ScrollView | null>>>({});
  const outgoingTranslateX = useRef(new Animated.Value(0)).current;
  const incomingTranslateX = useRef(new Animated.Value(0)).current;

  const horizontalPadding = 28;
  const interCardGap = 18;
  const cardWidth = (width - horizontalPadding * 2 - interCardGap) / 2;
  const swipeThreshold = Math.min(92, width * 0.22);

  const fetchLibraryBooks = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      const response = await getMyLibraryBooks();

      const grouped: Record<ShelfTabKey, LibraryBook[]> = {
        wish: [],
        reading: [],
        done: [],
      };

      response.forEach((item) => {
        const tab = mapShelfCodeToTab(item.shelf_code);
        grouped[tab].push(mapUserLibraryBook(item));
      });

      setBooksByTab(grouped);
    } catch (error) {
      setLoadError('내 서재 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchLibraryBooks();
    }, [fetchLibraryBooks]),
  );

  const handleTabChange = (nextTab: ShelfTabKey) => {
    if (nextTab === activeTab || isAnimatingRef.current) return;

    const fromIndex = TAB_ORDER.indexOf(displayedTab);
    const toIndex = TAB_ORDER.indexOf(nextTab);
    const direction: 1 | -1 = toIndex > fromIndex ? 1 : -1;

    isAnimatingRef.current = true;
    outgoingTranslateX.stopAnimation();
    incomingTranslateX.stopAnimation();
    outgoingTranslateX.setValue(0);
    incomingTranslateX.setValue(direction * width);

    setActiveTab(nextTab);
    setTransition({ from: displayedTab, to: nextTab, direction });

    Animated.parallel([
      Animated.timing(outgoingTranslateX, {
        toValue: -direction * width,
        duration: 230,
        useNativeDriver: true,
      }),
      Animated.timing(incomingTranslateX, {
        toValue: 0,
        duration: 230,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setDisplayedTab(nextTab);
      } else {
        setActiveTab(displayedTab);
      }

      setTransition(null);
      outgoingTranslateX.setValue(0);
      incomingTranslateX.setValue(0);
      isAnimatingRef.current = false;
    });
  };

  const findBookLocation = (rawQuery: string) => {
    const query = rawQuery.trim().toLowerCase();
    if (!query) return null;

    for (const tab of TAB_ORDER) {
      const books = booksByTab[tab] ?? [];
      const index = books.findIndex((book) => {
        const haystack = `${book.title} ${book.author} ${book.publisher}`.toLowerCase();
        return haystack.includes(query);
      });

      if (index >= 0) {
        return { tab, index };
      }
    }

    return null;
  };

  const handleSearchSubmit = () => {
    const location = findBookLocation(searchQuery);

    if (!location) {
      Alert.alert('검색 결과 없음', '내 서재에서 해당 책을 찾지 못했어요.');
      return;
    }

    setPendingScrollTarget(location);

    if (location.tab !== activeTab) {
      handleTabChange(location.tab);
    }
  };

  const handleSearchButtonPress = () => {
    if (isSearchOpen) {
      setIsSearchOpen(false);
      setSearchQuery('');
      return;
    }

    setIsSearchOpen(true);
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  };

  useEffect(() => {
    if (!pendingScrollTarget) return;
    if (transition) return;
    if (pendingScrollTarget.tab !== activeTab) return;

    const rowIndex = Math.floor(pendingScrollTarget.index / 2);
    const y = Math.max(rowIndex * ESTIMATED_GRID_ROW_HEIGHT - 12, 0);

    requestAnimationFrame(() => {
      scrollRefs.current[pendingScrollTarget.tab]?.scrollTo({ y, animated: true });
      setPendingScrollTarget(null);
    });
  }, [pendingScrollTarget, transition, activeTab]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>아직 책이 없어요</Text>
      <Text style={styles.emptyDescription}>
        이 상태의 책이 추가되면 여기에 표시됩니다.
      </Text>
    </View>
  );

  const renderBookList = (
    tab: ShelfTabKey,
    listKey: string,
    animatedStyle?: object,
  ) => {
    const books = booksByTab[tab] ?? [];

    return (
      <LibraryGridLayer
        tab={tab}
        books={books}
        listKey={listKey}
        animatedStyle={animatedStyle}
        horizontalPadding={horizontalPadding}
        interCardGap={interCardGap}
        cardWidth={cardWidth}
        scrollRef={(node) => {
          scrollRefs.current[tab] = node;
        }}
        renderEmpty={renderEmpty}
        onPressBook={(book) =>
          navigation.navigate('BookDetail', { book: book.detailBook })
        }
      />
    );
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (isAnimatingRef.current) return false;

          const { dx, dy } = gestureState;
          return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.15;
        },
        onPanResponderRelease: (_, gestureState) => {
          if (isAnimatingRef.current) return;

          const { dx, vx } = gestureState;
          const shouldChangeTab =
            Math.abs(dx) >= swipeThreshold || Math.abs(vx) >= 0.42;

          if (!shouldChangeTab) return;

          const currentIndex = TAB_ORDER.indexOf(displayedTab);
          const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;

          if (nextIndex < 0 || nextIndex >= TAB_ORDER.length) return;

          handleTabChange(TAB_ORDER[nextIndex]);
        },
      }),
    [displayedTab, swipeThreshold],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerWrap}>
        <View style={styles.header}>
          <View style={styles.headerSide} />
          <Text style={styles.headerTitle}>내 서재</Text>
          <Pressable
            style={styles.searchButton}
            onPress={handleSearchButtonPress}
            hitSlop={10}
          >
            <Ionicons name="search-outline" size={22} color="#F4BC45" />
          </Pressable>
        </View>

        {isSearchOpen && (
          <View style={styles.inlineSearchWrap}>
            <View style={styles.inlineSearchBox}>
              <Ionicons
                name="search-outline"
                size={18}
                color="#7E818A"
                style={styles.inlineSearchIcon}
              />
              <TextInput
                ref={searchInputRef}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="내 서재에서 책 검색"
                placeholderTextColor="#A2A6B0"
                style={styles.inlineSearchInput}
                returnKeyType="search"
                onSubmitEditing={handleSearchSubmit}
              />
              <Pressable onPress={handleSearchSubmit} hitSlop={8}>
                <Text style={styles.inlineSearchAction}>이동</Text>
              </Pressable>
            </View>
          </View>
        )}

        <AnimatedContentSwitcher activeTab={activeTab} onChange={handleTabChange} />
      </View>

      <View style={styles.listViewport} {...panResponder.panHandlers}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#F4BC45" />
            <Text style={styles.loadingText}>내 서재를 불러오는 중이에요</Text>
          </View>
        ) : loadError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>불러오기에 실패했어요</Text>
            <Text style={styles.errorDescription}>{loadError}</Text>
          </View>
        ) : transition ? (
          <>
            {renderBookList(transition.from, `panel-${transition.from}`, {
              transform: [{ translateX: outgoingTranslateX }],
            })}
            {renderBookList(transition.to, `panel-${transition.to}`, {
              transform: [{ translateX: incomingTranslateX }],
            })}
          </>
        ) : (
          renderBookList(activeTab, `panel-${activeTab}`)
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerWrap: {
    paddingHorizontal: 28,
    paddingTop: 14,
  },
  listViewport: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    height: 44,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSide: {
    width: 28,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2025',
  },
  searchButton: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineSearchWrap: {
    marginBottom: 12,
  },
  inlineSearchBox: {
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F8F9FE',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  inlineSearchIcon: {
    marginRight: 8,
  },
  inlineSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2025',
    paddingVertical: 0,
  },
  inlineSearchAction: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F4BC45',
    paddingHorizontal: 4,
  },
  emptyContainer: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2025',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 13,
    color: '#8B909B',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#8B909B',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2025',
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 13,
    color: '#8B909B',
    textAlign: 'center',
    lineHeight: 20,
  },
});