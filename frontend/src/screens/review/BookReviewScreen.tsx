import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SearchStackParamList } from '../../navigation/types';
import { importBookByIsbn13 } from '../../api/books';
import {
  BookRbtiFilterOption,
  getBookRbtiFilters,
  getBookReviews,
  getLikedReviews,
  GetBookReviewsOptions,
  likeReview,
  ReviewItem,
  unlikeReview,
} from '../../api/reviews';

type Props = NativeStackScreenProps<SearchStackParamList, 'BookReview'>;

type ReviewFilter = {
  id: string;
  label: string;
  options?: GetBookReviewsOptions;
};

const DEFAULT_FILTERS: ReviewFilter[] = [{ id: 'all', label: '전체' }];

export default function BookReviewScreen({ navigation, route }: Props) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [bookId, setBookId] = useState<number | null>(null);
  const [myReviewIds, setMyReviewIds] = useState<number[]>([]);
  const [likedReviewIds, setLikedReviewIds] = useState<number[]>([]);
  const [pendingLikeIds, setPendingLikeIds] = useState<number[]>([]);
  const [filters, setFilters] = useState<ReviewFilter[]>(DEFAULT_FILTERS);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>('');

  const selectedRbtiCode = useMemo(() => {
    return (
      filters.find((filter) => filter.id === selectedFilter)?.options?.rbtiCode ?? ''
    );
  }, [filters, selectedFilter]);

  const buildRbtiFilters = (options: BookRbtiFilterOption[]): ReviewFilter[] => {
    const rbtiFilters = options
      .map((option) => ({
        id: `rbti-${option.code}`,
        label: option.name,
        options: { rbtiCode: option.code },
      }));

    return [...DEFAULT_FILTERS, ...rbtiFilters];
  };

  useEffect(() => {
    if (!filters.some((filter) => filter.id === selectedFilter)) {
      setSelectedFilter('all');
    }
  }, [filters, selectedFilter]);

  useEffect(() => {
    let mounted = true;

    const resolveBookId = async () => {
      const book = route.params?.book;
      const isbnRaw =
        typeof book?.isbn13 === 'string' && book.isbn13.trim()
          ? book.isbn13.trim()
          : typeof book?.isbn === 'string' && book.isbn.trim()
          ? book.isbn
              .trim()
              .split(' ')
              .find((part) => part.length === 13 && /^\d+$/.test(part)) ?? ''
          : '';

      if (!isbnRaw) {
        if (mounted) {
          setLoadError('책 정보를 불러오지 못했습니다.');
          setIsLoading(false);
        }
        return;
      }

      try {
        const imported = await importBookByIsbn13(isbnRaw);
        if (mounted) {
          setBookId(imported.id);
        }
      } catch (error) {
        console.log('리뷰 화면 book_id 조회 실패', error);
        if (mounted) {
          setLoadError('리뷰 정보를 불러오지 못했습니다.');
          setIsLoading(false);
        }
      }
    };

    resolveBookId();

    return () => {
      mounted = false;
    };
  }, [route.params]);

  useEffect(() => {
    let mounted = true;

    const fetchFilters = async () => {
      if (!bookId) {
        return;
      }

      try {
        const rbtiOptions = await getBookRbtiFilters(bookId);

        if (mounted) {
          setFilters(buildRbtiFilters(rbtiOptions));
        }
      } catch (error) {
        console.log('RBTI 필터 조회 실패', error);
        if (mounted) {
          setFilters(DEFAULT_FILTERS);
        }
      }
    };

    fetchFilters();

    return () => {
      mounted = false;
    };
  }, [bookId]);

  useEffect(() => {
    let mounted = true;

    const fetchLikedReviewIds = async () => {
      try {
        const likedReviews = await getLikedReviews();
        if (mounted) {
          setLikedReviewIds(likedReviews.map((item) => item.id));
        }
      } catch (error) {
        console.log('좋아요한 리뷰 목록 조회 실패', error);
        if (mounted) {
          setLikedReviewIds([]);
        }
      }
    };

    void fetchLikedReviewIds();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchMyReviews = async () => {
      if (!bookId) {
        return;
      }

      try {
        const mine = await getBookReviews(bookId, { mine: true });
        if (mounted) {
          setMyReviewIds(mine.map((item) => item.id));
        }
      } catch (error) {
        console.log('내 리뷰 목록 조회 실패', error);
        if (mounted) {
          setMyReviewIds([]);
        }
      }
    };

    void fetchMyReviews();

    return () => {
      mounted = false;
    };
  }, [bookId]);

  useEffect(() => {
    let mounted = true;

    const fetchReviews = async () => {
      if (!bookId) {
        return;
      }

      setIsLoading(true);
      setLoadError('');

      try {
        const reviewResponse = await getBookReviews(
          bookId,
          selectedRbtiCode ? { rbtiCode: selectedRbtiCode } : undefined
        );

        if (mounted) {
          setReviews(reviewResponse);
        }
      } catch (error) {
        console.log('리뷰 목록 조회 실패', error);
        if (mounted) {
          setLoadError('리뷰 목록을 불러오지 못했습니다.');
          setReviews([]);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchReviews();

    return () => {
      mounted = false;
    };
  }, [bookId, selectedRbtiCode]);

  const handleToggleLike = async (reviewId: number) => {
    if (myReviewIds.includes(reviewId) || pendingLikeIds.includes(reviewId)) {
      return;
    }

    const wasLiked = likedReviewIds.includes(reviewId);

    setPendingLikeIds((prev) => [...prev, reviewId]);
    setLikedReviewIds((prev) => (
      wasLiked ? prev.filter((id) => id !== reviewId) : [...prev, reviewId]
    ));
    setReviews((prev) => (
      prev.map((review) => (
        review.id === reviewId
          ? {
              ...review,
              like_count: Math.max(review.like_count + (wasLiked ? -1 : 1), 0),
            }
          : review
      ))
    ));

    try {
      const response = wasLiked
        ? await unlikeReview(reviewId)
        : await likeReview(reviewId);

      setLikedReviewIds((prev) => {
        const hasId = prev.includes(reviewId);

        if (response.liked && !hasId) {
          return [...prev, reviewId];
        }

        if (!response.liked && hasId) {
          return prev.filter((id) => id !== reviewId);
        }

        return prev;
      });
      setReviews((prev) => (
        prev.map((review) => (
          review.id === reviewId
            ? { ...review, like_count: response.like_count }
            : review
        ))
      ));
    } catch (error) {
      console.log('리뷰 좋아요 처리 실패', error);
      setLikedReviewIds((prev) => (
        wasLiked
          ? (prev.includes(reviewId) ? prev : [...prev, reviewId])
          : prev.filter((id) => id !== reviewId)
      ));
      setReviews((prev) => (
        prev.map((review) => (
          review.id === reviewId
            ? {
                ...review,
                like_count: Math.max(review.like_count + (wasLiked ? 1 : -1), 0),
              }
            : review
        ))
      ));
    } finally {
      setPendingLikeIds((prev) => prev.filter((id) => id !== reviewId));
    }
  };

  const headerTitle = route.params?.book?.title?.trim() || '책 리뷰';

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#F2B43C" />
        </Pressable>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {headerTitle}
        </Text>

        <View style={styles.headerRight} />
      </View>

      <View style={styles.filterWrap}>
        {filters.map((filter) => {
          const active = selectedFilter === filter.id;

          return (
            <Pressable
              key={filter.id}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setSelectedFilter(filter.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      {isLoading ? (
        <>
          <Text style={styles.emptyTitle}>리뷰를 불러오는 중이에요</Text>
          <Text style={styles.emptyDescription}>잠시만 기다려주세요.</Text>
        </>
      ) : loadError ? (
        <>
          <Text style={styles.emptyTitle}>리뷰를 불러오지 못했어요</Text>
          <Text style={styles.emptyDescription}>{loadError}</Text>
        </>
      ) : (
        <>
          <Text style={styles.emptyTitle}>등록된 리뷰가 없어요</Text>
          <Text style={styles.emptyDescription}>첫 리뷰를 남겨보세요.</Text>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={reviews}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ReviewCard
            item={item}
            isMine={myReviewIds.includes(item.id)}
            isLiked={likedReviewIds.includes(item.id)}
            isLikePending={pendingLikeIds.includes(item.id)}
            onPressMine={() => navigation.navigate('BookReviewCreate', { book: route.params?.book })}
            onToggleLike={() => handleToggleLike(item.id)}
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

function ReviewCard({
  item,
  isMine,
  isLiked,
  isLikePending,
  onPressMine,
  onToggleLike,
}: {
  item: ReviewItem;
  isMine: boolean;
  isLiked: boolean;
  isLikePending: boolean;
  onPressMine: () => void;
  onToggleLike: () => void;
}) {
  const Wrapper = isMine ? Pressable : View;

  return (
    <Wrapper style={styles.reviewCard} onPress={isMine ? onPressMine : undefined}>
      <View style={styles.avatar}>
        <Ionicons name="person" size={18} color="#D8A252" />
      </View>

      <View style={styles.reviewTextArea}>
        <Text style={styles.nickname}>{item.user_nickname || '닉네임'}</Text>
        <Text style={styles.reviewContent}>{item.content}</Text>
      </View>

      {!isMine ? (
        <Pressable
          style={({ pressed }) => [
            styles.likeButton,
            isLiked && styles.likeButtonActive,
            pressed && styles.likeButtonPressed,
          ]}
          onPress={onToggleLike}
          disabled={isLikePending}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={isLiked ? '리뷰 좋아요 취소' : '리뷰 좋아요'}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={18}
            color={isLiked ? '#FFFFFF' : '#F26B6B'}
          />
          <Text style={[styles.likeCount, isLiked && styles.likeCountActive]}>
            {item.like_count}
          </Text>
        </Pressable>
      ) : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  contentContainer: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 40,
    flexGrow: 1,
  },
  header: {
    height: 56,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    color: '#24262B',
  },
  headerRight: {
    width: 28,
  },
  filterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  filterChip: {
    backgroundColor: '#FFF6EA',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterChipActive: {
    backgroundColor: '#FEC54B',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E67F1E',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  reviewCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F9DFC0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  reviewTextArea: {
    flex: 1,
    paddingRight: 10,
  },
  nickname: {
    fontSize: 14,
    fontWeight: '700',
    color: '#31343A',
    marginBottom: 2,
  },
  reviewContent: {
    fontSize: 13,
    lineHeight: 19,
    color: '#666A73',
  },
  likeButton: {
    minWidth: 48,
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FFF2F2',
    borderWidth: 1,
    borderColor: '#FFD8D8',
  },
  likeButtonActive: {
    backgroundColor: '#F26B6B',
    borderColor: '#F26B6B',
  },
  likeButtonPressed: {
    opacity: 0.75,
  },
  likeCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F26B6B',
  },
  likeCountActive: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#24262B',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 13,
    color: '#8B909B',
  },
});
