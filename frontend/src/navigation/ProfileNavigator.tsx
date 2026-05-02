import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import FavoriteReviewScreen from '../screens/profile/FavoriteReviewScreen';
import MyQuoteNoteScreen from '../screens/profile/MyQuoteNoteScreen';
import MyReviewScreen from '../screens/profile/MyReviewScreen';
import RbtiSurveyScreen from '../screens/auth/RbtiSurveyScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import QuoteNoteListScreen from '../screens/review/QuoteNoteListScreen';
import ReviewCreateScreen from '../screens/review/ReviewCreateScreen';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  MyReview: undefined;
  MyQuoteNote: undefined;
  QuoteNote: {
    book?: import('../navigation/types').Book;
  };
  FavoriteReview: undefined;
  BookReviewCreate: {
    book?: import('../navigation/types').Book;
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

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="MyReview" component={MyReviewScreen} />
      <Stack.Screen name="MyQuoteNote" component={MyQuoteNoteScreen} />
      <Stack.Screen name="QuoteNote" component={ProfileQuoteNoteScreen} />
      <Stack.Screen name="FavoriteReview" component={FavoriteReviewScreen} />
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
