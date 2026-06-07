import React, { useMemo, useState } from 'react';
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
import { createQuoteNote, updateQuoteNote } from '../../api/reviews';
import BookSummaryCard from '../../components/BookSummaryCard';
import BottomActionButton from '../../components/BottomActionButton';

type Props = NativeStackScreenProps<SearchStackParamList, 'QuoteNoteCreate'>;
const QUOTE_INPUT_MIN_HEIGHT = 124;

export default function QuoteNoteCreateScreen({ navigation, route }: Props) {
  const [page, setPage] = useState(() =>
    route.params?.initialPageNumber != null ? String(route.params.initialPageNumber) : ''
  );
  const [quoteText, setQuoteText] = useState(() => route.params?.initialQuotedText ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [quoteTextHeight, setQuoteTextHeight] = useState(QUOTE_INPUT_MIN_HEIGHT);

  const book = route.params?.book;
  const quoteNoteId = route.params?.quoteNoteId;
  const isEditMode = typeof quoteNoteId === 'number';

  const title = useMemo(() => {
    return (book?.title ?? '').trim() || '책 제목';
  }, [book?.title]);

  const author = useMemo(() => {
    if (Array.isArray(book?.authors) && book.authors.length > 0) {
      return book.authors.join(', ');
    }

    return '지은이';
  }, [book?.authors]);

  const publisher = useMemo(() => {
    return (book?.publisher ?? '').trim() || '출판사';
  }, [book?.publisher]);

  const thumbnail = useMemo(() => {
    if (typeof book?.thumbnail === 'string' && book.thumbnail.trim()) {
      return book.thumbnail.trim();
    }

    return '';
  }, [book?.thumbnail]);

  const resolveBookId = async () => {
    const maybeInternalId = (book as { id?: number | string } | undefined)?.id;
    if (
      book?.source === 'booklog' &&
      (typeof maybeInternalId === 'number' || /^\d+$/.test(String(maybeInternalId ?? '')))
    ) {
      return Number(maybeInternalId);
    }

    const rawExternalId = `${book?.external_api_id ?? ''}`.trim();
    if (book?.source === 'library' && /^\d+$/.test(rawExternalId)) {
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

  const handleSubmit = async () => {
    if (isSaving) {
      return;
    }

    const trimmedQuote = quoteText.trim();
    if (!trimmedQuote) {
      Alert.alert('알림', '필사 내용을 입력해주세요.');
      return;
    }

    const normalizedPage = page.trim();
    if (normalizedPage && !/^\d+$/.test(normalizedPage)) {
      Alert.alert('알림', '페이지는 숫자로 입력해주세요.');
      return;
    }

    try {
      setIsSaving(true);

      const bookId = await resolveBookId();
      if (!isEditMode && !bookId) {
        Alert.alert('알림', '책 정보를 확인할 수 없어 저장하지 못했습니다.');
        return;
      }

      if (isEditMode && quoteNoteId) {
        await updateQuoteNote(quoteNoteId, {
          quoted_text: trimmedQuote,
          page_number: normalizedPage ? Number(normalizedPage) : null,
        });
        navigation.goBack();
        return;
      }

      await createQuoteNote({
        book_id: bookId as number,
        quoted_text: trimmedQuote,
        page_number: normalizedPage ? Number(normalizedPage) : null,
      });

      if (book) {
        navigation.replace('BookDetail', { book });
      } else {
        navigation.goBack();
      }
    } catch (error) {
      console.log('필사 노트 저장 실패', error);
      Alert.alert('알림', '필사 노트를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={24} color="#F2B43C" />
            </Pressable>

            <Text style={styles.headerTitle}>{isEditMode ? '필사 노트 수정' : '필사 노트 작성'}</Text>

            <View style={styles.headerRightSpace} />
          </View>

          <View style={styles.bookCard}>
            <BookSummaryCard
              title={title}
              author={author}
              publisher={publisher}
              thumbnail={thumbnail}
              variant="form"
              onPress={() => navigation.navigate('QuoteNoteBookSelect', { book })}
            />
            <Text style={styles.bookCardHint}>도서 카드를 눌러 책을 변경할 수 있어요.</Text>
          </View>

          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>Page</Text>
            <TextInput
              value={page}
              onChangeText={setPage}
              placeholder="대표 페이지를 입력해주세요(숫자)."
              placeholderTextColor="#9A9AA3"
              keyboardType="number-pad"
              style={styles.pageInput}
            />
          </View>

          <View style={styles.fieldSection}>
            <TextInput
              value={quoteText}
              onChangeText={setQuoteText}
              placeholder="인상깊은 구절을 자유롭게 작성해보세요."
              placeholderTextColor="#9A9AA3"
              multiline
              textAlignVertical="top"
              scrollEnabled={false}
              style={[styles.quoteInput, { height: quoteTextHeight }]}
              onContentSizeChange={(e) => {
                const measuredHeight = Math.max(
                  QUOTE_INPUT_MIN_HEIGHT,
                  e.nativeEvent.contentSize.height
                );
                setQuoteTextHeight((prev) => (prev === measuredHeight ? prev : measuredHeight));
              }}
            />
          </View>
        </ScrollView>

        <View style={styles.buttonSection}>
          <View style={styles.bottomButtonWrap}>
            <BottomActionButton
              label={isSaving ? '저장 중...' : isEditMode ? '수정 완료' : '완료하기'}
              onPress={handleSubmit}
              disabled={isSaving}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F3F4',
  },
  buttonSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F3F3F4',
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 140,
  },
  header: {
    height: 56,
    paddingHorizontal: 20,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#24262B',
  },
  headerRightSpace: {
    width: 28,
  },
  bookCard: {
    marginTop: 6,
    marginBottom: 28,
  },
  bookCardHint: {
    marginTop: 8,
    marginLeft: 4,
    fontSize: 12,
    color: '#7A7D86',
  },
  fieldSection: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2F3137',
    marginBottom: 10,
    marginLeft: 4,
  },
  pageInput: {
    height: 62,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFC1C9',
    backgroundColor: '#F3F3F4',
    paddingHorizontal: 16,
    fontSize: 17,
    color: '#2F3137',
  },
  quoteInput: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFC1C9',
    backgroundColor: '#F3F3F4',
    paddingHorizontal: 16,
    paddingVertical: 18,
    fontSize: 17,
    lineHeight: 22,
    color: '#2F3137',
  },
  bottomButtonWrap: {
    left: 20,
    right: 20,
    bottom: 30,
    position: 'absolute',
    zIndex: 3,
  },
});
