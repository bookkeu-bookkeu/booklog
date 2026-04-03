import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

type CardVariant = 'search' | 'form';

type Props = {
  title: string;
  author: string;
  publisher: string;
  thumbnail?: string;
  onPress?: () => void;
  variant?: CardVariant;
  backgroundColor?: string;
  showAddedBadge?: boolean;
  addedBadgeLabel?: string;
};

export default function BookSummaryCard({
  title,
  author,
  publisher,
  thumbnail,
  onPress,
  variant = 'form',
  backgroundColor,
  showAddedBadge = false,
  addedBadgeLabel = '추가됨',
}: Props) {
  const hasThumbnail = typeof thumbnail === 'string' && thumbnail.trim().length > 0;
  const isSearchVariant = variant === 'search';
  const isLongTitle = title.trim().length > 16;

  const wrapperStyle = [
    styles.card,
    isSearchVariant ? styles.searchCard : styles.formCard,
    backgroundColor ? { backgroundColor } : null,
  ];

  const thumbnailAreaStyle = [
    styles.thumbnailArea,
    isSearchVariant ? styles.searchThumbnailArea : styles.formThumbnailArea,
  ];

  const thumbnailImageStyle = [
    styles.thumbnailImage,
    isSearchVariant ? styles.searchThumbnailImage : styles.formThumbnailImage,
  ];

  const contentStyle = [
    styles.content,
    isSearchVariant ? styles.searchContent : styles.formContent,
  ];

  const titleStyle = [
    styles.title,
    isSearchVariant ? styles.searchTitle : styles.formTitle,
    isLongTitle && styles.compactTitle,
  ];

  const publisherStyle = [
    styles.publisher,
    isSearchVariant ? styles.searchPublisher : styles.formPublisher,
    isLongTitle && isSearchVariant && styles.searchPublisherCompact,
  ];

  const authorStyle = [
    styles.author,
    isSearchVariant ? styles.searchAuthor : styles.formAuthor,
  ];

  const cardBody = (
    <>
      {hasThumbnail ? (
        <Image source={{ uri: thumbnail.trim() }} style={thumbnailImageStyle} resizeMode="cover" />
      ) : (
        <View style={thumbnailAreaStyle}>
          <Ionicons
            name="image-outline"
            size={isSearchVariant ? 28 : 34}
            color={isSearchVariant ? '#FFD7A2' : '#F0C98B'}
          />
        </View>
      )}

      <View style={contentStyle}>
        <View style={styles.topRow}>
          <Text style={publisherStyle} numberOfLines={1}>
            {publisher || '출판사'}
          </Text>

          {isSearchVariant && showAddedBadge && (
            <View style={styles.addedBadge}>
              <Text style={styles.addedBadgeText}>{addedBadgeLabel}</Text>
            </View>
          )}
        </View>

        <Text style={titleStyle} numberOfLines={2} ellipsizeMode="tail">
          {title || '제목 없음'}
        </Text>

        <Text style={authorStyle} numberOfLines={1}>
          {author || '지은이'}
        </Text>
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable style={wrapperStyle} onPress={onPress}>
        {cardBody}
      </Pressable>
    );
  }

  return <View style={wrapperStyle}>{cardBody}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  searchCard: {
    height: 122,
    backgroundColor: '#F8F9FE',
  },
  formCard: {
    height: 110,
    backgroundColor: '#ECECF3',
  },
  thumbnailArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchThumbnailArea: {
    width: 96,
    height: '100%',
    backgroundColor: '#FFF6EA',
  },
  formThumbnailArea: {
    width: 110,
    height: '100%',
    backgroundColor: '#F2E7D4',
  },
  thumbnailImage: {
    backgroundColor: '#E9D7B7',
    height: '100%',
  },
  searchThumbnailImage: {
    width: 96,
  },
  formThumbnailImage: {
    width: 110,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  searchContent: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  formContent: {
    paddingHorizontal: 18,
    paddingVertical: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 26,
    marginBottom: 6,
  },
  publisher: {
    flex: 1,
    marginRight: 10,
  },
  searchPublisher: {
    fontSize: 11,
    color: '#666A73',
    lineHeight: 16,
  },
  searchPublisherCompact: {
    marginBottom: 2,
  },
  formPublisher: {
    fontSize: 12,
    fontWeight: '500',
    color: '#46484D',
  },
  title: {
    fontWeight: '700',
    color: '#24262B',
    marginBottom: 6,
  },
  searchTitle: {
    fontSize: 18,
    lineHeight: 22,
    color: '#1F2025',
  },
  formTitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  compactTitle: {
    lineHeight: 21,
    marginBottom: 4,
  },
  author: {
    fontWeight: '400',
  },
  searchAuthor: {
    fontSize: 13,
    color: '#666A73',
  },
  formAuthor: {
    fontSize: 14,
    color: '#6C7078',
  },
  addedBadge: {
    minWidth: 56,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F5C24B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginTop: -10,
  },
  addedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    includeFontPadding: false,
  },
});