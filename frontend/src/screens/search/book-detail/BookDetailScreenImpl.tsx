import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
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
import { Calendar } from 'react-native-calendars';
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
import { getBookReviews, ReviewItem } from '../../../api/reviews';
import { getQuoteNotes, QuoteNoteItem } from '../../../api/reviews';
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
import { styles } from './styles';

type SearchStackWithBookDetail = SearchStackParamList & {
  BookDetail: {
    book: Book;
  };
};

type Props = NativeStackScreenProps<SearchStackWithBookDetail, 'BookDetail'>;

export default function BookDetailScreen({ navigation, route }: Props) {
  const book = route.params.book;
  const bookIsbn13 = getBookIsbn13(book);
  const { bottom: bottomInset } = useSafeAreaInsets();

  const [infoSheetVisible, setInfoSheetVisible] = useState(false);
  const [bookDescriptionText, setBookDescriptionText] = useState<string>('');
  const [selectedRbtiCode, setSelectedRbtiCode] = useState<string>('');
  const [previewReviews, setPreviewReviews] = useState<ReviewItem[]>([]);
  const [userLibraryBook, setUserLibraryBook] = useState<UserLibraryBook | null>(null);
  const [recordActionSheetVisible, setRecordActionSheetVisible] = useState(false);
  const [isAddLoading, setIsAddLoading] = useState(false);
  const [isRecordSaving, setIsRecordSaving] = useState(false);
  const [startedDate, setStartedDate] = useState<string>('');
  const [finishedDate, setFinishedDate] = useState<string>('');
  const [bookType, setBookType] = useState<string>('종이책');
  const [bookLength, setBookLength] = useState<string>('');
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<'start' | 'finish' | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(startOfMonth(new Date()));
  const [importedBookId, setImportedBookId] = useState<number | null>(null);
  const [quoteNotes, setQuoteNotes] = useState<QuoteNoteItem[]>([]);
  const [myReview, setMyReview] = useState<ReviewItem | null>(null);
  const [draftRating, setDraftRating] = useState(0);

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
        }
        await fetchQuoteNotes(importedBook.id);
        await fetchMyReview(importedBook.id);
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
      }
    }, [importedBookId])
  );

  useEffect(() => {
    setStartedDate(formatDateLabel(userLibraryBook?.started_at));
    setFinishedDate(formatDateLabel(userLibraryBook?.finished_at));

    if (userLibraryBook?.book_type) {
      setBookType(userLibraryBook.book_type);
    }

    if (typeof userLibraryBook?.page_count === 'number') {
      setBookLength(String(userLibraryBook.page_count));
    } else {
      const initialLength = getBookLengthLabel(book);
      if (initialLength) {
        setBookLength(initialLength);
      } else {
        setBookLength('');
      }
    }
  }, [book, userLibraryBook]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const isReadingOrDoneStatus =
      userLibraryBook?.shelf_code === 'READING' || userLibraryBook?.shelf_code === 'DONE';

    if (isReadingOrDoneStatus && userLibraryBook) {
      const normalized = bookLength.trim();
      const nextPageCount = normalized ? Number(normalized) : null;
      const currentPageCount = userLibraryBook.page_count ?? null;

      if (nextPageCount !== currentPageCount) {
        timer = setTimeout(() => {
          void persistRecordFields({ page_count: nextPageCount });
        }, 500);
      }
    }

    return () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [bookLength, userLibraryBook]);

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
      const updatedBook = await updateLibraryBook(userLibraryBook.id, {
        shelf_code: 'READING',
        finished_at: null,
      });
      setUserLibraryBook(updatedBook);
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
      const updatedBook = await updateLibraryBookShelf(userLibraryBook.id, 'DONE');
      setUserLibraryBook(updatedBook);
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

  const selectStartedDate = () => {
    const parsed = parseDateLabel(startedDate);
    setCalendarTarget('start');
    setCalendarMonth(startOfMonth(parsed ?? new Date()));
    setCalendarVisible(true);
  };

  const selectFinishedDate = () => {
    const parsed = parseDateLabel(finishedDate);
    setCalendarTarget('finish');
    setCalendarMonth(startOfMonth(parsed ?? new Date()));
    setCalendarVisible(true);
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
  const selectedCalendarLabel =
    calendarTarget === 'start' ? startedDate : calendarTarget === 'finish' ? finishedDate : '';
  const selectedCalendarDate = toCalendarDateString(selectedCalendarLabel);

  const applyCalendarDate = (dateString: string) => {
    const label = formatDateLabelFromCalendar(dateString);
    if (calendarTarget === 'start') {
      setStartedDate(label);
      void persistRecordFields({ started_at: toApiDateString(label) });
    } else if (calendarTarget === 'finish') {
      setFinishedDate(label);
      void persistRecordFields({ finished_at: toApiDateString(label) });
    }
    setCalendarVisible(false);
  };

  const clearCalendarDate = () => {
    if (calendarTarget === 'start') {
      setStartedDate('');
      void persistRecordFields({ started_at: null });
    } else if (calendarTarget === 'finish') {
      setFinishedDate('');
      void persistRecordFields({ finished_at: null });
    }
    setCalendarVisible(false);
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
            <View style={styles.coverImageWrap}>
              {thumbnail ? (
                <Image
                  source={{ uri: thumbnail }}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.coverPlaceholder}>
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
                  <Pressable style={styles.recordFieldValueBox} onPress={selectStartedDate}>
                    <Text style={styles.recordFieldValueText}>{startedDate || '선택'}</Text>
                  </Pressable>
                </View>

                <View style={styles.recordFieldRow}>
                  <Text style={styles.recordFieldLabel}>완료 날짜</Text>
                  {isReadingStatus ? (
                    <View style={styles.recordFieldValueBox}>
                      <Text style={styles.recordFieldValueText}>-</Text>
                    </View>
                  ) : (
                    <Pressable style={styles.recordFieldValueBox} onPress={selectFinishedDate}>
                      <Text style={styles.recordFieldValueText}>{finishedDate || '선택'}</Text>
                    </Pressable>
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

                <View style={styles.recordFieldRow}>
                  <Text style={styles.recordFieldLabel}>길이</Text>
                  <View style={styles.recordFieldValueBox}>
                    <View style={styles.recordLengthInputWrap}>
                      <TextInput
                        style={styles.recordLengthInput}
                        value={bookLength}
                        onChangeText={(text) => setBookLength(text.replace(/[^0-9]/g, ''))}
                        placeholder="숫자"
                        keyboardType="number-pad"
                        maxLength={5}
                      />
                      <Text style={styles.recordLengthSuffix}>쪽</Text>
                    </View>
                  </View>
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

              <View style={[styles.infoRow, { marginBottom: 0 }]}>
                <Text style={styles.infoLabel}>출판 연도</Text>
                <Text style={styles.infoValue}>{publishedYear}</Text>
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

      <Modal
        visible={calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={styles.calendarOverlay}>
          <Pressable
            style={styles.calendarBackdrop}
            onPress={() => setCalendarVisible(false)}
          />

          <View style={styles.calendarCard}>
            <Calendar
              style={styles.calendarWidget}
              current={toCalendarDateStringFromDate(calendarMonth)}
              onDayPress={(day) => applyCalendarDate(day.dateString)}
              onMonthChange={(month) =>
                setCalendarMonth(startOfMonth(new Date(month.year, month.month - 1, 1)))
              }
              markedDates={
                selectedCalendarDate
                  ? {
                      [selectedCalendarDate]: {
                        selected: true,
                        selectedColor: '#F5C24B',
                        selectedTextColor: '#FFFFFF',
                      },
                    }
                  : undefined
              }
              theme={{
                calendarBackground: '#FFFFFF',
                textSectionTitleColor: '#8B909B',
                selectedDayBackgroundColor: '#F5C24B',
                selectedDayTextColor: '#FFFFFF',
                todayTextColor: '#F29A2E',
                dayTextColor: '#2D2F36',
                textDisabledColor: '#D2D5DC',
                arrowColor: '#2D2F36',
                monthTextColor: '#2D2F36',
                textMonthFontWeight: '700',
                textMonthFontSize: 15,
              }}
            />

            <View style={styles.calendarFooterRow}>
              <Pressable style={styles.calendarActionButton} onPress={clearCalendarDate}>
                <Text style={styles.calendarActionText}>초기화</Text>
              </Pressable>

              <Pressable
                style={styles.calendarActionButton}
                onPress={() => applyCalendarDate(toCalendarDateStringFromDate(new Date()))}
              >
                <Text style={styles.calendarActionText}>오늘</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
          <Pressable
            style={styles.addButton}
            onPress={() => {
              if (userLibraryBook) {
                setRecordActionSheetVisible(true);
              } else {
                handleAddOrRemoveBook();
              }
            }}
            disabled={isAddLoading}
          >
            <Text style={styles.addButtonText}>
              {userLibraryBook ? (isRecordSaving ? '저장 중...' : '기록 및 제거하기') : '추가하기'}
            </Text>
          </Pressable>
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

function getBookLengthLabel(book: any) {
  const candidates = [
    book?.itemPage,
    book?.pages,
    book?.page,
    book?.page_count,
    book?.item_page,
  ];

  for (const value of candidates) {
    const page = Number(value);
    if (Number.isFinite(page) && page > 0) {
      return String(Math.floor(page));
    }
  }

  return '';
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

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
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

function toCalendarDateString(label: string) {
  const parsed = parseDateLabel(label);
  if (!parsed) {
    return '';
  }

  return toCalendarDateStringFromDate(parsed);
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
