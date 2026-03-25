import React, { useMemo, useState } from 'react';
import {
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

type Props = NativeStackScreenProps<SearchStackParamList, 'SearchHome'>;

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

const PLACEHOLDER_RBTI = '';
const mockRecommendedBooks: BookLike[] = [];

export default function SearchScreen({ navigation }: Props) {
  const [recommendedBooks] = useState<BookLike[]>(mockRecommendedBooks);

  const titleText = useMemo(() => {
    return `${PLACEHOLDER_RBTI}사용자 RBTI 유형에게 가장 인기있는 책`;
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
          {PLACEHOLDER_RBTI ? (
            <>
              지금 <Text style={styles.highlight}>{PLACEHOLDER_RBTI}</Text>사용자 RBTI
              유형에게{'\n'}가장 인기있는 책
            </>
          ) : (
            <>
              지금 <Text style={styles.highlight}>사용자 RBTI 유형</Text>에게{'\n'}
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
          <ResultCard
            book={item}
            onPress={() => {}}
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
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    color: '#2D2F36',
  },
  highlight: {
    color: '#F09D22',
    fontWeight: '700',
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