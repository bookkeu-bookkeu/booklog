import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SearchStackParamList } from './types';
import SearchScreen from '../screens/home/SearchScreen';
import SearchInputScreen from '../screens/home/SearchInputScreen';
import SearchResultScreen from '../screens/home/SearchResultScreen';

const Stack = createNativeStackNavigator<SearchStackParamList>();

export default function SearchNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SearchHome" component={SearchScreen} />
      <Stack.Screen name="SearchInput" component={SearchInputScreen} />
      <Stack.Screen name="SearchResult" component={SearchResultScreen} />
    </Stack.Navigator>
  );
}