import React from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import LibraryBookCard from '../../../components/LibraryBookCard';
import { LibraryBook, ShelfTabKey } from '../libraryTypes';

type Props = {
  tab: ShelfTabKey;
  books: LibraryBook[];
  listKey: string;
  animatedStyle?: object;
  horizontalPadding: number;
  interCardGap: number;
  cardWidth: number;
  scrollRef: (node: ScrollView | null) => void;
  renderEmpty: () => React.ReactNode;
  onPressBook: (book: LibraryBook) => void;
};

export default function LibraryGridLayer({
  tab,
  books,
  listKey,
  animatedStyle,
  horizontalPadding,
  interCardGap,
  cardWidth,
  scrollRef,
  renderEmpty,
  onPressBook,
}: Props) {
  return (
    <Animated.View
      key={listKey}
      style={[styles.listLayer, animatedStyle]}
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingHorizontal: horizontalPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {books.length === 0 ? (
          renderEmpty()
        ) : (
          <View style={[styles.gridWrap, { columnGap: interCardGap }]}>
            {books.map((item) => (
              <View key={`${tab}-${item.id}`} style={[styles.gridItem, { width: cardWidth }]}>
                <LibraryBookCard book={item} onPress={() => onPressBook(item)} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  listLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  contentContainer: {
    paddingTop: 0,
    paddingBottom: 130,
    flexGrow: 1,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    marginBottom: 18,
  },
});
