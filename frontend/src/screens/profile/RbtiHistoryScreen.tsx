import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getRbtiHistory, type RbtiHistoryItem } from '../../api/rbti';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';

export default function RbtiHistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const [history, setHistory] = useState<RbtiHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const response = await getRbtiHistory();
      setHistory(response.results);
    } catch (error) {
      setHistory([]);
      setLoadError('RBTI 기록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchHistory();
    }, [fetchHistory]),
  );

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={history}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <RbtiHistoryCard item={item} />}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={(
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={handleBackPress} hitSlop={10}>
              <Ionicons name="chevron-back" size={30} color="#FEC54B" />
            </Pressable>

            <Text style={styles.headerTitle}>RBTI 기록</Text>

            <View style={styles.headerRightSpace} />
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.emptyWrap}>
            {isLoading ? (
              <>
                <ActivityIndicator size="large" color="#FEC54B" />
                <Text style={styles.emptyText}>RBTI 기록을 불러오는 중이에요.</Text>
              </>
            ) : loadError ? (
              <Text style={styles.emptyText}>{loadError}</Text>
            ) : (
              <Text style={styles.emptyText}>아직 RBTI 검사 기록이 없어요.</Text>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function RbtiHistoryCard({ item }: { item: RbtiHistoryItem }) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="clipboard-outline" size={24} color="#D89025" />
      </View>

      <View style={styles.cardTextWrap}>
        <Text style={styles.dateText}>{formatRbtiDate(item.created_at)}</Text>
        <Text style={styles.rbtiText}>
          {item.rbti_name}
          <Text style={styles.rbtiCodeText}> ({item.rbti_code})</Text>
        </Text>
      </View>
    </View>
  );
}

function formatRbtiDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}.${month}.${day} ${hour}:${minute}`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  contentContainer: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 40,
    flexGrow: 1,
  },
  header: {
    height: 56,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 28,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#24262B',
  },
  headerRightSpace: {
    width: 28,
  },
  card: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#EFE7DB',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    marginBottom: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF6EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardTextWrap: {
    flex: 1,
  },
  dateText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#7B7E87',
    fontWeight: '600',
    marginBottom: 4,
  },
  rbtiText: {
    fontSize: 18,
    lineHeight: 25,
    color: '#23252B',
    fontWeight: '800',
  },
  rbtiCodeText: {
    color: '#D89025',
  },
  emptyWrap: {
    flex: 1,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 22,
    color: '#6B6E79',
    textAlign: 'center',
  },
});
