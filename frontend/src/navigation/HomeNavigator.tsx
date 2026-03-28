import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Book } from './types';
import HomeScreen from '../screens/home/HomeScreen';
import BookDetailScreen from '../screens/search/BookDetailScreen';

type HomeStackParamList = {
  HomeMain: undefined;
  BookDetail: {
    book: Book;
  };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} />
    </Stack.Navigator>
  );
}
