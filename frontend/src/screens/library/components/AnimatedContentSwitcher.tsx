import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { ShelfTabKey, TAB_ORDER } from '../libraryTypes';

type Props = {
  activeTab: ShelfTabKey;
  onChange: (tab: ShelfTabKey) => void;
};

const TABS: { key: ShelfTabKey; label: string }[] = [
  { key: 'wish', label: '읽고 싶은' },
  { key: 'reading', label: '읽는 중' },
  { key: 'done', label: '완료' },
];

export default function AnimatedContentSwitcher({ activeTab, onChange }: Props) {
  const [switcherWidth, setSwitcherWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const tabWidth = switcherWidth > 0 ? switcherWidth / 3 : 0;
  const activeIndex = TAB_ORDER.indexOf(activeTab);

  useEffect(() => {
    if (!tabWidth) return;

    Animated.spring(translateX, {
      toValue: tabWidth * activeIndex,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
      mass: 0.8,
    }).start();
  }, [activeIndex, tabWidth, translateX]);

  return (
    <View style={styles.switcherOuter}>
      <View
        style={styles.switcherContainer}
        onLayout={(e) => setSwitcherWidth(e.nativeEvent.layout.width)}
      >
        {tabWidth > 0 && (
          <Animated.View
            style={[
              styles.switcherSlider,
              {
                width: tabWidth - 6,
                transform: [{ translateX: Animated.add(translateX, new Animated.Value(3)) }],
              },
            ]}
          />
        )}

        {TABS.map((tab) => {
          const focused = tab.key === activeTab;
          return (
            <Pressable key={tab.key} style={styles.switchTab} onPress={() => onChange(tab.key)}>
              <Text style={[styles.switchTabText, focused && styles.switchTabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  switcherOuter: {
    marginBottom: 24,
  },
  switcherContainer: {
    height: 38,
    borderRadius: 14,
    backgroundColor: '#F8F9FE',
    padding: 3,
    flexDirection: 'row',
    position: 'relative',
    overflow: 'hidden',
  },
  switcherSlider: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  switchTab: {
    flex: 1,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7E818A',
  },
  switchTabTextActive: {
    color: '#23252B',
  },
});
