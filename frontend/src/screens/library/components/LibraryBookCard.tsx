import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LibraryBook } from '../libraryTypes';

type Props = {
  book: LibraryBook;
};

export default function LibraryBookCard({ book }: Props) {
  const hasThumbnail = !!book.thumbnail?.trim();

  return (
    <Pressable style={styles.card}>
      {hasThumbnail ? (
        <Image source={{ uri: book.thumbnail }} style={styles.thumbnail} resizeMode="cover" />
      ) : (
        <View style={styles.thumbnailPlaceholder}>
          <Ionicons name="image-outline" size={28} color="#FFD7A2" />
        </View>
      )}

      <View style={styles.cardInfo}>
        <Text style={styles.publisher} numberOfLines={1}>
          {book.publisher}
        </Text>
        <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
          {book.title}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          {book.author}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F8F9FE',
  },
  thumbnail: {
    width: '100%',
    height: 164,
    backgroundColor: '#FFF6EA',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: 164,
    backgroundColor: '#FFF6EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  publisher: {
    fontSize: 10,
    color: '#666A73',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    color: '#1F2025',
    marginBottom: 4,
  },
  author: {
    fontSize: 12,
    color: '#666A73',
  },
});
