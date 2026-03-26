import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  publisher: string;
  isbn: string;
  publishedYear: string;
  description: string;
  styles: any;
  onClose: () => void;
};

export default function InfoSheetModal({
  visible,
  publisher,
  isbn,
  publishedYear,
  description,
  styles,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />

        <View style={styles.infoSheet}>
          <Text style={styles.infoSheetTitle}>책 정보</Text>

          <View style={styles.infoSheetBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>출판사</Text>
              <Text style={styles.infoValue}>{publisher}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ISBN</Text>
              <Text style={styles.infoValue}>{isbn}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>출판 연도</Text>
              <Text style={styles.infoValue}>{publishedYear}</Text>
            </View>
          </View>

          <ScrollView
            style={styles.infoSheetDescriptionScroll}
            contentContainerStyle={styles.infoSheetDescriptionContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.infoSheetDescriptionText}>{description}</Text>
          </ScrollView>

          <Pressable style={styles.sheetConfirmButton} onPress={onClose}>
            <Text style={styles.sheetConfirmButtonText}>확인</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
