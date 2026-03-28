import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Book, SearchStackParamList } from '../../../navigation/types';
import { getCurrentUserRbti } from '../../../api/rbti';
import BookSummaryCard from '../../../components/BookSummaryCard';

type SearchStackWithBookDetail = SearchStackParamList & {
  BookDetail: {
    book: BookLike;
  };
};

type Props = NativeStackScreenProps<SearchStackWithBookDetail, 'SearchHome'>;

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

const mockRecommendedBooks: BookLike[] = [];

const RBTI_NAME_BY_CODE: Record<string, string> = {
  RAN: '구조를 받아들이는 독해가',
  RAS: '핵심을 흡수하는 요약가',
  REN: '이야기에 스며드는 공감가',
  RES: '문장에 머무는 감성가',
  IAN: '구조를 해체하는 탐구가',
  IAS: '문장을 파고드는 해석가',
  IEN: '이야기를 확장하는 사유가',
  IES: '감정을 해석하는 철학가',
};

export default function SearchScreen({ navigation }: Props) {
  const [recommendedBooks] = useState<BookLike[]>(mockRecommendedBooks);
  const [rbtiName, setRbtiName] = useState<string>('');

  useEffect(() => {
    let mounted = true;

    const fetchCurrentRbti = async () => {
      try {
        const response = await getCurrentUserRbti();

        if (!mounted) {
          return;
        }

        if (response.has_rbti && response.current_rbti) {
          const apiName = response.current_rbti.rbti_name?.trim();
          if (apiName) {
            setRbtiName(apiName);
            return;
          }

          const code = response.current_rbti.rbti_code?.trim().toUpperCase();
          if (code && RBTI_NAME_BY_CODE[code]) {
            setRbtiName(RBTI_NAME_BY_CODE[code]);
            return;
          }

          return;
        }

        setRbtiName('');
      } catch (error) {
        console.log('현재 사용자 RBTI 조회 실패', error);
        if (mounted) {
          setRbtiName('');
        }
      }
    };

    fetchCurrentRbti();

    return () => {
      mounted = false;
    };
  }, []);

  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      <Pressable
        style={styles.searchBox}
        onPress={() => navigation.navigate('SearchInput')}
      >
        <Ionicons
          name="search-outline"
          size={20}
          color="#2F2A24"
          style={styles.searchIcon}
        />
        <Text style={styles.searchPlaceholder} numberOfLines={1}>
          Search...
        </Text>
      </Pressable>

      <View style={styles.titleCard}>
        <Text style={styles.recommendTitle}>
          {rbtiName ? (
            <>
              지금 <Text style={styles.highlight}>{rbtiName}</Text>에게{"\n"}
              가장 인기있는 책
            </>
          ) : (
            <>
              지금 <Text style={styles.highlight}>RBTI 유형 미설정</Text> 상태예요{"\n"}
              가장 인기있는 책
            </>
          )}
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyTitle}>추천 도서 준비 중이에요</Text>
      <Text style={styles.emptyDescription}>
        RBTI 추천 API가 연결되면 이 화면에 도서가 표시됩니다.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={recommendedBooks}
        keyExtractor={(item, index) =>
          String(item.external_api_id ?? item.id ?? `${item.title}-${index}`)
        }
        renderItem={({ item }) => (
          <View style={styles.cardItem}>
            <ResultCard
              book={item}
              onPress={() => navigation.navigate('BookDetail', { book: item })}
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
    backgroundColor: '#FFFFFF',
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
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: '#9AA0AA',
  },
  titleCard: {
    marginTop: 14,
    marginBottom: 6,
    paddingHorizontal: 6,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  recommendTitle: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '700',
    color: '#2D2F36',
  },
  highlight: {
    color: '#F09D22',
    fontWeight: '700',
  },
  cardItem: {
    marginBottom: 14,
  },
  emptyBox: {
    paddingTop: 24,
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
    textAlign: 'center',
  },
});
