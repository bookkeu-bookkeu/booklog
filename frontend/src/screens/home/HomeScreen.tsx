import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useScrollToTop } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getMe } from '../../api/auth';
import { getMyLibraryBooks } from '../../api/books';
import { getBookReviews } from '../../api/reviews';
import {
  getCurrentUserRbti,
  type CurrentUserRbti,
  type CurrentUserRbtiResponse,
} from '../../api/rbti';
import UserProfileHeader, { userProfileHeaderStyles } from '../../components/UserProfileHeader';
import LibraryBookCard, { LibraryBookCardItem } from '../../components/LibraryBookCard';
import { Book } from '../../navigation/types';

type RbtiAxis = {
  id: string;
  label: string;
  valueText: string;
  deltaText: string;
  deltaDirection?: 'increase' | 'decrease';
  fillPercent: number; // 0 ~ 100
  previousFillPercent?: number;
};

type HomeBookCardItem = LibraryBookCardItem & {
  id: string;
  detailBook: Book;
};

function mapLibraryBookToHomeItem(item: {
  id: number;
  book_id: number;
  book_title: string;
  book_publisher: string;
  book_authors: string[];
  book_thumbnail_url: string;
  book_isbn13: string;
}): HomeBookCardItem {
  const title = item.book_title?.trim() || '제목 없음';
  const publisher = item.book_publisher?.trim() || '출판사';
  const thumbnail = item.book_thumbnail_url?.trim() || '';
  const isbn13 = item.book_isbn13?.trim() || '';

  return {
    id: String(item.id),
    title,
    author: item.book_authors?.length ? item.book_authors.join(', ') : '저자 미상',
    publisher,
    thumbnail: thumbnail || undefined,
    detailBook: {
      source: 'library',
      external_api_id: String(item.book_id),
      title,
      contents: '',
      url: '',
      isbn: isbn13,
      isbn13,
      authors: item.book_authors ?? [],
      publisher,
      published_at: '',
      thumbnail,
      is_in_library: true,
    },
  };
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getScore(value: number | undefined) {
  return clampPercent(typeof value === 'number' ? value : 50);
}

function getOptionalScore(value: number | null | undefined) {
  return typeof value === 'number' ? clampPercent(value) : undefined;
}

function normalizeScorePair(leftScore: number, rightScore: number) {
  const total = leftScore + rightScore;

  if (total <= 0) {
    return { leftScore: 50, rightScore: 50 };
  }

  const normalizedLeftScore = clampPercent((leftScore / total) * 100);
  return {
    leftScore: normalizedLeftScore,
    rightScore: 100 - normalizedLeftScore,
  };
}

function normalizeOptionalScorePair(
  leftScore: number | null | undefined,
  rightScore: number | null | undefined,
) {
  const normalizedLeftScore = getOptionalScore(leftScore);
  const normalizedRightScore = getOptionalScore(rightScore);

  if (typeof normalizedLeftScore !== 'number' || typeof normalizedRightScore !== 'number') {
    return {
      leftScore: normalizedLeftScore,
      rightScore: normalizedRightScore,
    };
  }

  return normalizeScorePair(normalizedLeftScore, normalizedRightScore);
}

function formatScoreDelta(delta: number | null | undefined) {
  if (typeof delta !== 'number') {
    return '';
  }

  if (delta === 0) {
    return ' (-%)';
  }

  const direction = delta > 0 ? '▲' : '▼';
  return ` (${Math.abs(delta)}%${direction})`;
}

function getDeltaDirection(delta: number | null | undefined) {
  if (typeof delta !== 'number' || delta === 0) {
    return undefined;
  }

  return delta > 0 ? 'increase' : 'decrease';
}

function getScoreDelta(
  current: number,
  previous: number | null | undefined,
  fallbackDelta: number | null | undefined,
) {
  if (typeof previous === 'number') {
    return current - previous;
  }

  return fallbackDelta;
}

function buildRbtiAxes(
  currentRbti: CurrentUserRbti,
  axisDefinitions: CurrentUserRbtiResponse['axis_definitions'],
): RbtiAxis[] {
  const definitionsByAxis = new Map(axisDefinitions.map((definition) => [definition.axis, definition]));
  const rbtiCode = currentRbti.rbti_code?.trim().toUpperCase() ?? '';
  const shouldShowDelta = currentRbti.source_type === 'ai_review';

  const axisConfigs = [
    {
      id: '1',
      axis: 1,
      codeIndex: 0,
      leftScore: getScore(currentRbti.analytic_score),
      rightScore: getScore(currentRbti.immersion_score),
      leftDelta: currentRbti.score_changes?.analytic_score.delta,
      rightDelta: currentRbti.score_changes?.immersion_score.delta,
      leftPrevious: currentRbti.score_changes?.analytic_score.previous,
      rightPrevious: currentRbti.score_changes?.immersion_score.previous,
      fallbackLeftName: '수용형',
      fallbackRightName: '탐구형',
      fallbackLeftCode: 'R',
      fallbackRightCode: 'I',
    },
    {
      id: '2',
      axis: 2,
      codeIndex: 1,
      leftScore: getScore(currentRbti.critical_score),
      rightScore: getScore(currentRbti.empathy_score),
      leftDelta: currentRbti.score_changes?.critical_score.delta,
      rightDelta: currentRbti.score_changes?.empathy_score.delta,
      leftPrevious: currentRbti.score_changes?.critical_score.previous,
      rightPrevious: currentRbti.score_changes?.empathy_score.previous,
      fallbackLeftName: '분석형',
      fallbackRightName: '공감형',
      fallbackLeftCode: 'A',
      fallbackRightCode: 'E',
    },
    {
      id: '3',
      axis: 3,
      codeIndex: 2,
      leftScore: getScore(currentRbti.practical_score),
      rightScore: getScore(currentRbti.expansion_score),
      leftDelta: currentRbti.score_changes?.practical_score.delta,
      rightDelta: currentRbti.score_changes?.expansion_score.delta,
      leftPrevious: currentRbti.score_changes?.practical_score.previous,
      rightPrevious: currentRbti.score_changes?.expansion_score.previous,
      fallbackLeftName: '서사형',
      fallbackRightName: '문장형',
      fallbackLeftCode: 'N',
      fallbackRightCode: 'S',
    },
  ];

  return axisConfigs.map((config) => {
    const definition = definitionsByAxis.get(config.axis);
    const leftCode = definition?.left_code ?? config.fallbackLeftCode;
    const rightCode = definition?.right_code ?? config.fallbackRightCode;
    const currentScores = normalizeScorePair(config.leftScore, config.rightScore);
    const previousScores = normalizeOptionalScorePair(config.leftPrevious, config.rightPrevious);
    const selectedCode = rbtiCode[config.codeIndex];
    const isRightSelected = selectedCode
      ? selectedCode === rightCode
      : currentScores.rightScore >= 50;
    const score = isRightSelected ? currentScores.rightScore : currentScores.leftScore;
    const previous = isRightSelected ? previousScores.rightScore : previousScores.leftScore;
    const fallbackDelta = isRightSelected ? config.rightDelta : config.leftDelta;
    const delta = getScoreDelta(score, previous, fallbackDelta);
    const label = isRightSelected
      ? definition?.right_name ?? config.fallbackRightName
      : definition?.left_name ?? config.fallbackLeftName;
    const deltaText = shouldShowDelta ? formatScoreDelta(delta) : '';

    return {
      id: config.id,
      label,
      valueText: `${score}%`,
      deltaText,
      deltaDirection: shouldShowDelta ? getDeltaDirection(delta) : undefined,
      fillPercent: score,
      previousFillPercent: typeof previous === 'number' ? previous : undefined,
    };
  });
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [readingBooks, setReadingBooks] = useState<HomeBookCardItem[]>([]);
  const [waitingReviewBooks, setWaitingReviewBooks] = useState<HomeBookCardItem[]>([]);
  const [isReadingBooksLoading, setIsReadingBooksLoading] = useState(true);
  const [isWaitingReviewBooksLoading, setIsWaitingReviewBooksLoading] = useState(true);
  const [userRbtiName, setUserRbtiName] = useState<string>('');
  const [rbtiAxes, setRbtiAxes] = useState<RbtiAxis[]>([]);
  const [userNickname, setUserNickname] = useState<string>('');

  const fetchHomeBooks = useCallback(async () => {
    try {
      setIsReadingBooksLoading(true);
      setIsWaitingReviewBooksLoading(true);

      const [readingResponse, doneResponse] = await Promise.all([
        getMyLibraryBooks('READING'),
        getMyLibraryBooks('DONE'),
      ]);

      setReadingBooks(readingResponse.map(mapLibraryBookToHomeItem));

      const reviewStates = await Promise.all(
        doneResponse.map(async (item) => {
          try {
            const myReviews = await getBookReviews(item.book_id, { mine: true });
            return {
              item,
              hasMyReview: myReviews.length > 0,
            };
          } catch (error) {
            return {
              item,
              hasMyReview: false,
            };
          }
        }),
      );

      const waitingItems = reviewStates
        .filter((entry) => !entry.hasMyReview)
        .map((entry) => mapLibraryBookToHomeItem(entry.item));

      setWaitingReviewBooks(waitingItems);

      // Fetch user data
      try {
        const userResponse = await getMe();
        setUserNickname(userResponse.nickname);
      } catch (error) {
        // 사용자 정보 로드 실패 시 기본값 사용
        setUserNickname('');
      }

      // Fetch user RBTI data
      try {
        const rbtiResponse = await getCurrentUserRbti();
        if (rbtiResponse.has_rbti && rbtiResponse.current_rbti?.rbti_name) {
          setUserRbtiName(rbtiResponse.current_rbti.rbti_name);
          setRbtiAxes(buildRbtiAxes(rbtiResponse.current_rbti, rbtiResponse.axis_definitions));
        } else {
          setUserRbtiName('');
          setRbtiAxes([]);
        }
      } catch (error) {
        // RBTI 로드 실패 시 기본값 사용
        setUserRbtiName('');
        setRbtiAxes([]);
      }
    } catch (error) {
      setReadingBooks([]);
      setWaitingReviewBooks([]);
    } finally {
      setIsReadingBooksLoading(false);
      setIsWaitingReviewBooksLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchHomeBooks();
    }, [fetchHomeBooks]),
  );
  useScrollToTop(scrollViewRef);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <UserProfileHeader
          rbtiName={userRbtiName}
          nickname={userNickname}
          rightAccessory={(
            <Pressable style={userProfileHeaderStyles.bellButton} hitSlop={10}>
              <Ionicons name="notifications" size={22} color="#2F3238" />
              <View style={userProfileHeaderStyles.bellDot} />
            </Pressable>
          )}
        />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.rbtiSectionTitle]}>내 최근 리뷰로 보정된 RBTI</Text>

          <View style={styles.rbtiBox}>
            {rbtiAxes.length > 0 ? (
              rbtiAxes.map((axis) => (
                <RbtiBar key={axis.id} item={axis} />
              ))
            ) : (
              <Text style={styles.rbtiEmptyText}>아직 표시할 RBTI 수치가 없어요.</Text>
            )}
          </View>
        </View>

        {isReadingBooksLoading ? (
          <View style={styles.readingLoadingWrap}>
            <ActivityIndicator size="small" color="#F5C24B" />
          </View>
        ) : readingBooks.length > 0 ? (
          <HorizontalBookSection
            title="읽고 있는 책"
            books={readingBooks}
            onPressSeeMore={() =>
              navigation.navigate('LibraryTab', {
                screen: 'LibraryHome',
                params: { initialTab: 'reading' },
              })
            }
            onPressBook={(book) => navigation.navigate('BookDetail', { book: book.detailBook })}
          />
        ) : !isWaitingReviewBooksLoading && waitingReviewBooks.length === 0 ? (
          <ReadingBooksEmptySection onPressAddBooks={() => navigation.navigate('SearchTab')} />
        ) : null}

        {isWaitingReviewBooksLoading ? (
          <View style={styles.readingLoadingWrap}>
            <ActivityIndicator size="small" color="#F5C24B" />
          </View>
        ) : waitingReviewBooks.length > 0 ? (
          <HorizontalBookSection
            title="리뷰를 기다리는 책"
            books={waitingReviewBooks}
            onPressSeeMore={() =>
              navigation.navigate('LibraryTab', {
                screen: 'LibraryHome',
                params: { initialTab: 'done' },
              })
            }
            onPressBook={(book) => navigation.navigate('BookDetail', { book: book.detailBook })}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function RbtiBar({ item }: { item: RbtiAxis }) {
  const previousFillPercent = item.previousFillPercent;
  const shouldShowDecreaseTrail =
    typeof previousFillPercent === 'number' && previousFillPercent > item.fillPercent;

  return (
    <View style={styles.rbtiRow}>
      <View style={styles.rbtiTrack}>
        <View style={styles.rbtiLabelBox}>
          <Text style={styles.rbtiLabel}>{item.label}</Text>
        </View>

        <View style={styles.rbtiProgressTrack}>
          {shouldShowDecreaseTrail && (
            <View
              style={[
                styles.rbtiPreviousFill,
                {
                  width: `${previousFillPercent}%`,
                },
              ]}
            />
          )}
          <View
            style={[
              styles.rbtiFill,
              {
                width: `${item.fillPercent}%`,
              },
            ]}
          />
          <Text style={styles.rbtiValue}>
            {item.valueText}
            {!!item.deltaText && (
              <Text
                style={[
                  styles.rbtiDeltaValue,
                  item.deltaDirection === 'increase' && styles.rbtiDeltaIncrease,
                  item.deltaDirection === 'decrease' && styles.rbtiDeltaDecrease,
                ]}
              >
                {item.deltaText}
              </Text>
            )}
          </Text>
        </View>
      </View>
    </View>
  );
}

function HorizontalBookSection({
  title,
  books,
  onPressSeeMore,
  onPressBook,
}: {
  title: string;
  books: HomeBookCardItem[];
  onPressSeeMore: () => void;
  onPressBook?: (book: HomeBookCardItem) => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Pressable onPress={onPressSeeMore} hitSlop={10}>
          <Text style={styles.seeMoreText}>See more</Text>
        </Pressable>
      </View>

      <FlatList
        data={books}
        horizontal
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={[styles.bookCardWrap, index === books.length - 1 && styles.lastCardWrap]}>
            <HomeBookCard item={item} onPress={onPressBook ? () => onPressBook(item) : undefined} />
          </View>
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalListContent}
      />
    </View>
  );
}

function HomeBookCard({ item, onPress }: { item: HomeBookCardItem; onPress?: () => void }) {
  return (
    <LibraryBookCard book={item} onPress={onPress} />
  );
}

function ReadingBooksEmptySection({ onPressAddBooks }: { onPressAddBooks: () => void }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>읽고 있는 책</Text>
      </View>

      <View style={styles.readingEmptyBox}>
        <Text style={styles.readingEmptyTitle}>읽고 있는 책이 없어요.</Text>
        <Text style={styles.readingEmptyDescription}>읽고 있는 책을 등록해 주세요!</Text>

        <Pressable style={styles.addBooksButton} onPress={onPressAddBooks}>
          <Text style={styles.addBooksButtonText}>Add books</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    paddingTop: 14,
    paddingBottom: 120,
  },

  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2025',
  },
  sectionHeaderRow: {
    paddingHorizontal: 26,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeMoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F19B25',
  },

  rbtiBox: {
    paddingHorizontal: 26,
    marginTop: 12,
  },
  rbtiSectionTitle: {
    paddingHorizontal: 26,
  },
  rbtiRow: {
    marginBottom: 10,
  },
  rbtiTrack: {
    height: 32,
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  rbtiLabelBox: {
    width: 96,
    backgroundColor: '#ffce65',
    justifyContent: 'center',
    paddingLeft: 14,
  },
  rbtiProgressTrack: {
    flex: 1,
    backgroundColor: '#fff0db',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rbtiFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#ffce65',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  rbtiPreviousFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#ffe2a1',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  rbtiLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  rbtiValue: {
    position: 'absolute',
    right: 14,
    fontSize: 12,
    fontWeight: '700',
    color: '#E67F1E',
  },
  rbtiDeltaValue: {
    marginLeft: 2,
    color: '#1F2025',
  },
  rbtiDeltaIncrease: {
    color: '#D84B3F',
  },
  rbtiDeltaDecrease: {
    color: '#3F6FD8',
  },
  rbtiEmptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#8B909B',
  },

  horizontalListContent: {
    paddingLeft: 26,
    paddingRight: 10,
  },
  readingLoadingWrap: {
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  readingEmptyBox: {
    marginHorizontal: 26,
    borderRadius: 16,
    backgroundColor: '#fdf6ec',
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  readingEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2025',
    marginTop: 10,
    marginBottom: 8,
  },
  readingEmptyDescription: {
    fontSize: 13,
    color: '#8B909B',
    marginBottom: 28,
    textAlign: 'center',
    lineHeight: 19,
  },
  addBooksButton: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    backgroundColor: '#FEC54B',
    borderRadius: 20,
  },
  addBooksButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  bookCardWrap: {
    width: 186,
    marginRight: 14,
  },
  lastCardWrap: {
    marginRight: 26,
  },
});
