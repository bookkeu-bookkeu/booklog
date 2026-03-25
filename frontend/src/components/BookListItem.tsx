import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Book } from '../navigation/types';

interface BookListItemProps {
  book: Book & {
    thumbnail_url?: string;
    author?: string;
    authors?: string | string[];
    published_date?: string;
    description?: string;
    isbn13?: string;
    category?: string;
  };
  showAddButton?: boolean;
  onPress?: () => void;
  onPressAdd?: () => void;
}

const BOOK_PLACEHOLDER =
  'https://via.placeholder.com/84x120/F3EFE7/9E8F7A?text=Book';

export default function BookListItem({
  book,
  showAddButton = false,
  onPress,
  onPressAdd,
}: BookListItemProps) {
  const authorText = getAuthorText(book);
  const publishedYear = getPublishedYear(book.published_date);
  const metaText = [authorText, book.publisher, publishedYear]
    .filter(Boolean)
    .join(' · ');

  const thumbnail =
    book.thumbnail_url || book.thumbnail || BOOK_PLACEHOLDER;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image source={{ uri: thumbnail }} style={styles.thumbnail} resizeMode="cover" />

      <View style={styles.content}>
        <View style={styles.topRow}>
          {!!book.category ? (
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText} numberOfLines={1}>
                {book.category}
              </Text>
            </View>
          ) : (
            <View />
          )}

          {showAddButton && (
            <Pressable style={styles.addButton} onPress={onPressAdd}>
              <Text style={styles.addButtonText}>+ 서재</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {book.title}
        </Text>

        {!!metaText && (
          <Text style={styles.meta} numberOfLines={1}>
            {metaText}
          </Text>
        )}

        {!!book.description && (
          <Text style={styles.description} numberOfLines={3}>
            {book.description}
          </Text>
        )}

        {!!book.isbn13 && (
          <Text style={styles.isbn} numberOfLines={1}>
            ISBN {book.isbn13}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function getAuthorText(book: BookListItemProps['book']) {
  if (Array.isArray(book.authors) && book.authors.length > 0) {
    return book.authors.join(', ');
  }

  if (typeof book.authors === 'string' && book.authors.trim()) {
    return book.authors;
  }

  if (typeof book.author === 'string' && book.author.trim()) {
    return book.author;
  }

  return '저자 미상';
}

function getPublishedYear(date?: string) {
  if (!date) return '';
  return date.slice(0, 4);
}

const styles = StyleSheet.create({
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
    justifyContent: 'space-between',
  },
  topRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  categoryChip: {
    maxWidth: '55%',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#F7E7B7',
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B5322',
  },
  addButton: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#2F2A24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    color: '#1F1A15',
    marginBottom: 6,
  },
  meta: {
    fontSize: 12,
    color: '#8A7A67',
    marginBottom: 8,
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    color: '#5A5045',
    marginBottom: 8,
  },
  isbn: {
    fontSize: 11,
    color: '#B0A18E',
  },
});