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
              <Ionicons name="chevron-back" size={30} color="#F5B82E" />
            </Pressable>

            <Text style={styles.headerTitle}>RBTI 기록</Text>

            <View style={styles.headerRightSpace} />
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.emptyWrap}>
            {isLoading ? (
              <>
                <ActivityIndicator size="large" color="#F5B82E" />
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
  const sourceLabel = getHistorySourceLabel(item.source_type);
  const scoreRows = buildHistoryScoreRows(item, hasAnyScoreChange(item.score_changes));

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons
          name={item.source_type === 'ai_review' ? 'sparkles-outline' : 'clipboard-outline'}
          size={24}
          color="#F5B82E"
        />
      </View>

      <View style={styles.cardTextWrap}>
        <Text style={styles.dateText}>{formatRbtiDate(item.created_at)}</Text>
        <Text style={styles.sourceText}>{sourceLabel}</Text>
        <Text style={styles.rbtiText}>
          {item.rbti_name}
          <Text style={styles.rbtiCodeText}> ({item.rbti_code})</Text>
        </Text>

        {scoreRows.length > 0 && (
          <View style={styles.scoreGrid}>
            {scoreRows.map((row) => (
              <View key={row.id} style={styles.scorePill}>
                <Text style={styles.scoreLabel}>{row.label}</Text>
                <View style={styles.scoreValueWrap}>
                  <Text style={styles.scoreValue}>{row.value}%</Text>
                  {!!row.deltaText && (
                    <Text
                      style={[
                        styles.scoreDeltaValue,
                        row.deltaDirection === 'increase' && styles.scoreDeltaIncrease,
                        row.deltaDirection === 'decrease' && styles.scoreDeltaDecrease,
                      ]}
                    >
                      {row.deltaText}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function hasAnyScoreChange(scoreChanges: RbtiHistoryItem['score_changes']) {
  if (!scoreChanges) {
    return false;
  }

  return Object.values(scoreChanges).some((change) => (
    typeof change?.delta === 'number' && change.delta !== 0
  ));
}

function getHistorySourceLabel(sourceType?: string) {
  if (sourceType === 'ai_review') {
    return '리뷰로 보정';
  }

  if (sourceType === 'manual_reset') {
    return '관리자 설정';
  }

  return 'RBTI 검사';
}

function buildHistoryScoreRows(item: RbtiHistoryItem, shouldShowDelta: boolean) {
  const rbtiCode = item.rbti_code?.trim().toUpperCase() ?? '';
  const rows = [
    {
      id: 'axis-1',
      label: rbtiCode[0] === 'I' ? '탐구형' : '수용형',
      value: rbtiCode[0] === 'I' ? item.immersion_score : item.analytic_score,
      delta: rbtiCode[0] === 'I'
        ? item.score_changes?.immersion_score.delta
        : item.score_changes?.analytic_score.delta,
    },
    {
      id: 'axis-2',
      label: rbtiCode[1] === 'E' ? '공감형' : '분석형',
      value: rbtiCode[1] === 'E' ? item.empathy_score : item.critical_score,
      delta: rbtiCode[1] === 'E'
        ? item.score_changes?.empathy_score.delta
        : item.score_changes?.critical_score.delta,
    },
    {
      id: 'axis-3',
      label: rbtiCode[2] === 'S' ? '문장형' : '서사형',
      value: rbtiCode[2] === 'S' ? item.expansion_score : item.practical_score,
      delta: rbtiCode[2] === 'S'
        ? item.score_changes?.expansion_score.delta
        : item.score_changes?.practical_score.delta,
    },
  ];

  return rows.flatMap((row) => {
    if (typeof row.value !== 'number') {
      return [];
    }

    return [
      {
        ...row,
        value: row.value,
        deltaText: shouldShowDelta ? formatScoreDelta(row.delta) : '',
        deltaDirection: shouldShowDelta ? getDeltaDirection(row.delta) : undefined,
      },
    ];
  });
}

function formatScoreDelta(delta?: number | null) {
  if (typeof delta !== 'number') {
    return '';
  }

  if (delta === 0) {
    return ' (-%)';
  }

  const direction = delta > 0 ? '▲' : '▼';
  return ` (${Math.abs(delta)}%${direction})`;
}

function getDeltaDirection(delta?: number | null) {
  if (typeof delta !== 'number' || delta === 0) {
    return undefined;
  }

  return delta > 0 ? 'increase' : 'decrease';
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
    alignItems: 'flex-start',
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
  sourceText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#F5B82E',
    fontWeight: '800',
    marginBottom: 3,
  },
  rbtiText: {
    fontSize: 18,
    lineHeight: 25,
    color: '#23252B',
    fontWeight: '800',
  },
  rbtiCodeText: {
    color: '#F5B82E',
  },
  scoreGrid: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  scorePill: {
    minHeight: 28,
    borderRadius: 14,
    backgroundColor: '#FFF6EA',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B6E79',
    marginRight: 5,
  },
  scoreValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E67F1E',
  },
  scoreDeltaValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1F2025',
  },
  scoreDeltaIncrease: {
    color: '#D84B3F',
  },
  scoreDeltaDecrease: {
    color: '#3F6FD8',
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
