import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import FavoriteReviewScreen from '../screens/profile/FavoriteReviewScreen';
import MyQuoteNoteScreen from '../screens/profile/MyQuoteNoteScreen';
import MyReviewScreen from '../screens/profile/MyReviewScreen';
import RbtiHistoryScreen from '../screens/profile/RbtiHistoryScreen';
import RbtiSurveyScreen from '../screens/auth/RbtiSurveyScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import QuoteNoteListScreen from '../screens/review/QuoteNoteListScreen';
import QuoteNoteBookSelectScreen from '../screens/review/QuoteNoteBookSelectScreen';
import QuoteNoteCreateScreen from '../screens/review/QuoteNoteCreateScreen';
import ReviewCreateScreen from '../screens/review/ReviewCreateScreen';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  MyReview: undefined;
  MyQuoteNote: undefined;
  QuoteNote: {
    book?: import('../navigation/types').Book;
  };
  QuoteNoteBookSelect: {
    book?: import('../navigation/types').Book;
    mode?: 'quote' | 'review';
  };
  QuoteNoteCreate: {
    book?: import('../navigation/types').Book;
    quoteNoteId?: number;
    initialPageNumber?: number | null;
    initialQuotedText?: string;
  };
  FavoriteReview: undefined;
  RbtiHistory: undefined;
  BookReviewCreate: {
    book?: import('../navigation/types').Book;
    reviewId?: number;
  };
  Settings: undefined;
  RbtiSurvey: undefined;
};

function ProfileReviewCreateScreen(props: any) {
  return <ReviewCreateScreen {...props} />;
}

function ProfileQuoteNoteScreen(props: any) {
  return <QuoteNoteListScreen {...props} />;
}

function ProfileQuoteNoteBookSelectScreen(props: any) {
  return <QuoteNoteBookSelectScreen {...props} />;
}

function ProfileQuoteNoteCreateScreen(props: any) {
  return <QuoteNoteCreateScreen {...props} />;
}

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="MyReview" component={MyReviewScreen} />
      <Stack.Screen name="MyQuoteNote" component={MyQuoteNoteScreen} />
      <Stack.Screen name="QuoteNote" component={ProfileQuoteNoteScreen} />
      <Stack.Screen name="QuoteNoteBookSelect" component={ProfileQuoteNoteBookSelectScreen} />
      <Stack.Screen name="QuoteNoteCreate" component={ProfileQuoteNoteCreateScreen} />
      <Stack.Screen name="FavoriteReview" component={FavoriteReviewScreen} />
      <Stack.Screen name="RbtiHistory" component={RbtiHistoryScreen} />
      <Stack.Screen name="BookReviewCreate" component={ProfileReviewCreateScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen
        name="RbtiSurvey"
        component={RbtiSurveyScreen}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
