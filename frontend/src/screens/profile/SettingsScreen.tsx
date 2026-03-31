import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { deleteMe, getMe } from '../../api/auth';
import { useAuthStore } from '../../store/useAuthStore';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const logout = useAuthStore((state) => state.logout);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      const fetchMyEmail = async () => {
        try {
          const me = await getMe();
          setUserEmail(me.email ?? '');
        } catch (error) {
          setUserEmail('');
        }
      };

      void fetchMyEmail();
    }, []),
  );

  const normalizedQuery = searchText.trim().toLowerCase();
  const isFiltering = normalizedQuery.length > 0;

  const matchesQuery = (...texts: string[]) => {
    if (!isFiltering) {
      return true;
    }

    return texts.some((text) => text.toLowerCase().includes(normalizedQuery));
  };

  const accountSectionTitleMatch = matchesQuery('계정 설정');
  const accountPasswordMatch = matchesQuery('비밀번호 변경', '****');
  const accountEmailMatch = matchesQuery('이메일 변경', userEmail || '(현재 이메일 정보)');
  const accountLogoutMatch = matchesQuery('로그아웃');
  const showAccountSection =
    accountSectionTitleMatch || accountPasswordMatch || accountEmailMatch || accountLogoutMatch;

  const notificationSectionTitleMatch = matchesQuery('알림 설정');
  const notificationPushMatch = matchesQuery('푸시 알림', 'ON/OFF');
  const showNotificationSection = notificationSectionTitleMatch || notificationPushMatch;

  const dataSectionTitleMatch = matchesQuery('데이터 설정');
  const dataResetMatch = matchesQuery('내서재 초기화');
  const showDataSection = dataSectionTitleMatch || dataResetMatch;

  const deleteSectionTitleMatch = matchesQuery('계정 삭제');
  const deleteAccountMatch = matchesQuery('계정 삭제');
  const showDeleteSection = deleteSectionTitleMatch || deleteAccountMatch;

  const hasAnyResult =
    showAccountSection || showNotificationSection || showDataSection || showDeleteSection;

  const toggleSearchBar = () => {
    setIsSearchVisible((prev) => !prev);
  };

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleLogoutPress = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => {
          void logout();
        },
      },
    ]);
  };

  const handleDeleteAccountPress = () => {
    Alert.alert('계정 삭제', '계정을 삭제하면 복구할 수 없습니다. 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteMe();
              await logout();
            } catch (error) {
              Alert.alert('오류', '계정 삭제 중 문제가 발생했습니다. 다시 시도해 주세요.');
            }
          })();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleBackPress} hitSlop={10}>
            <Ionicons name="chevron-back" size={30} color="#242630" />
          </Pressable>
          <Text style={styles.headerTitle}>설정</Text>
          <Pressable style={styles.searchButton} onPress={toggleSearchBar} hitSlop={10}>
            <Ionicons name="search-outline" size={30} color="#F1BB45" />
          </Pressable>
        </View>

        {isSearchVisible ? (
          <View style={styles.searchBarWrap}>
            <Ionicons name="search-outline" size={20} color="#8E9099" />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="설정 검색"
              placeholderTextColor="#A4A7B0"
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        ) : null}

        {showAccountSection ? (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.accountIconWrap}>
                <Ionicons name="person" size={30} color="#FFD7A2" />
              </View>
              <Text style={styles.sectionTitle}>계정 설정</Text>
            </View>

            {(accountSectionTitleMatch || accountPasswordMatch) ? (
              <View style={styles.optionItem}>
                <View>
                  <Text style={styles.optionLabel}>비밀번호 변경</Text>
                  <Text style={styles.optionSubLabel}>****</Text>
                </View>
                <Ionicons name="chevron-forward" size={28} color="#505258" />
              </View>
            ) : null}

            {(accountSectionTitleMatch || accountEmailMatch) ? (
              <View style={styles.optionItem}>
                <View>
                  <Text style={styles.optionLabel}>이메일 변경</Text>
                  <Text style={styles.optionSubLabel}>{userEmail || '(현재 이메일 정보)'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={28} color="#505258" />
              </View>
            ) : null}

            {(accountSectionTitleMatch || accountLogoutMatch) ? (
              <Pressable style={styles.optionItem} onPress={handleLogoutPress}>
                <Text style={styles.optionLabel}>로그아웃</Text>
                <Ionicons name="log-out-outline" size={25} color="#505258" />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {showAccountSection && (showNotificationSection || showDataSection || showDeleteSection) ? (
          <View style={styles.sectionDivider} />
        ) : null}

        {showNotificationSection ? (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="notifications-outline" size={36} color="#F1BB45" />
              <Text style={styles.sectionTitle}>알림 설정</Text>
            </View>

            {(notificationSectionTitleMatch || notificationPushMatch) ? (
              <View style={styles.optionItem}>
                <View>
                  <Text style={styles.optionLabel}>푸시 알림</Text>
                  <Text style={styles.optionSubLabel}>ON/OFF</Text>
                </View>
                <Ionicons name="chevron-forward" size={28} color="#505258" />
              </View>
            ) : null}
          </View>
        ) : null}

        {showNotificationSection && (showDataSection || showDeleteSection) ? (
          <View style={styles.sectionDivider} />
        ) : null}

        {showDataSection ? (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="document-text-outline" size={34} color="#F1BB45" />
              <Text style={styles.sectionTitle}>데이터 설정</Text>
            </View>

            {(dataSectionTitleMatch || dataResetMatch) ? (
              <View style={styles.optionItem}>
                <Text style={styles.optionLabel}>내서재 초기화</Text>
                <Ionicons name="chevron-forward" size={28} color="#505258" />
              </View>
            ) : null}
          </View>
        ) : null}

        {showDataSection && showDeleteSection ? <View style={styles.sectionDivider} /> : null}

        {showDeleteSection ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>계정 삭제</Text>
            {(deleteSectionTitleMatch || deleteAccountMatch) ? (
              <Pressable style={styles.optionItem} onPress={handleDeleteAccountPress}>
                <Text style={styles.optionLabel}>계정 삭제</Text>
                <Ionicons name="trash-outline" size={22} color="#505258" />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {isFiltering && !hasAnyResult ? (
          <View style={styles.noResultWrap}>
            <Text style={styles.noResultText}>검색 결과가 없습니다.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    paddingTop: 34,
    paddingBottom: 56,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 36,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#242630',
  },
  searchButton: {
    position: 'absolute',
    right: 44,
    padding: 6,
  },
  backButton: {
    position: 'absolute',
    left: 38,
    padding: 6,
  },
  searchBarWrap: {
    marginHorizontal: 34,
    marginBottom: 18,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#31343C',
    paddingVertical: 0,
  },

  section: {
    paddingHorizontal: 52,
    paddingVertical: 34,
  },
  sectionDivider: {
    height: 15,
    backgroundColor: '#FFF6EA',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#23252E',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 26,
    columnGap: 18,
  },
  accountIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFF6EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
  },
  optionLabel: {
    fontSize: 18,
    color: '#505258',
    fontWeight: '700',
  },
  optionSubLabel: {
    marginTop: 2,
    fontSize: 14,
    color: '#9a9a9c',
    fontWeight: '700',
  },
  optionText: {
    fontSize: 12,
    color: '#999',
  },
  noResultWrap: {
    paddingHorizontal: 52,
    paddingTop: 20,
    paddingBottom: 40,
  },
  noResultText: {
    fontSize: 15,
    color: '#8A8E98',
    fontWeight: '600',
  },
});