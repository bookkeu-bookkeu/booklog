import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  PanResponder,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  Image,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Book, SearchStackParamList } from '../../navigation/types';
import { getMyLibraryBooks, UserLibraryBook } from '../../api/books';

type Props = NativeStackScreenProps<SearchStackParamList, 'QuoteNoteBookSelect'>;
type SelectTab = 'reading' | 'done';
type TabTransitionState = {
  from: SelectTab;
  to: SelectTab;
  direction: 1 | -1;
};

const TAB_OPTIONS: Array<{ key: SelectTab; label: string; shelf: 'READING' | 'DONE' }> = [
  { key: 'reading', label: '읽는 중', shelf: 'READING' },
  { key: 'done', label: '완료', shelf: 'DONE' },
];

const TAB_ORDER: SelectTab[] = ['reading', 'done'];

export default function QuoteNoteBookSelectScreen({ navigation, route }: Props) {
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<SelectTab>('reading');
  const [displayedTab, setDisplayedTab] = useState<SelectTab>('reading');
  const [transition, setTransition] = useState<TabTransitionState | null>(null);
  const [booksByTab, setBooksByTab] = useState<Record<SelectTab, UserLibraryBook[]>>({
    reading: [],
    done: [],
  });
  const [loadingByTab, setLoadingByTab] = useState<Record<SelectTab, boolean>>({
    reading: true,
    done: true,
  });
  const [errorByTab, setErrorByTab] = useState<Record<SelectTab, string>>({
    reading: '',
    done: '',
  });
  const [selectedBook, setSelectedBook] = useState<UserLibraryBook | null>(null);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  const outgoingTranslateX = React.useRef(new Animated.Value(0)).current;
  const incomingTranslateX = React.useRef(new Animated.Value(0)).current;
  const isAnimatingRef = React.useRef(false);

  const currentBook = route.params?.book;
  const selectMode = route.params?.mode ?? 'quote';

  const horizontalPadding = 28;
  const interCardGap = 18;
  const cardWidth = (width - horizontalPadding * 2 - interCardGap) / 2;
  const swipeThreshold = Math.min(92, width * 0.22);

  const findMatchedBook = (items: UserLibraryBook[]) => {
    return (
      items.find((item) => {
        return (
          `${item.book_id}` === `${currentBook?.external_api_id ?? ''}` ||
          (item.book_isbn13 ?? '') === (currentBook?.isbn13 ?? '')
        );
      }) ?? null
    );
  };

  useEffect(() => {
    let mounted = true;

    const fetchBothTabs = async () => {
      const nextBooks: Record<SelectTab, UserLibraryBook[]> = {
        reading: [],
        done: [],
      };

      const nextErrors: Record<SelectTab, string> = {
        reading: '',
        done: '',
      };

      await Promise.all(
        TAB_OPTIONS.map(async (tab) => {
          try {
            const response = await getMyLibraryBooks(tab.shelf);
            nextBooks[tab.key] = response;
          } catch (error) {
            console.log('책 선택용 내 서재 조회 실패', error);
            nextErrors[tab.key] = '내 서재를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
          }
        })
      );

      if (!mounted) {
        return;
      }

      setBooksByTab(nextBooks);
      setErrorByTab(nextErrors);
      setLoadingByTab({ reading: false, done: false });

      const matchedInReading = findMatchedBook(nextBooks.reading);
      const matchedInDone = findMatchedBook(nextBooks.done);
      const matched = matchedInReading ?? matchedInDone;
      const matchedTab: SelectTab = matchedInDone ? 'done' : 'reading';

      setSelectedBook(matched);
      setActiveTab(matched ? matchedTab : 'reading');
      setDisplayedTab(matched ? matchedTab : 'reading');
    };

    void fetchBothTabs();

    return () => {
      mounted = false;
    };
  }, [currentBook?.external_api_id, currentBook?.isbn13]);

  const handleTabChange = (nextTab: SelectTab) => {
    if (nextTab === activeTab || isAnimatingRef.current) {
      return;
    }

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
          const shouldChangeTab = Math.abs(dx) >= swipeThreshold || Math.abs(vx) >= 0.42;

          if (!shouldChangeTab) return;

          const currentIndex = TAB_ORDER.indexOf(displayedTab);
          const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;

          if (nextIndex < 0 || nextIndex >= TAB_ORDER.length) return;

          handleTabChange(TAB_ORDER[nextIndex]);
        },
      }),
    [displayedTab, swipeThreshold]
  );

  const handleApply = () => {
    if (!selectedBook) {
      Alert.alert('알림', '책을 선택해 주세요.');
      return;
    }

    const nextBook: Book = {
      source: 'library',
      external_api_id: String(selectedBook.book_id),
      title: selectedBook.book_title ?? '',
      contents: '',
      url: '',
      isbn: selectedBook.book_isbn13 ?? '',
      isbn13: selectedBook.book_isbn13 ?? '',
      authors: selectedBook.book_authors ?? [],
      publisher: selectedBook.book_publisher ?? '',
      published_at: '',
      thumbnail: selectedBook.book_thumbnail_url ?? '',
      is_in_library: true,
    };

    if (selectMode === 'review') {
      navigation.replace('BookReviewCreate', { book: nextBook });
      return;
    }

    navigation.replace('QuoteNoteCreate', { book: nextBook });
  };

  const renderBookGrid = (tab: SelectTab, listKey: string, animatedStyle?: object) => {
    const books = booksByTab[tab] ?? [];
    const filteredBooks =
      searchText.trim().length > 0
        ? books.filter((item) =>
            (item.book_title ?? '').toLowerCase().includes(searchText.trim().toLowerCase())
          )
        : books;
    const isLoading = loadingByTab[tab];
    const loadError = errorByTab[tab];

    return (
      <Animated.View style={[styles.listPanel, animatedStyle]} key={listKey}>
        <View style={styles.listWrap}>
          {isLoading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="small" color="#F5C24B" />
              <Text style={styles.stateText}>책 목록을 불러오는 중이에요</Text>
            </View>
          ) : loadError ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateText}>{loadError}</Text>
            </View>
          ) : (
            <FlatList
              data={filteredBooks}
              keyExtractor={(item) => String(item.id)}
              showsVerticalScrollIndicator={false}
              numColumns={2}
              columnWrapperStyle={styles.rowWrap}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const checked = selectedBook?.id === item.id;
                const hasThumbnail = !!item.book_thumbnail_url?.trim();

                return (
                  <Pressable
                    style={[styles.bookCard, checked && styles.bookCardChecked, { width: cardWidth }]}
                    onPress={() => setSelectedBook(item)}
                  >
                    {hasThumbnail ? (
                      <Image
                        source={{ uri: item.book_thumbnail_url }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.thumbnailPlaceholder}>
                        <Ionicons name="image-outline" size={28} color="#FFD7A2" />
                      </View>
                    )}

                    <View style={styles.cardInfo}>
                      <Text style={styles.publisher} numberOfLines={1}>
                        {item.book_publisher || '출판사'}
                      </Text>

                      <Text style={styles.bookTitle} numberOfLines={2}>
                        {item.book_title || '제목 없음'}
                      </Text>

                      <Text style={styles.bookMeta} numberOfLines={1}>
                        {(item.book_authors ?? []).join(', ') || '저자 미상'}
                      </Text>
                    </View>

                    <View style={styles.checkboxWrapInCard}>
                      {checked ? (
                        <View style={styles.checkedSquare}>
                          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                        </View>
                      ) : (
                        <Ionicons name="square-outline" size={24} color="#B8BCC6" />
                      )}
                    </View>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.stateBox}>
                  <Text style={styles.stateText}>
                    {searchText.trim().length > 0
                      ? '검색 결과가 없습니다.'
                      : '해당 탭에 책이 없습니다.'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#F2B43C" />
        </Pressable>

        <Text style={styles.headerTitle}>책 선택</Text>

        <Pressable
          style={styles.searchButton}
          onPress={() => setIsSearchVisible((prev) => !prev)}
        >
          <Ionicons name="search" size={20} color="#F2B43C" />
        </Pressable>
      </View>

      {isSearchVisible ? (
        <View style={styles.searchWrap}>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="책 이름을 검색해 주세요"
            placeholderTextColor="#9CA1AB"
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
      ) : null}

      <View style={styles.switcherOuter}>
        <View style={styles.switcherContainer}>
          <View
            style={[
              styles.switcherSlider,
              activeTab === 'reading' ? styles.switcherSliderLeft : styles.switcherSliderRight,
            ]}
          />

          {TAB_OPTIONS.map((tab) => {
            const active = activeTab === tab.key;

            return (
              <Pressable
                key={tab.key}
                style={styles.switchTab}
                onPress={() => handleTabChange(tab.key)}
              >
                <Text style={[styles.switchTabText, active && styles.switchTabTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.listViewport} {...panResponder.panHandlers}>
        {transition ? (
          <>
            {renderBookGrid(transition.from, `panel-${transition.from}`, {
              transform: [{ translateX: outgoingTranslateX }],
            })}
            {renderBookGrid(transition.to, `panel-${transition.to}`, {
              transform: [{ translateX: incomingTranslateX }],
            })}
          </>
        ) : (
          renderBookGrid(displayedTab, `panel-${displayedTab}`)
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          style={styles.applyButton}
          onPress={handleApply}
        >
          <Text style={styles.applyButtonText}>선택하기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 44,
    paddingHorizontal: 28,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  backButton: {
    width: 28,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2025',
  },
  searchButton: {
    width: 28,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  searchWrap: {
    marginHorizontal: 28,
    marginBottom: 14,
  },
  searchInput: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECEFF5',
    backgroundColor: '#F8F9FE',
    paddingHorizontal: 14,
    color: '#1F2025',
    fontSize: 14,
  },
  switcherOuter: {
    marginHorizontal: 28,
    marginBottom: 20,
  },
  switcherContainer: {
    height: 38,
    borderRadius: 14,
    backgroundColor: '#F8F9FE',
    padding: 3,
    flexDirection: 'row',
    position: 'relative',
    overflow: 'hidden',
  },
  switcherSlider: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    width: '50%',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  switcherSliderLeft: {
    left: 3,
  },
  switcherSliderRight: {
    right: 3,
  },
  switchTab: {
    flex: 1,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7E818A',
  },
  switchTabTextActive: {
    color: '#23252B',
  },
  listWrap: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 110,
  },
  listViewport: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  listPanel: {
    ...StyleSheet.absoluteFillObject,
  },
  rowWrap: {
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  listContent: {
    paddingBottom: 18,
  },
  bookCard: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F8F9FE',
    borderWidth: 1,
    borderColor: '#F8F9FE',
    position: 'relative',
  },
  bookCardChecked: {
    borderColor: '#F5C24B',
    backgroundColor: '#FFFDF8',
  },
  thumbnail: {
    width: '100%',
    height: 164,
    backgroundColor: '#FFF6EA',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: 164,
    backgroundColor: '#FFF6EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  publisher: {
    fontSize: 10,
    color: '#666A73',
    marginBottom: 4,
  },
  bookTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    color: '#1F2025',
    marginBottom: 4,
  },
  bookMeta: {
    fontSize: 12,
    color: '#666A73',
  },
  checkboxWrapInCard: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  checkedSquare: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#F5C24B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateBox: {
    paddingTop: 30,
    alignItems: 'center',
  },
  stateText: {
    marginTop: 8,
    fontSize: 13,
    color: '#8B909B',
    textAlign: 'center',
    lineHeight: 19,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 34,
    backgroundColor: '#FFFFFF',
  },
  applyButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FEC54B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
