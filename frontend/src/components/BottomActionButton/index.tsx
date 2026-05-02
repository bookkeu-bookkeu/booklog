import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

type BottomActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export default function BottomActionButton({
  label,
  onPress,
  disabled = false,
}: BottomActionButtonProps) {
  return (
    <Pressable
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F5C24B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E7BE63',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});