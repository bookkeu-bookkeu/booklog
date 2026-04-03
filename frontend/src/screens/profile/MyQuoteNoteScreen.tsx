import React, { useCallback, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	SafeAreaView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import BookSummaryCard from '../../components/BookSummaryCard';
import SearchBar from '../../components/SearchBar';
import type { Book } from '../../navigation/types';
import { getMyLibraryBooks, type UserLibraryBook } from '../../api/books';
import { getQuoteNotes } from '../../api/reviews';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';

type QuoteNoteBook = UserLibraryBook;

export default function MyQuoteNoteScreen() {
	const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
	const [books, setBooks] = useState<QuoteNoteBook[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState('');
	const [isSearchVisible, setIsSearchVisible] = useState(false);
	const [searchText, setSearchText] = useState('');

	const fetchQuoteNoteBooks = useCallback(async () => {
		setIsLoading(true);
		setLoadError('');

		try {
			const [readingBooks, doneBooks] = await Promise.all([
				getMyLibraryBooks('READING'),
				getMyLibraryBooks('DONE'),
			]);

			const merged = dedupeByBookId([...readingBooks, ...doneBooks]);

			const booksWithQuoteNotes = await Promise.all(
				merged.map(async (book) => {
					try {
						const quoteNotes = await getQuoteNotes(book.book_id);
						return quoteNotes.length > 0 ? book : null;
					} catch (error) {
						return null;
					}
				}),
			);

			setBooks(booksWithQuoteNotes.filter((book): book is QuoteNoteBook => !!book));
		} catch (error) {
			setBooks([]);
			setLoadError('필사 노트 도서 목록을 불러오지 못했습니다.');
		} finally {
			setIsLoading(false);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			void fetchQuoteNoteBooks();
		}, [fetchQuoteNoteBooks]),
	);

	const filteredBooks = useMemo(() => {
		const query = searchText.trim().toLowerCase();

		if (!query) {
			return books;
		}

		return books.filter((book) => book.book_title.toLowerCase().includes(query));
	}, [books, searchText]);

	const handleBackPress = () => {
		if (navigation.canGoBack()) {
			navigation.goBack();
		}
	};

	const handleSearchPress = () => {
		setIsSearchVisible((prev) => !prev);
	};

	const handlePressBookCard = (item: QuoteNoteBook) => {
		const book: Book = {
			source: 'library',
			external_api_id: String(item.book_id),
			title: item.book_title || '',
			contents: '',
			url: '',
			isbn: item.book_isbn13 || '',
			isbn13: item.book_isbn13 || '',
			authors: item.book_authors ?? [],
			publisher: item.book_publisher || '',
			published_at: '',
			thumbnail: item.book_thumbnail_url || '',
			is_in_library: true,
		};

		navigation.navigate('QuoteNote', { book });
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<FlatList
				data={filteredBooks}
				keyExtractor={(item) => String(item.id)}
				renderItem={({ item }) => (
					<View style={styles.cardItem}>
						<BookSummaryCard
							title={item.book_title || '제목 없음'}
							author={getAuthorText(item.book_authors)}
							publisher={getPublisherText(item.book_publisher)}
							thumbnail={item.book_thumbnail_url || ''}
							onPress={() => handlePressBookCard(item)}
							variant="search"
							backgroundColor="#FFFFFF"
						/>
					</View>
				)}
				contentContainerStyle={styles.contentContainer}
				showsVerticalScrollIndicator={false}
				ListHeaderComponent={(
					<View>
						<View style={styles.header}>
							<Pressable style={styles.backButton} onPress={handleBackPress} hitSlop={10}>
								<Ionicons name="chevron-back" size={30} color="#FEC54B" />
							</Pressable>

							<Text style={styles.headerTitle}>필사 노트</Text>

							<Pressable style={styles.searchButton} onPress={handleSearchPress} hitSlop={10}>
								<Ionicons name="search-outline" size={30} color="#FEC54B" />
							</Pressable>
						</View>

						{isSearchVisible ? (
							<View style={styles.searchBarWrap}>
								<SearchBar
									value={searchText}
									onChangeText={setSearchText}
									placeholder="책 제목 검색"
									autoFocus
								/>
							</View>
						) : null}
					</View>
				)}
				ListEmptyComponent={(
					<View style={styles.emptyWrap}>
						{isLoading ? (
							<>
								<ActivityIndicator size="large" color="#FEC54B" />
								<Text style={styles.emptyText}>필사 노트 도서를 불러오는 중이에요.</Text>
							</>
						) : loadError ? (
							<Text style={styles.emptyText}>{loadError}</Text>
						) : searchText.trim() ? (
							<Text style={styles.emptyText}>검색 결과가 없습니다.</Text>
						) : (
							<Text style={styles.emptyText}>필사 노트가 있는 도서가 아직 없어요.</Text>
						)}
					</View>
				)}
			/>
		</SafeAreaView>
	);
}

function dedupeByBookId(items: UserLibraryBook[]) {
	const map = new Map<number, UserLibraryBook>();

	items.forEach((item) => {
		if (!map.has(item.book_id)) {
			map.set(item.book_id, item);
		}
	});

	return Array.from(map.values());
}

function getAuthorText(authors?: string[]) {
	if (Array.isArray(authors) && authors.length > 0) {
		return authors.join(', ');
	}

	return '저자 미상';
}

function getPublisherText(publisher?: string) {
	if (typeof publisher === 'string' && publisher.trim()) {
		return publisher.trim();
	}

	return '출판사';
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#F8F9FE',
	},
	contentContainer: {
		paddingHorizontal: 18,
		paddingTop: 14,
		paddingBottom: 40,
		flexGrow: 1,
	},
	cardItem: {
		marginBottom: 12,
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
	searchButton: {
		width: 28,
		alignItems: 'flex-end',
		justifyContent: 'center',
	},
	searchBarWrap: {
		marginBottom: 18,
	},
	emptyWrap: {
		flex: 1,
		minHeight: 260,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
	},
	emptyText: {
		marginTop: 14,
		fontSize: 15,
		lineHeight: 22,
		color: '#6B6E79',
		textAlign: 'center',
	},
});
