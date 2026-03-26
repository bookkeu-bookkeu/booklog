import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LibraryScreen from '../screens/library/LibraryScreen';
import BookDetailScreen from '../screens/search/BookDetailScreen';
import BookReviewScreen from '../screens/review/BookReviewScreen';
import ReviewCreateScreen from '../screens/review/ReviewCreateScreen';
import QuoteNoteListScreen from '../screens/review/QuoteNoteListScreen';
import QuoteNoteBookSelectScreen from '../screens/review/QuoteNoteBookSelectScreen';
import QuoteNoteCreateScreen from '../screens/review/QuoteNoteCreateScreen';
import { Book } from './types';

type LibraryStackParamList = {
  LibraryHome: undefined;
  BookDetail: {
    book: Book;
  };
  BookReview: {
    book?: Book;
  };
  BookReviewCreate: {
    book?: Book;
  };
  QuoteNote: {
    book?: Book;
  };
  QuoteNoteBookSelect: {
    book?: Book;
  };
  QuoteNoteCreate: {
    book?: Book;
  };
};

const Stack = createNativeStackNavigator<LibraryStackParamList>();

export default function LibraryNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LibraryHome" component={LibraryScreen} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} />
      <Stack.Screen name="BookReview" component={BookReviewScreen} />
      <Stack.Screen name="BookReviewCreate" component={ReviewCreateScreen} />
      <Stack.Screen name="QuoteNote" component={QuoteNoteListScreen} />
      <Stack.Screen name="QuoteNoteBookSelect" component={QuoteNoteBookSelectScreen} />
      <Stack.Screen name="QuoteNoteCreate" component={QuoteNoteCreateScreen} />
    </Stack.Navigator>
  );
}
