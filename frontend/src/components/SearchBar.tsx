import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface SearchBarProps {
  value: string;
  placeholder?: string;
  editable?: boolean;
  autoFocus?: boolean;
  onPress?: () => void;
  onChangeText?: (text: string) => void;
  onSubmitEditing?: () => void;
}

export default function SearchBar({
  value,
  placeholder = '검색',
  editable = true,
  autoFocus = false,
  onPress,
  onChangeText,
  onSubmitEditing,
}: SearchBarProps) {
  if (!editable && onPress) {
    return (
      <Pressable style={styles.wrapper} onPress={onPress}>
        <View style={styles.container}>
          <Ionicons
            name="search-outline"
            size={20}
            color="#2F2A24"
            style={styles.icon}
          />
          <Text
            style={[styles.readonlyText, !value && styles.placeholderText]}
            numberOfLines={1}
          >
            {value || placeholder}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <Ionicons
          name="search-outline"
          size={20}
          color="#2F2A24"
          style={styles.icon}
        />

        <TextInput
          value={value}
          autoFocus={autoFocus}
          editable={editable}
          placeholder={placeholder}
          placeholderTextColor="#8C8F98"
          onChangeText={onChangeText}
          onSubmitEditing={() => onSubmitEditing?.()}
          returnKeyType="search"
          style={styles.input}
        />

        {value && (
          <Pressable
            style={styles.clearButton}
            onPress={() => onChangeText?.('')}
            hitSlop={8}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color="#8C8F98"
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  container: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FE',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 10,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2F2A24',
    paddingVertical: 0,
    includeFontPadding: false,
  },
  readonlyText: {
    flex: 1,
    fontSize: 16,
    color: '#2F2A24',
  },
  placeholderText: {
    color: '#8C8F98',
  },
});