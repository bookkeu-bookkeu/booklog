import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Book, SearchStackParamList } from '../../navigation/types';
import { searchBooks } from '../../api/books';

type Props = NativeStackScreenProps<SearchStackParamList, 'SearchResult'>;

type BookLike = Book & {
  id?: number | string;
  thumbnail_url?: string;
  thumbnail?: string;
  authors?: string[] | string;
  author?: string;
  publisher?: string;
  published_date?: string;
  description?: string;
  isbn13?: string;
  category?: string;
  external_api_id?: string | number;
  is_added?: boolean;
  is_in_library?: boolean;
  in_library?: boolean;
  in_my_library?: boolean;
  is_in_shelf?: boolean;
};

const MAX_RESULTS = 20;

export default function SearchResultScreen({ navigation, route }: Props) {
  const keyword = route.params.keyword;
  const [books, setBooks] = useState<BookLike[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        const response = await searchBooks(keyword);
        const limitedResults = ((response?.results ?? []) as BookLike[]).slice(
          0,
          MAX_RESULTS
        );
        setBooks(limitedResults);
      } catch (error) {
        console.log('책 검색 실패', error);
        Alert.alert('알림', '검색 결과를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [keyword]);

  const resultCountText = useMemo(() => {
    if (loading) return '검색 중';
    return `${books.length}권의 검색 결과`;
  }, [loading, books.length]);

  const handlePressBook = (book: BookLike) => {
    Alert.alert('도서 선택', `${book.title} 상세 화면으로 연결하면 됩니다.`);
  };

  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      <Pressable
        style={styles.searchBox}
        onPress={() =>
          navigation.navigate('SearchInput', {
            initialKeyword: keyword,
          })
        }
      >
        <Ionicons
          name="search-outline"
          size={20}
          color="#2F2A24"
          style={styles.searchIcon}
        />
        <Text style={styles.searchText} numberOfLines={1}>
          {keyword}
        </Text>
      </Pressable>

      <View style={styles.titleCard}>
        <Text style={styles.title}>검색 결과</Text>
        <Text style={styles.count}>{resultCountText}</Text>
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#F5C24B" />
          <Text style={styles.loadingText}>책 정보를 불러오고 있어요</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyTitle}>검색 결과가 없어요</Text>
        <Text style={styles.emptyDescription}>
          다른 검색어로 다시 시도해보세요.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={loading ? [] : books}
        keyExtractor={(item, index) =>
          String(item.external_api_id ?? item.id ?? `${item.title}-${index}`)
        }
        renderItem={({ item }) => (
          <ResultCard
            book={item}
            onPress={() => handlePressBook(item)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

type ResultCardProps = {
  book: BookLike;
  onPress: () => void;
};

function ResultCard({ book, onPress }: ResultCardProps) {
  const authorText = getAuthorText(book);
  const publisherText = getPublisherText(book);

  const thumbnail =
    typeof book.thumbnail_url === 'string' && book.thumbnail_url.trim()
      ? book.thumbnail_url.trim()
      : typeof book.thumbnail === 'string' && book.thumbnail.trim()
      ? book.thumbnail.trim()
      : '';

  const hasThumbnail = !!thumbnail;
  const isLongTitle = (book.title || '').trim().length > 16;
  const isAdded = isBookAdded(book);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {hasThumbnail ? (
        <Image
          source={{ uri: thumbnail }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.thumbnailPlaceholder}>
          <Ionicons name="image-outline" size={28} color="#FFD7A2" />
        </View>
      )}

      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <Text
            style={[
              styles.labelText,
              isLongTitle && styles.labelTextCompact,
            ]}
            numberOfLines={1}
          >
            {publisherText}
          </Text>

          {isAdded && (
            <View style={styles.addedBadge}>
              <Text style={styles.addedBadgeText}>추가됨</Text>
            </View>
          )}
        </View>

        <Text
          style={[
            styles.bookTitle,
            isLongTitle && styles.bookTitleCompact,
          ]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {book.title || '제목 없음'}
        </Text>

        <Text style={styles.authorText} numberOfLines={1}>
          {authorText || '저자 미상'}
        </Text>
      </View>
    </Pressable>
  );
}

function getAuthorText(book: BookLike) {
  if (Array.isArray(book.authors) && book.authors.length > 0) {
    return book.authors.join(', ');
  }

  if (typeof book.authors === 'string') {
    const trimmed = book.authors.trim();
    if (trimmed) return trimmed;
  }

  if (typeof book.author === 'string') {
    const trimmed = book.author.trim();
    if (trimmed) return trimmed;
  }

  return '';
}

function getPublisherText(book: BookLike) {
  if (typeof book.publisher === 'string') {
    const trimmed = book.publisher.trim();
    if (trimmed) return trimmed;
  }
  return '출판사';
}

function isBookAdded(book: BookLike) {
  return Boolean(
    book.is_added ??
      book.is_in_library ??
      book.in_library ??
      book.in_my_library ??
      book.is_in_shelf
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    flexGrow: 1,
  },
  headerWrapper: {
    marginBottom: 14,
  },
  searchBox: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FE',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchText: {
    flex: 1,
    fontSize: 16,
    color: '#2F2A24',
  },
  titleCard: {
    marginTop: 14,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D2F36',
    marginBottom: 4,
  },
  count: {
    fontSize: 14,
    color: '#8B909B',
  },
  card: {
    height: 122,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F8F9FE',
    flexDirection: 'row',
    marginBottom: 14,
  },
  thumbnail: {
    width: 96,
    height: '100%',
    backgroundColor: '#E9D7B7',
  },
  thumbnailPlaceholder: {
    width: 96,
    height: '100%',
    backgroundColor: '#FFF6EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  labelText: {
    flex: 1,
    fontSize: 11,
    color: '#666A73',
    marginRight: 10,
    marginTop: 1,
  },
  labelTextCompact: {
    marginBottom: 2,
  },
  addedBadge: {
    minWidth: 56,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F5C24B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  addedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  bookTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    color: '#1F2025',
    marginBottom: 6,
  },
  bookTitleCompact: {
    lineHeight: 22,
    marginBottom: 4,
  },
  authorText: {
    fontSize: 13,
    color: '#666A73',
  },
  loadingBox: {
    paddingTop: 56,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#8B909B',
  },
  emptyBox: {
    paddingTop: 72,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2D2F36',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 13,
    color: '#8B909B',
  },
});