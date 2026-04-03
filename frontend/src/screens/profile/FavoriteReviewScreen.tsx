import React, { useCallback, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	FlatList,
	Image,
	Pressable,
	SafeAreaView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import SearchBar from '../../components/SearchBar';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { getLikedReviews, type ReviewItem } from '../../api/reviews';

const REVIEW_PLACEHOLDER = 'https://via.placeholder.com/84x120/F3EFE7/9E8F7A?text=Book';

export default function FavoriteReviewScreen() {
	const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
	const [reviews, setReviews] = useState<ReviewItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState('');
	const [isSearchVisible, setIsSearchVisible] = useState(false);
	const [searchText, setSearchText] = useState('');

	const fetchLikedReviews = useCallback(async () => {
		setIsLoading(true);
		setLoadError('');

		try {
			const likedReviews = await getLikedReviews();
			setReviews(likedReviews);
		} catch (error) {
			setReviews([]);
			setLoadError('좋아요한 리뷰를 불러오지 못했습니다.');
		} finally {
			setIsLoading(false);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			void fetchLikedReviews();
		}, [fetchLikedReviews]),
	);

	const filteredReviews = useMemo(() => {
		const query = searchText.trim().toLowerCase();

		if (!query) {
			return reviews;
		}

		return reviews.filter((review) => {
			return review.book_title.toLowerCase().includes(query);
		});
	}, [reviews, searchText]);

	const handleBackPress = () => {
		if (navigation.canGoBack()) {
			navigation.goBack();
		}
	};

	const handleSearchPress = () => {
		setIsSearchVisible((prev) => !prev);
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<FlatList
				data={filteredReviews}
				keyExtractor={(item) => String(item.id)}
				renderItem={({ item }) => <FavoriteReviewCard review={item} />}
				contentContainerStyle={styles.contentContainer}
				showsVerticalScrollIndicator={false}
				ListHeaderComponent={(
					<View>
						<View style={styles.header}>
							<Pressable style={styles.backButton} onPress={handleBackPress} hitSlop={10}>
								<Ionicons name="chevron-back" size={30} color="#FEC54B" />
							</Pressable>

							<Text style={styles.headerTitle}>좋아한 리뷰</Text>

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
								<Text style={styles.emptyText}>좋아요한 리뷰를 불러오는 중이에요.</Text>
							</>
						) : loadError ? (
							<Text style={styles.emptyText}>{loadError}</Text>
						) : searchText.trim() ? (
							<Text style={styles.emptyText}>검색 결과가 없습니다.</Text>
						) : (
							<Text style={styles.emptyText}>좋아요한 리뷰가 아직 없어요.</Text>
						)}
					</View>
				)}
			/>
		</SafeAreaView>
	);
}

function FavoriteReviewCard({ review }: { review: ReviewItem }) {
	const thumbnail = review.book_thumbnail_url || REVIEW_PLACEHOLDER;
	const reviewText = truncateText(review.content, 110);

	return (
		<View style={styles.card}>
			<Image source={{ uri: thumbnail }} style={styles.thumbnail} resizeMode="cover" />

			<View style={styles.content}>
				<Text style={styles.title} numberOfLines={2}>
					{review.book_title}
				</Text>

				<Text style={styles.reviewText} numberOfLines={3}>
					{reviewText}
				</Text>
			</View>
		</View>
	);
}

function truncateText(text: string, maxLength: number) {
	if (text.length <= maxLength) {
		return text;
	}

	return `${text.slice(0, maxLength).trimEnd()}...`;
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
		gap: 0,
	},
	card: {
		flexDirection: 'row',
		backgroundColor: '#FFFFFF',
		borderRadius: 22,
		padding: 14,
		borderWidth: 1,
		borderColor: '#EFE7DB',
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 6 },
		elevation: 2,
		marginBottom: 12,
	},
	thumbnail: {
		width: 84,
		height: 120,
		borderRadius: 14,
		backgroundColor: '#F3EFE7',
	},
	content: {
		flex: 1,
		marginLeft: 14,
		justifyContent: 'center',
	},
	title: {
		fontSize: 17,
		lineHeight: 24,
		fontWeight: '700',
		color: '#1F1A15',
		marginBottom: 10,
	},
	reviewText: {
		fontSize: 12,
		lineHeight: 18,
		color: '#5A5045',
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
