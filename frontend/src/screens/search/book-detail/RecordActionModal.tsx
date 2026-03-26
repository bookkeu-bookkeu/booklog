import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  styles: any;
  onPressReading: () => void;
  onPressQuoteNote: () => void;
  onPressDone: () => void;
  onPressRemove: () => void;
  onClose: () => void;
};

export default function RecordActionModal({
  visible,
  styles,
  onPressReading,
  onPressQuoteNote,
  onPressDone,
  onPressRemove,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.recordSheetOverlay}>
        <Pressable style={styles.recordSheetBackdrop} onPress={onClose} />

        <View style={styles.recordSheetContainer}>
          <Pressable
            style={styles.recordSheetPrimaryButton}
            onPress={onPressReading}
          >
            <Text style={styles.recordSheetPrimaryButtonText}>읽는 중</Text>
          </Pressable>

          <Pressable
            style={styles.recordSheetPrimaryButton}
            onPress={onPressQuoteNote}
          >
            <Text style={styles.recordSheetPrimaryButtonText}>필사 노트 작성하기</Text>
          </Pressable>

          <Pressable
            style={styles.recordSheetPrimaryButton}
            onPress={onPressDone}
          >
            <Text style={styles.recordSheetPrimaryButtonText}>완료</Text>
          </Pressable>

          <Pressable
            style={styles.recordSheetDangerSoftButton}
            onPress={onPressRemove}
          >
            <Text style={styles.recordSheetDangerSoftButtonText}>책장에서 제거</Text>
          </Pressable>
        </View>

        <Pressable style={styles.recordSheetCancelButton} onPress={onClose}>
          <Text style={styles.recordSheetCancelButtonText}>취소</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
