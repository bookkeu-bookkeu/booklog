import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

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
  const [shouldRender, setShouldRender] = useState(visible);
  const translateY = useRef(new Animated.Value(420)).current;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      translateY.setValue(420);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    if (!shouldRender) {
      return;
    }

    Animated.timing(translateY, {
      toValue: 420,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setShouldRender(false);
      }
    });
  }, [shouldRender, translateY, visible]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Modal visible={shouldRender} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />

        <Animated.View style={[styles.infoSheet, { transform: [{ translateY }] }]}>
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
        </Animated.View>
      </View>
    </Modal>
  );
}
