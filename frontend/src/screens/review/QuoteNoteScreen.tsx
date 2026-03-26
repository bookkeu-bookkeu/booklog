import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { SearchStackParamList } from '../../navigation/types';
import { importBookByIsbn13 } from '../../api/books';
import { deleteQuoteNote, getQuoteNotes, QuoteNoteItem } from '../../api/reviews';

type Props = NativeStackScreenProps<SearchStackParamList, 'QuoteNote'>;

export default function QuoteNoteScreen({ navigation, route }: Props) {
  const [bookId, setBookId] = useState<number | null>(null);
  const [quoteNotes, setQuoteNotes] = useState<QuoteNoteItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>('');

  const fetchQuoteNotes = React.useCallback(async () => {
    if (!bookId) {
      return;
    }

    setIsLoading(true);
    setLoadError('');

    try {
      const response = await getQuoteNotes(bookId);
      setQuoteNotes(response);
    } catch (error) {
      console.log('필사 노트 목록 조회 실패', error);
      setLoadError('필사 노트 목록을 불러오지 못했습니다.');
      setQuoteNotes([]);
    } finally {
      setIsLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    let mounted = true;

    const resolveBookId = async () => {
      const book = route.params?.book;
      const isbnRaw =
        typeof book?.isbn13 === 'string' && book.isbn13.trim()
          ? book.isbn13.trim()
          : typeof book?.isbn === 'string' && book.isbn.trim()
          ?
              book.isbn
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
        console.log('필사 노트 화면 book_id 조회 실패', error);
        if (mounted) {
          setLoadError('필사 노트 정보를 불러오지 못했습니다.');
          setIsLoading(false);
        }
      }
    };

    void resolveBookId();

    return () => {
      mounted = false;
    };
  }, [route.params]);

  useFocusEffect(
    React.useCallback(() => {
      void fetchQuoteNotes();
    }, [fetchQuoteNotes])
  );

  const handleDelete = async (quoteNoteId: number) => {
    try {
      await deleteQuoteNote(quoteNoteId);
      setQuoteNotes((prev) => prev.filter((note) => note.id !== quoteNoteId));
    } catch (error) {
      console.log('필사 노트 삭제 실패', error);
      Alert.alert('알림', '필사 노트를 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const handlePressNote = (item: QuoteNoteItem) => {
    Alert.alert('필사 노트', '원하는 작업을 선택해주세요.', [
      {
        text: '수정',
        onPress: () => {
          navigation.navigate('QuoteNoteCreate', {
            book: route.params?.book,
            quoteNoteId: item.id,
            initialPageNumber: item.page_number,
            initialQuotedText: item.quoted_text,
          });
        },
      },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          Alert.alert('삭제 확인', '정말 삭제하시겠습니까?', [
            {
              text: '취소',
              style: 'cancel',
            },
            {
              text: '삭제',
              style: 'destructive',
              onPress: () => {
                void handleDelete(item.id);
              },
            },
          ]);
        },
      },
      {
        text: '취소',
        style: 'cancel',
      },
    ]);
  };

  const headerTitle = route.params?.book?.title?.trim() || '내 필사 노트';

  const renderHeader = () => (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={24} color="#F2B43C" />
      </Pressable>

      <Text style={styles.headerTitle} numberOfLines={1}>
        {headerTitle}
      </Text>

      <View style={styles.headerRight} />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      {isLoading ? (
        <>
          <Text style={styles.emptyTitle}>필사 노트를 불러오는 중이에요</Text>
          <Text style={styles.emptyDescription}>잠시만 기다려주세요.</Text>
        </>
      ) : loadError ? (
        <>
          <Text style={styles.emptyTitle}>필사 노트를 불러오지 못했어요</Text>
          <Text style={styles.emptyDescription}>{loadError}</Text>
        </>
      ) : (
        <>
          <Text style={styles.emptyTitle}>작성한 필사 노트가 없어요</Text>
          <Text style={styles.emptyDescription}>책 상세 화면에서 필사 노트를 추가해보세요.</Text>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={quoteNotes}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <QuoteNoteCard item={item} onPress={() => handlePressNote(item)} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function QuoteNoteCard({ item, onPress }: { item: QuoteNoteItem; onPress: () => void }) {
  return (
    <Pressable style={styles.noteCard} onPress={onPress}>
      <View style={styles.noteRow}>
        <Text style={styles.noteText}>{item.quoted_text}</Text>
        <Text style={styles.pageText}>{item.page_number ? `${item.page_number}쪽` : '페이지 없음'}</Text>
      </View>

      {item.note ? <Text style={styles.memoText}>{item.note}</Text> : null}
    </Pressable>
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
    marginBottom: 12,
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
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 2,
  },
  pageText: {
    marginLeft: 8,
    lineHeight: 21,
    fontSize: 12,
    color: '#8B909B',
    includeFontPadding: false,
  },
  noteText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#31343A',
  },
  memoText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: '#666A73',
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
    textAlign: 'center',
  },
});