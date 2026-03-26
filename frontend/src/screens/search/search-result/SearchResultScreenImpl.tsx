import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Book, SearchStackParamList } from '../../../navigation/types';
import { searchBooks } from '../../../api/books';
import BookSummaryCard from '../../../components/BookSummaryCard';

type SearchStackWithBookDetail = SearchStackParamList & {
  BookDetail: {
    book: BookLike;
  };
};

type Props = NativeStackScreenProps<SearchStackWithBookDetail, 'SearchResult'>;

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

  const fetchBooks = useCallback(async () => {
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
  }, [keyword]);

  useFocusEffect(
    useCallback(() => {
      void fetchBooks();
    }, [fetchBooks])
  );

  const resultCountText = useMemo(() => {
    if (loading) return '검색 중';
    return `${books.length}권의 검색 결과`;
  }, [loading, books.length]);

  const handlePressBook = (book: BookLike) => {
    navigation.navigate('BookDetail', { book });
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
          <View style={styles.cardItem}>
            <ResultCard
              book={item}
              onPress={() => handlePressBook(item)}
            />
          </View>
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

  const isAdded = isBookAdded(book);

  return (
    <BookSummaryCard
      title={book.title || '제목 없음'}
      author={authorText || '저자 미상'}
      publisher={publisherText}
      thumbnail={thumbnail}
      onPress={onPress}
      variant="search"
      showAddedBadge={isAdded}
    />
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
  cardItem: {
    marginBottom: 14,
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
