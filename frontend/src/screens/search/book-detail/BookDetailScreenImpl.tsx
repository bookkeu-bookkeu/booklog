import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Book, SearchStackParamList } from '../../../navigation/types';
import {
  getExternalBookDetailByIsbn,
  importBookByIsbn13,
  addBookToLibrary,
  removeBookFromLibrary,
  updateLibraryBook,
  updateLibraryBookShelf,
  getMyLibraryBooks,
  UpdateLibraryBookPayload,
  UserLibraryBook,
} from '../../../api/books';
import {
  BookTopPositiveRbti,
  getBookReviews,
  getBookTopPositiveRbti,
  getQuoteNotes,
  QuoteNoteItem,
  ReviewItem,
} from '../../../api/reviews';
import { getCurrentUserRbti } from '../../../api/rbti';
import { OPPOSITE_RBTI_CODE, RBTI_TYPE_CHIPS } from './constants';
import {
  getAuthorText,
  getBookIsbn13,
  getIsbnText,
  getPublishedYear,
  getPublisherText,
} from './helpers';
import InfoSheetModal from './InfoSheetModal';
import RecordActionModal from './RecordActionModal';
import BottomActionButton from '../../../components/BottomActionButton';
import { styles } from './styles';

type SearchStackWithBookDetail = SearchStackParamList & {
  BookDetail: {
    book: Book;
  };
};

type Props = NativeStackScreenProps<SearchStackWithBookDetail, 'BookDetail'>;

const DEFAULT_COVER_SIZE = { width: 132, height: 174 };
const MAX_COVER_SIZE = { width: 220, height: 320 };

function getScaledCoverSize(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return DEFAULT_COVER_SIZE;
  }

  const scale = Math.min(
    1,
    MAX_COVER_SIZE.width / width,
    MAX_COVER_SIZE.height / height
  );

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

export default function BookDetailScreen({ navigation, route }: Props) {
  const book = route.params.book;
  const bookIsbn13 = getBookIsbn13(book);
  const { bottom: bottomInset } = useSafeAreaInsets();

  const [infoSheetVisible, setInfoSheetVisible] = useState(false);
  const [bookDescriptionText, setBookDescriptionText] = useState<string>('');
  const [bookMetadata, setBookMetadata] = useState<Partial<Book>>({});
  const [selectedRbtiCode, setSelectedRbtiCode] = useState<string>('');
  const [previewReviews, setPreviewReviews] = useState<ReviewItem[]>([]);
  const [userLibraryBook, setUserLibraryBook] = useState<UserLibraryBook | null>(null);
  const [recordActionSheetVisible, setRecordActionSheetVisible] = useState(false);
  const [isAddLoading, setIsAddLoading] = useState(false);
  const [isRecordSaving, setIsRecordSaving] = useState(false);
  const [startedDate, setStartedDate] = useState<string>('');
  const [finishedDate, setFinishedDate] = useState<string>('');
  const [bookType, setBookType] = useState<string>('종이책');
  const [importedBookId, setImportedBookId] = useState<number | null>(null);
  const [quoteNotes, setQuoteNotes] = useState<QuoteNoteItem[]>([]);
  const [myReview, setMyReview] = useState<ReviewItem | null>(null);
  const [topPositiveRbti, setTopPositiveRbti] = useState<BookTopPositiveRbti | null>(null);
  const [draftRating, setDraftRating] = useState(0);
  const [coverSize, setCoverSize] = useState(DEFAULT_COVER_SIZE);

  const thumbnail =
    typeof (book as any).thumbnail_url === 'string' && (book as any).thumbnail_url.trim()
      ? (book as any).thumbnail_url.trim()
      : typeof (book as any).thumbnail === 'string' && (book as any).thumbnail.trim()
      ? (book as any).thumbnail.trim()
      : '';

  const title = (book.title || '').trim() || '제목 없음';
  const author = getAuthorText(book);
  const publisher = getPublisherText(book);
  const isbn = getIsbnText(book);
  const publishedYear = getPublishedYear((book as any).published_date);
  const category = getCategoryText(
    bookMetadata.category ?? (book as any).category,
    bookMetadata.kdc ?? (book as any).kdc
  );
  const description = useMemo(() => {
    if (bookDescriptionText.trim()) {
      return bookDescriptionText.trim();
    }

    if (typeof (book as any).contents === 'string' && (book as any).contents.trim()) {
      return (book as any).contents.trim();
    }

    if (typeof (book as any).description === 'string' && (book as any).description.trim()) {
      return (book as any).description.trim();
    }

    return '책 소개 정보가 아직 없습니다.';
  }, [book, bookDescriptionText]);

  useEffect(() => {
    if (!thumbnail) {
      setCoverSize(DEFAULT_COVER_SIZE);
      return;
    }

    Image.getSize(
      thumbnail,
      (width, height) => {
        setCoverSize(getScaledCoverSize(width, height));
      },
      () => {
        setCoverSize(DEFAULT_COVER_SIZE);
      }
    );
  }, [thumbnail]);

  const findExistingLibraryBook = async () => {
    if (!bookIsbn13) {
      return null;
    }

    const libraryBooks = await getMyLibraryBooks();
    return (
      libraryBooks.find(
        (lib) => normalizeIsbn(lib.book_isbn13) === normalizeIsbn(bookIsbn13)
      ) ?? null
    );
  };

  const fetchQuoteNotes = async (bookId: number) => {
    try {
      const notes = await getQuoteNotes(bookId);
      setQuoteNotes(notes);
    } catch (error) {
      console.log('필사 노트 조회 실패', error);
      setQuoteNotes([]);
    }
  };

  const fetchMyReview = async (bookId: number) => {
    try {
      const mine = await getBookReviews(bookId, { mine: true });
      setMyReview(mine[0] ?? null);
    } catch (error) {
      console.log('내 리뷰 조회 실패', error);
      setMyReview(null);
    }
  };

  const fetchTopPositiveRbti = async (bookId: number) => {
    try {
      const response = await getBookTopPositiveRbti(bookId);
      setTopPositiveRbti(response.top_rbti);
    } catch (error) {
      console.log('책별 긍정 RBTI 조회 실패', error);
      setTopPositiveRbti(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchDetailAndReview = async () => {
      const isbnRaw = bookIsbn13;

      if (!isbnRaw) {
        return;
      }

      try {
        const foundBook = await findExistingLibraryBook();
        if (foundBook && mounted) {
          setUserLibraryBook(foundBook);
        }
      } catch (error) {
        console.log('사용자 서재 조회 실패', error);
      }

      try {
        const externalDetail = await getExternalBookDetailByIsbn(isbnRaw);
        if (mounted) {
          setBookMetadata(externalDetail);
          setBookDescriptionText(
            typeof externalDetail.contents === 'string' ? externalDetail.contents : ''
          );
        }
      } catch (error) {
        console.log('책 상세 조회 실패', error);
      }

      try {
        const importedBook = await importBookByIsbn13(isbnRaw);
        if (mounted) {
          setImportedBookId(importedBook.id);
          setBookMetadata((prev) => mergeBookMetadata(prev, importedBook));
        }
        await fetchQuoteNotes(importedBook.id);
        await fetchMyReview(importedBook.id);
        await fetchTopPositiveRbti(importedBook.id);
        let oppositeCode = '';

        try {
          const currentRbti = await getCurrentUserRbti();
          const currentCode =
            currentRbti.current_rbti?.rbti_code?.trim().toUpperCase() ?? '';

          if (currentRbti.has_rbti && currentCode && OPPOSITE_RBTI_CODE[currentCode]) {
            oppositeCode = OPPOSITE_RBTI_CODE[currentCode];
          }
        } catch (error) {
          console.log('현재 사용자 RBTI 조회 실패', error);
        }

        try {
          const reviews = await getBookReviews(
            importedBook.id,
            oppositeCode ? { rbtiCode: oppositeCode } : undefined
          );

          if (mounted) {
            setSelectedRbtiCode(oppositeCode);
            setPreviewReviews(reviews.slice(0, 2));
          }
        } catch (reviewError) {
          console.log('리뷰 조회 실패:', reviewError);
          if (mounted) {
            setPreviewReviews([]);
            setSelectedRbtiCode(oppositeCode);
          }
        }
      } catch (error) {
        console.log('책 import 실패', error);
      }
    };

    fetchDetailAndReview();

    return () => {
      mounted = false;
    };
  }, [book, bookIsbn13]);

  useFocusEffect(
    React.useCallback(() => {
      if (importedBookId) {
        void fetchQuoteNotes(importedBookId);
        void fetchMyReview(importedBookId);
        void fetchTopPositiveRbti(importedBookId);
      }
    }, [importedBookId])
  );

  useEffect(() => {
    setStartedDate(formatDateLabel(userLibraryBook?.started_at));
    setFinishedDate(formatDateLabel(userLibraryBook?.finished_at));

    if (userLibraryBook?.book_type) {
      setBookType(userLibraryBook.book_type);
    }

  }, [book, userLibraryBook]);



  const persistRecordFields = async (payload: UpdateLibraryBookPayload) => {
    if (!userLibraryBook) {
      return;
    }

    try {
      setIsRecordSaving(true);
      const updated = await updateLibraryBook(userLibraryBook.id, payload);
      setUserLibraryBook(updated);
    } catch (error) {
      console.log('기록 저장 실패', error);
    } finally {
      setIsRecordSaving(false);
    }
  };

  const bottomSolidHeight = 55 + bottomInset;
  const bottomFadeHeight = 120;
  const bottomFadeBottom = bottomSolidHeight - 35;

  const handleAddOrRemoveBook = async () => {
    if (isAddLoading) return;

    const isbnRaw = bookIsbn13;

    if (!isbnRaw) {
      Alert.alert('알림', 'ISBN 정보가 없는 도서라 추가할 수 없습니다.');
      return;
    }

    try {
      setIsAddLoading(true);

      if (userLibraryBook) {
        await removeBookFromLibrary(userLibraryBook.id);
        setUserLibraryBook(null);
      } else {
        const existing = await findExistingLibraryBook();
        if (existing) {
          setUserLibraryBook(existing);
          setRecordActionSheetVisible(true);
          return;
        }

        const importedBook = await importBookByIsbn13(isbnRaw);
        const added = await addBookToLibrary(importedBook.id, 'WANT');
        setUserLibraryBook(added);
      }
    } catch (error) {
      console.log('책 추가/제거 실패', error);
      Alert.alert('알림', '도서 상태를 변경하지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsAddLoading(false);
    }
  };

  const handleMarkAsReading = async () => {
    if (!userLibraryBook || isAddLoading) {
      return;
    }

    try {
      setIsAddLoading(true);
      const todayDateString = toCalendarDateStringFromDate(new Date());
      const updatedBook = await updateLibraryBook(userLibraryBook.id, {
        shelf_code: 'READING',
        started_at: todayDateString,
        finished_at: null,
      });
      setUserLibraryBook(updatedBook);
      const todayLabel = formatDateLabelFromCalendar(todayDateString);
      setStartedDate(todayLabel);
      setFinishedDate('');
      setRecordActionSheetVisible(false);
    } catch (error) {
      console.log('읽는 중 상태 변경 실패', error);
    } finally {
      setIsAddLoading(false);
    }
  };

  const handleMarkAsDone = async () => {
    if (!userLibraryBook || isAddLoading) {
      return;
    }

    try {
      setIsAddLoading(true);
      const todayDateString = toCalendarDateStringFromDate(new Date());
      const updatedBook = await updateLibraryBook(userLibraryBook.id, {
        shelf_code: 'DONE',
        finished_at: todayDateString,
      });
      setUserLibraryBook(updatedBook);
      const todayLabel = formatDateLabelFromCalendar(todayDateString);
      setFinishedDate(todayLabel);
      setRecordActionSheetVisible(false);
    } catch (error) {
      console.log('완료 상태 변경 실패', error);
    } finally {
      setIsAddLoading(false);
    }
  };

  const handleRemoveFromShelf = async () => {
    if (!userLibraryBook || isAddLoading) {
      return;
    }

    try {
      setIsAddLoading(true);
      await removeBookFromLibrary(userLibraryBook.id);
      setUserLibraryBook(null);
      setRecordActionSheetVisible(false);
    } catch (error) {
      console.log('책장 제거 실패', error);
      Alert.alert('알림', '책장에서 제거하지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsAddLoading(false);
    }
  };

  const selectBookType = () => {
    const saveType = (type: string) => {
      setBookType(type);
      if (type !== (userLibraryBook?.book_type ?? '')) {
        void persistRecordFields({ book_type: type });
      }
    };

    Alert.alert('종류', '책 종류를 선택하세요.', [
      { text: '종이책', onPress: () => saveType('종이책') },
      { text: '전자책', onPress: () => saveType('전자책') },
      { text: '오디오북', onPress: () => saveType('오디오북') },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const isReadingOrDone =
    userLibraryBook?.shelf_code === 'READING' || userLibraryBook?.shelf_code === 'DONE';
  const isReadingStatus = userLibraryBook?.shelf_code === 'READING';
  const isDoneStatus = userLibraryBook?.shelf_code === 'DONE';
  const hasQuoteNotes = quoteNotes.length > 0;
  const statusLabel = userLibraryBook?.shelf_code === 'DONE' ? '완료' : '읽는 중';

  const handleCompactDateChange = (target: 'start' | 'finish', nextDate?: Date) => {
    if (!nextDate) {
      return;
    }

    const label = formatDateLabelFromCalendar(toCalendarDateStringFromDate(nextDate));
    if (!label) {
      return;
    }

    if (target === 'start') {
      setStartedDate(label);
      void persistRecordFields({ started_at: toApiDateString(label) });
      return;
    }

    setFinishedDate(label);
    void persistRecordFields({ finished_at: toApiDateString(label) });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerScrollSection}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#F2B43C" />
          </Pressable>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>

          <View style={styles.headerRight} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.coverCard}>
            <View
              style={[
                styles.coverImageWrap,
                { width: coverSize.width, height: coverSize.height },
              ]}
            >
              {thumbnail ? (
                <Image
                  source={{ uri: thumbnail }}
                  style={[
                    styles.coverImage,
                    { width: coverSize.width, height: coverSize.height },
                  ]}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.coverPlaceholder,
                    { width: coverSize.width, height: coverSize.height },
                  ]}
                >
                  <Ionicons name="image-outline" size={34} color="#F3C57D" />
                </View>
              )}
            </View>

            <Text style={styles.coverTitle} numberOfLines={2}>
              {title}
            </Text>
            <Text style={styles.coverAuthor} numberOfLines={1}>
              {author || '지은이'}
            </Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>내 기록</Text>
            {isReadingOrDone ? (
              <View style={styles.recordDetailWrap}>
                <Pressable
                  style={styles.recordSheetPrimaryButton}
                  onPress={() => setRecordActionSheetVisible(true)}
                >
                  <View style={styles.recordStatusActionInner}>
                    <Text style={styles.recordSheetPrimaryButtonText}>{statusLabel}</Text>
                    <Ionicons name="chevron-down" size={16} color="#F29A2E" />
                  </View>
                </Pressable>

                <View style={styles.recordFieldRow}>
                  <Text style={styles.recordFieldLabel}>시작 날짜</Text>
                  <View style={styles.recordDatePickerWrap}>
                    <View style={styles.recordFieldValueBox} pointerEvents="none">
                      <Text style={styles.recordFieldValueText}>{startedDate || '선택'}</Text>
                    </View>
                    <DateTimePicker
                      value={parseDateLabel(startedDate) ?? new Date()}
                      mode="date"
                      display="compact"
                      locale="ko-KR"
                      accentColor="#FEC54B"
                      themeVariant="light"
                      style={styles.recordDatePickerTouchLayer}
                      onChange={(_, nextDate) => handleCompactDateChange('start', nextDate)}
                    />
                  </View>
                </View>

                <View style={styles.recordFieldRow}>
                  <Text style={styles.recordFieldLabel}>완료 날짜</Text>
                  {isReadingStatus ? (
                    <View style={styles.recordFieldValueBox}>
                      <Text style={styles.recordFieldValueText}>-</Text>
                    </View>
                  ) : (
                    <View style={styles.recordDatePickerWrap}>
                      <View style={styles.recordFieldValueBox} pointerEvents="none">
                        <Text style={styles.recordFieldValueText}>{finishedDate || '선택'}</Text>
                      </View>
                      <DateTimePicker
                        value={parseDateLabel(finishedDate) ?? new Date()}
                        mode="date"
                        display="compact"
                        locale="ko-KR"
                        accentColor="#ffae00"
                        themeVariant="light"
                        style={styles.recordDatePickerTouchLayer}
                        minimumDate={parseDateLabel(startedDate) ?? undefined}
                        onChange={(_, nextDate) => handleCompactDateChange('finish', nextDate)}
                      />
                    </View>
                  )}
                </View>

                <View style={styles.recordFieldRow}>
                  <Text style={styles.recordFieldLabel}>종류</Text>
                  <Pressable style={styles.recordFieldValueBox} onPress={selectBookType}>
                    <View style={styles.recordTypeValueWrap}>
                      <Text style={styles.recordFieldValueText}>{bookType}</Text>
                      <Ionicons name="chevron-down" size={14} color="#434850" />
                    </View>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.recordEmptyBox}>
                <Text style={styles.recordEmptyText}>
                  {userLibraryBook
                    ? '독서 상태를 변경하고 진행률을 기록해보세요.'
                    : '책을 추가해서 독서 기록을 시작해보세요.'}
                </Text>
              </View>
            )}
          </View>

          {isReadingOrDone && (
            <Pressable
              style={styles.sectionCard}
              disabled={!hasQuoteNotes}
              onPress={() => {
                if (hasQuoteNotes) {
                  navigation.navigate('QuoteNote', { book });
                }
              }}
            >
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitleCompact}>내 필사 노트</Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA1AD" />
              </View>

              {hasQuoteNotes ? (
                quoteNotes.map((note, index) => (
                  <View
                    key={note.id}
                    style={[
                      styles.quoteNotePreviewBox,
                      index < quoteNotes.length - 1 && styles.quoteNotePreviewBoxGap,
                    ]}
                  >
                    <View style={styles.quoteNotePreviewRow}>
                      <Text style={styles.quoteNotePreviewText}>{note.quoted_text}</Text>
                      <Text style={styles.quoteNotePageInlineText}>
                        {note.page_number ? `${note.page_number}쪽` : '페이지 없음'}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.descriptionText}>
                  인상 깊은 구절을 자유롭게 작성해보세요.
                </Text>
              )}

              <Pressable
                style={styles.moreButton}
                onPress={() => navigation.navigate('QuoteNoteCreate', { book })}
              >
                <Text style={styles.moreButtonText}>필사 노트 추가하기</Text>
              </Pressable>
            </Pressable>
          )}

          {isDoneStatus && (
            <View style={styles.sectionCard}>
              {myReview ? (
                <Pressable onPress={() => navigation.navigate('BookReviewCreate', { book })}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionTitleCompact}>내 리뷰</Text>
                    <Ionicons name="chevron-forward" size={16} color="#9CA1AD" />
                  </View>

                  <View style={styles.myReviewStarsRow}>
                    {Array.from({ length: 5 }).map((_, index) => {
                      const filled = index < myReview.rating;
                      return (
                        <Ionicons
                          key={`my-review-star-${index}`}
                          name={filled ? 'star' : 'star-outline'}
                          size={20}
                          color={filled ? '#F5C24B' : '#D7DAE2'}
                          style={styles.myReviewStarIcon}
                        />
                      );
                    })}
                  </View>

                  <Text style={styles.myReviewContentText}>{myReview.content}</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => navigation.navigate('BookReviewCreate', { book })}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionTitleCompact}>내 리뷰</Text>
                    <Ionicons name="chevron-forward" size={16} color="#9CA1AD" />
                  </View>

                  <View style={styles.myReviewStarsRow}>
                    {Array.from({ length: 5 }).map((_, index) => {
                      const starValue = index + 1;
                      const filled = starValue <= draftRating;
                      return (
                        <Pressable
                          key={`draft-review-star-${starValue}`}
                          onPress={() => setDraftRating(starValue)}
                          hitSlop={6}
                        >
                          <Ionicons
                            name={filled ? 'star' : 'star-outline'}
                            size={24}
                            color={filled ? '#F5C24B' : '#D7DAE2'}
                            style={styles.myReviewStarIcon}
                          />
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={styles.descriptionText}>이 책에 대한 내 생각을 남겨보세요.</Text>

                  <View style={styles.moreButton}>
                    <Text style={styles.moreButtonText}>리뷰 남기기</Text>
                  </View>
                </Pressable>
              )}
            </View>
          )}

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>책 정보</Text>

            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>출판사</Text>
                <Text style={styles.infoValue}>{publisher}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>ISBN</Text>
                <Text style={styles.infoValue}>{isbn}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>출판 연도</Text>
                <Text style={styles.infoValue}>{publishedYear}</Text>
              </View>

              <View style={[styles.infoRow, { marginBottom: 0 }]}>
                <Text style={styles.infoLabel}>분야</Text>
                <Text style={styles.infoValue}>{category}</Text>
              </View>
            </View>

            <Text style={styles.descriptionText} numberOfLines={2}>
              {description}
            </Text>

            <Pressable style={styles.moreButton} onPress={() => setInfoSheetVisible(true)}>
              <Text style={styles.moreButtonText}>더 보기</Text>
            </Pressable>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>책 리뷰</Text>

            {topPositiveRbti ? (
              <View style={styles.positiveRbtiBox}>
                <View style={styles.positiveRbtiIcon}>
                  <Ionicons name="sparkles" size={18} color="#F29A2E" />
                </View>

                <View style={styles.positiveRbtiTextWrap}>
                  <Text style={styles.positiveRbtiLabel}>가장 긍정적으로 평가한 유형</Text>
                  <Text style={styles.positiveRbtiTitle} numberOfLines={1}>
                    {topPositiveRbti.name} · {topPositiveRbti.positive_ratio.toFixed(1)}%
                  </Text>
                  <Text style={styles.positiveRbtiMeta}>
                    공개 리뷰 {topPositiveRbti.review_count}개 기준
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.chipsWrap}>
              {RBTI_TYPE_CHIPS.map((chip) => (
                <View
                  key={chip.code}
                  style={[styles.chip, selectedRbtiCode === chip.code && styles.chipActive]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedRbtiCode === chip.code && styles.chipTextActive,
                    ]}
                  >
                    {chip.name}
                  </Text>
                </View>
              ))}
            </View>

            {previewReviews.length > 0 ? (
              previewReviews.map((review, index) => (
                <View
                  key={review.id}
                  style={[styles.reviewBox, index < previewReviews.length - 1 && styles.reviewBoxGap]}
                >
                  <View style={styles.reviewHeader}>
                    <View style={styles.avatar}>
                      <Ionicons name="person" size={18} color="#C79B47" />
                    </View>

                    <View style={styles.reviewHeaderText}>
                      <Text style={styles.reviewNickname}>
                        {review.user_nickname || '리뷰 작성자'}
                      </Text>
                      <Text style={styles.reviewBody} numberOfLines={4}>
                        {review.content || '리뷰 내용이 없습니다.'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.reviewBox}>
                <Text style={styles.reviewBody}>해당 RBTI 유형의 리뷰가 아직 없습니다.</Text>
              </View>
            )}

            <Pressable
              style={styles.moreButton}
              onPress={() => navigation.navigate('BookReview', { book })}
            >
              <Text style={styles.moreButtonText}>리뷰 더 보기</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      <InfoSheetModal
        visible={infoSheetVisible}
        publisher={publisher}
        isbn={isbn}
        publishedYear={publishedYear}
        category={category}
        description={description}
        styles={styles}
        onClose={() => setInfoSheetVisible(false)}
      />

      <RecordActionModal
        visible={recordActionSheetVisible}
        styles={styles}
        onPressReading={handleMarkAsReading}
        onPressQuoteNote={() => {
          setRecordActionSheetVisible(false);
          navigation.navigate('QuoteNoteCreate', { book });
        }}
        onPressDone={handleMarkAsDone}
        onPressRemove={handleRemoveFromShelf}
        onClose={() => setRecordActionSheetVisible(false)}
      />

      <View style={styles.buttonSection}>
        <View
          pointerEvents="none"
          style={[styles.bottomSolidOverlay, { height: bottomSolidHeight }]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.bottomFadeOverlay,
            { bottom: bottomFadeBottom, height: bottomFadeHeight },
          ]}
        >
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="bookDetailBottomFade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0} />
                <Stop offset="35%" stopColor="#FFFFFF" stopOpacity={0.35} />
                <Stop offset="70%" stopColor="#FFFFFF" stopOpacity={0.8} />
                <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="url(#bookDetailBottomFade)"
            />
          </Svg>
        </View>

        <View style={styles.bottomButtonWrap}>
          <BottomActionButton
            label={userLibraryBook ? (isRecordSaving ? '저장 중...' : '기록 및 제거하기') : '추가하기'}
            onPress={() => {
              if (userLibraryBook) {
                setRecordActionSheetVisible(true);
              } else {
                handleAddOrRemoveBook();
              }
            }}
            disabled={isAddLoading}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function formatDateLabel(date?: string | null) {
  if (!date) {
    return '';
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const month = parsed.getMonth() + 1;
  const day = parsed.getDate();
  const year = String(parsed.getFullYear()).slice(-2);

  return `${month}/${day}/${year}`;
}

function parseDateLabel(label: string) {
  if (!label) {
    return null;
  }

  const parts = label.split('/').map((part) => Number(part));
  if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) {
    return null;
  }

  const [month, day, yy] = parts;
  const year = yy < 100 ? 2000 + yy : yy;
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatDateLabelFromCalendar(dateString: string) {
  const [year, month, day] = dateString.split('-').map((part) => Number(part));
  if (
    [year, month, day].some((value) => Number.isNaN(value)) ||
    year <= 0 ||
    month <= 0 ||
    day <= 0
  ) {
    return '';
  }

  return `${month}/${day}/${String(year).slice(-2)}`;
}

function toCalendarDateStringFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toApiDateString(label: string): string | null {
  const parsed = parseDateLabel(label);
  if (!parsed) {
    return null;
  }

  return toCalendarDateStringFromDate(parsed);
}

function normalizeIsbn(value?: string | null) {
  return (value ?? '').replace(/[^0-9Xx]/g, '').toUpperCase();
}

function mergeBookMetadata(
  current: Partial<Book>,
  incoming: Partial<Book> & { id?: number }
): Partial<Book> {
  const merged = { ...current, ...incoming };
  const keepCurrentWhenIncomingEmpty: Array<keyof Book> = [
    'contents',
    'description',
    'category',
    'kdc',
    'subject',
  ];

  keepCurrentWhenIncomingEmpty.forEach((field) => {
    const value = incoming[field];
    const isEmptyString = typeof value === 'string' && !value.trim();

    if (value === null || value === undefined || isEmptyString) {
      (merged as any)[field] = current[field];
    }
  });

  return merged;
}

function getCategoryText(category?: string | null, kdc?: string | null) {
  if (typeof category === 'string' && category.trim()) {
    return category.trim();
  }

  if (typeof kdc === 'string' && kdc.trim()) {
    return `KDC ${kdc.trim()}`;
  }

  return '정보 없음';
}
