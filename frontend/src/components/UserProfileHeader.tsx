import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

type UserProfileHeaderProps = {
  rbtiName?: string;
  nickname?: string;
  rightAccessory: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

export default function UserProfileHeader({
  rbtiName,
  nickname,
  rightAccessory,
  containerStyle,
}: UserProfileHeaderProps) {
  return (
    <View style={[styles.profileHeader, containerStyle]}>
      <View style={styles.profileLeft}>
        <View style={styles.profileAvatar}>
          <Ionicons name="person" size={40} color="#FFD7A2" />
        </View>

        <View style={styles.profileTextWrap}>
          <Text style={styles.profileRbti} numberOfLines={1}>
            {rbtiName || '(내 RBTI 유형 이름)'}
          </Text>
          <Text style={styles.profileNickname} numberOfLines={1}>
            {nickname || '닉네임'}
          </Text>
        </View>
      </View>

      {rightAccessory}
    </View>
  );
}

export const userProfileHeaderStyles = StyleSheet.create({
  bellButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 2,
    right: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F5C24B',
  },
  editButton: {
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: '#FEC54B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

const styles = StyleSheet.create({
  profileHeader: {
    paddingHorizontal: 26,
    paddingVertical: 12,
    marginBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF6EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileTextWrap: {
    flex: 1,
  },
  profileRbti: {
    fontSize: 15,
    color: '#5F636B',
    marginBottom: 2,
  },
  profileNickname: {
    fontSize: 20,
    fontWeight: '700',
    color: '#202329',
  },
});
