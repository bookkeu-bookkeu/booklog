import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SearchStackParamList } from '../../navigation/types';
import { importBookByIsbn13 } from '../../api/books';
import { createReview, deleteReview, getBookReviews, updateReview } from '../../api/reviews';
import BookSummaryCard from '../../components/BookSummaryCard';

type Props = NativeStackScreenProps<SearchStackParamList, 'BookReviewCreate'>;

const STAR_COUNT = 5;
const REVIEW_INPUT_MIN_HEIGHT = 112;

export default function ReviewCreateScreen({ navigation, route }: Props) {
  const book = route?.params?.book;
  const [rating, setRating] = useState(0);
  const [starRowWidth, setStarRowWidth] = useState(0);
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');
  const [content, setContent] = useState('');
  const [contentHeight, setContentHeight] = useState(REVIEW_INPUT_MIN_HEIGHT);
  const [isSaving, setIsSaving] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);

  const stars = useMemo(() => Array.from({ length: STAR_COUNT }, (_, index) => index + 1), []);
  const bookTitle = useMemo(() => (book?.title ?? '').trim() || '책 제목', [book?.title]);
  const bookAuthor = useMemo(() => {
    if (Array.isArray(book?.authors) && book.authors.length > 0) {
      return book.authors.join(', ');
    }

    return '지은이';
  }, [book?.authors]);
  const bookPublisher = useMemo(() => (book?.publisher ?? '').trim() || '출판사', [book?.publisher]);
  const bookThumbnail = useMemo(() => {
    if (typeof book?.thumbnail === 'string' && book.thumbnail.trim()) {
      return book.thumbnail.trim();
    }

    return '';
  }, [book?.thumbnail]);

  const updateRatingFromX = (x: number) => {
    if (!starRowWidth) {
      return;
    }

    if (x <= 0) {
      setRating(0);
      return;
    }

    const next = Math.min(STAR_COUNT, Math.max(1, Math.ceil((x / starRowWidth) * STAR_COUNT)));
    setRating(next);
  };

  const resolveBookId = async () => {
    const rawExternalId = `${book?.external_api_id ?? ''}`.trim();
    if (/^\d+$/.test(rawExternalId)) {
      return Number(rawExternalId);
    }

    const isbn13 =
      typeof book?.isbn13 === 'string' && book.isbn13.trim()
        ? book.isbn13.trim()
        : typeof book?.isbn === 'string' && book.isbn.trim()
        ? book.isbn
            .trim()
            .split(' ')
            .find((part) => part.length === 13 && /^\d+$/.test(part)) ?? ''
        : '';

    if (!isbn13) {
      return null;
    }

    const imported = await importBookByIsbn13(isbn13);
    return imported.id;
  };

  useEffect(() => {
    let isMounted = true;

    const loadMyReview = async () => {
      try {
        const bookId = await resolveBookId();
        if (!bookId) {
          return;
        }

        const mine = await getBookReviews(bookId, { mine: true });
        const review = mine[0];

        if (!review || !isMounted) {
          return;
        }

        setEditingReviewId(review.id);
        setRating(review.rating);
        setVisibility(review.visibility);
        setContent(review.content ?? '');
      } catch (error) {
        console.log('내 리뷰 조회 실패', error);
      }
    };

    void loadMyReview();

    return () => {
      isMounted = false;
    };
  }, [book?.external_api_id, book?.isbn13, book?.isbn]);

  const handleSubmit = async () => {
    if (isSaving) {
      return;
    }

    const trimmedContent = content.trim();

    if (editingReviewId && !rating && !trimmedContent) {
      Alert.alert('알림', '삭제하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            void handleDeleteReview(editingReviewId);
          },
        },
      ]);
      return;
    }

    if (!rating) {
      Alert.alert('알림', '별점을 선택해주세요.');
      return;
    }

    if (!trimmedContent) {
      Alert.alert('알림', '리뷰 내용을 입력해주세요.');
      return;
    }

    try {
      setIsSaving(true);

      const bookId = await resolveBookId();
      if (!bookId) {
        Alert.alert('알림', '책 정보를 확인할 수 없어 저장하지 못했습니다.');
        return;
      }

      if (editingReviewId) {
        await updateReview(editingReviewId, {
          rating,
          content: trimmedContent,
          visibility,
        });
      } else {
        await createReview({
          book_id: bookId,
          rating,
          content: trimmedContent,
          visibility,
        });
      }

      navigation.goBack();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      if (typeof detail === 'string' && detail.trim()) {
        Alert.alert('알림', detail);
        return;
      }

      Alert.alert('알림', '리뷰를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      await deleteReview(reviewId);
      navigation.goBack();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      if (typeof detail === 'string' && detail.trim()) {
        Alert.alert('알림', detail);
        return;
      }

      Alert.alert('알림', '리뷰를 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable
            hitSlop={12}
            style={styles.backButton}
            onPress={() => navigation?.goBack?.()}
          >
            <Ionicons name="chevron-back" size={28} color="#FEC54B" />
          </Pressable>

          <Text style={styles.headerTitle}>내 리뷰</Text>

          <View style={styles.headerRightSpace} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
            <View style={styles.bookCard}>
              <BookSummaryCard
                title={bookTitle}
                author={bookAuthor}
                publisher={bookPublisher}
                thumbnail={bookThumbnail}
                variant="form"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.mainHeadline}>완독을 축하드립니다!</Text>
              <Text style={styles.subHeadline}>이 책은 어떠셨나요? 리뷰를 남겨주세요.</Text>

              <View
                style={styles.starRow}
                onLayout={(e) => setStarRowWidth(e.nativeEvent.layout.width)}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={(e) => updateRatingFromX(e.nativeEvent.locationX)}
                onResponderMove={(e) => updateRatingFromX(e.nativeEvent.locationX)}
              >
                {stars.map((star) => {
                  const filled = star <= rating;
                  return (
                    <Pressable
                      key={star}
                      style={styles.starButton}
                      hitSlop={6}
                      onPress={() => setRating(star)}
                    >
                      <Ionicons
                        name={filled ? 'star' : 'star-outline'}
                        size={26}
                        color={filled ? '#FEC54B' : '#D4D6DD'}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>공개 설정</Text>

              <View style={styles.visibilityRow}>
                <Pressable
                  style={[
                    styles.visibilityChip,
                    visibility === 'public' ? styles.visibilityChipActiveLight : styles.visibilityChipInactiveLight,
                  ]}
                  onPress={() => setVisibility('public')}
                >
                  <Text
                    style={[
                      styles.visibilityChipText,
                      visibility === 'public'
                        ? styles.visibilityChipTextDark
                        : styles.visibilityChipTextMuted,
                    ]}
                  >
                    공개
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.visibilityChip,
                    visibility === 'private' ? styles.visibilityChipActive : styles.visibilityChipInactive,
                  ]}
                  onPress={() => setVisibility('private')}
                >
                  <Text
                    style={[
                      styles.visibilityChipText,
                      visibility === 'private'
                        ? styles.visibilityChipTextWhite
                        : styles.visibilityChipTextMuted,
                    ]}
                  >
                    비공개
                  </Text>
                </Pressable>
              </View>
            </View>

            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="인상깊은 구절을 자유롭게 작성해보세요."
              placeholderTextColor="#A4A7B0"
              multiline
              textAlignVertical="top"
              scrollEnabled={false}
              style={[styles.reviewInput, { height: contentHeight }]}
              onContentSizeChange={(e) => {
                const measuredHeight = Math.max(
                  REVIEW_INPUT_MIN_HEIGHT,
                  e.nativeEvent.contentSize.height
                );
                setContentHeight((prev) => (prev === measuredHeight ? prev : measuredHeight));
              }}
            />
          </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={isSaving}>
            <Text style={styles.submitButtonText}>{isSaving ? '저장 중...' : '완료하기'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F3F3',
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F3F3F3',
    position: 'relative',
  },
  header: {
    height: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#24262B',
  },
  headerRightSpace: {
    width: 36,
    height: 36,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  bookCard: {
    marginTop: 6,
    marginBottom: 28,
  },
  section: {
    marginBottom: 22,
  },
  mainHeadline: {
    fontSize: 18,
    fontWeight: '800',
    color: '#24262B',
    marginBottom: 8,
  },
  subHeadline: {
    fontSize: 14,
    lineHeight: 20,
    color: '#7A7D86',
    marginBottom: 18,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  starButton: {
    marginRight: 4,
    padding: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#24262B',
    marginBottom: 12,
  },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  visibilityChip: {
    minWidth: 50,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  visibilityChipActiveLight: {
    backgroundColor: '#FEC54B',
  },
  visibilityChipInactiveLight: {
    backgroundColor: '#FFF6EA',
  },
  visibilityChipActive: {
    backgroundColor: '#FEC54B',
  },
  visibilityChipInactive: {
    backgroundColor: '#FFF6EA',
  },
  visibilityChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  visibilityChipTextDark: {
    color: '#ffffff',
  },
  visibilityChipTextWhite: {
    color: '#FFFFFF',
  },
  visibilityChipTextMuted: {
    color: '#FEC54B',
  },
  reviewInput: {
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#CBCDD4',
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    fontSize: 14,
    lineHeight: 20,
    color: '#24262B',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 34,
    backgroundColor: '#F3F3F3',
  },
  submitButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FEC54B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
