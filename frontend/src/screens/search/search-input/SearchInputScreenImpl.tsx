import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SearchStackParamList, RecentSearchItem } from '../../../navigation/types';
import SearchBar from '../../../components/SearchBar';

type Props = NativeStackScreenProps<SearchStackParamList, 'SearchInput'>;

const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT_SEARCHES = 10;

export default function SearchInputScreen({ navigation, route }: Props) {
  const [keyword, setKeyword] = useState(route.params?.initialKeyword ?? '');
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);

  const loadRecentSearches = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.log('최근 검색어 조회 실패', error);
    }
  }, []);

  useEffect(() => {
    loadRecentSearches();
  }, [loadRecentSearches]);

  const persistRecentSearches = async (items: RecentSearchItem[]) => {
    setRecentSearches(items);
    try {
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(items));
    } catch (error) {
      console.log('최근 검색어 저장 실패', error);
    }
  };

  const saveRecentSearch = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const nextItems: RecentSearchItem[] = [
      { id: `${Date.now()}`, keyword: trimmed },
      ...recentSearches.filter((item) => item.keyword !== trimmed),
    ].slice(0, MAX_RECENT_SEARCHES);

    await persistRecentSearches(nextItems);
  };

  const handleSubmit = async (customKeyword?: string) => {
    const finalKeyword = (customKeyword ?? keyword).trim();

    if (!finalKeyword) {
      Alert.alert('알림', '검색어를 입력해주세요.');
      return;
    }

    await saveRecentSearch(finalKeyword);
    navigation.navigate('SearchResult', { keyword: finalKeyword });
  };

  const removeRecentSearch = async (id: string) => {
    const nextItems = recentSearches.filter((item) => item.id !== id);
    await persistRecentSearches(nextItems);
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>최근 검색어가 없습니다.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <SearchBar
            value={keyword}
            autoFocus
            placeholder="검색"
            onChangeText={setKeyword}
            onSubmitEditing={() => handleSubmit()}
          />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>내 최근 검색어</Text>
          </View>
        </View>

        <FlatList
          data={recentSearches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.recentItem}>
              <Pressable
                style={styles.recentKeywordArea}
                onPress={() => handleSubmit(item.keyword)}
              >
                <Text style={styles.recentKeyword} numberOfLines={1}>
                  {item.keyword}
                </Text>
              </Pressable>

              <Pressable
                style={styles.removeButton}
                onPress={() => removeRecentSearch(item.id)}
                hitSlop={10}
              >
                <Ionicons name="close-circle" size={16} color="#9CA0AA" />
              </Pressable>
            </View>
          )}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="handled"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoiding: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 24,
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 6,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6D7280',
  },
  recentItem: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  recentKeywordArea: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 12,
  },
  recentKeyword: {
    fontSize: 16,
    fontWeight: '400',
    color: '#2D2F36',
  },
  removeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingTop: 8,
    paddingHorizontal: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#9AA0AA',
  },
});
