import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  LayoutChangeEvent,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useScrollToTop } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Svg, { Circle, Path } from 'react-native-svg';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { getMe } from '../../api/auth';
import { getCurrentUserRbti } from '../../api/rbti';
import { getMyLibraryBooks, type UserLibraryBook } from '../../api/books';
import UserProfileHeader, { userProfileHeaderStyles } from '../../components/UserProfileHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type MenuItem = {
  id: string;
  label: string;
  icon: string;
};

type CalendarDay = {
  day: number | null;
  coverUrl?: string;
};

type StatItem = {
  label: string;
  percent: string;
  value: number;
  count: number;
  fill: string;
  textColor: string;
};

const MENU_ITEMS: MenuItem[] = [
  { id: 'rbti-retest', label: 'RBTI\n재검사', icon: 'clipboard-outline' },
  { id: 'rbti-record', label: 'RBTI\n기록', icon: 'search-outline' },
  { id: 'my-review', label: '나의\n리뷰', icon: 'star-outline' },
  { id: 'quote-note', label: '필사\n노트', icon: 'document-text-outline' },
  { id: 'liked-review', label: '좋아한\n리뷰', icon: 'heart' },
  { id: 'reading-calendar', label: '독서\n달력', icon: 'calendar-outline' },
  { id: 'reading-stats', label: '독서\n통계', icon: 'bar-chart-outline' },
  { id: 'settings', label: '설정', icon: 'settings' },
];

const WEEK_LABELS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEAR_OPTIONS = Array.from({ length: 41 }, (_, index) => 2000 + index);
const PICKER_ITEM_HEIGHT = 44;
const PICKER_ITEM_GAP = 8;
const PICKER_VISIBLE_HEIGHT = 260;
const PICKER_ROW_UNIT = PICKER_ITEM_HEIGHT + PICKER_ITEM_GAP;

const STAT_COLORS = [
  '#F2B84B',
  '#E8795E',
  '#5FAF96',
  '#5C9DDC',
  '#9B7BD9',
  '#D66FA3',
  '#7EA34D',
  '#C9823E',
  '#4FA6B8',
  '#8B7A66',
];

const CELL_GAP = 8;
const CALENDAR_HORIZONTAL = 36;
const CELL_WIDTH = (SCREEN_WIDTH - CALENDAR_HORIZONTAL * 2 - CELL_GAP * 6) / 7;
const DONUT_SIZE = Math.min(SCREEN_WIDTH - 72, 300);
const DONUT_STROKE_WIDTH = 40;
const REFRESH_SCROLL_THRESHOLD = 8;

function buildCalendarDays(year: number, month: number, completedCoverByDay: Map<number, string>): CalendarDay[] {
  const firstWeekdaySundayStart = new Date(year, month, 1).getDay();
  const firstWeekdayMondayStart = (firstWeekdaySundayStart + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: CalendarDay[] = [];

  for (let i = 0; i < firstWeekdayMondayStart; i += 1) {
    days.push({ day: null });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({ day, coverUrl: completedCoverByDay.get(day) });
  }

  const trailingEmptyCells = (7 - (days.length % 7)) % 7;
  for (let i = 0; i < trailingEmptyCells; i += 1) {
    days.push({ day: null });
  }

  return days;
}

function getDateParts(value: string | null): { year: number; month: number; day: number } | null {
  if (!value) {
    return null;
  }

  const raw = value.slice(0, 10);
  const [yearText, monthText, dayText] = raw.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return { year, month, day };
}

function buildBookTypeStats(books: UserLibraryBook[]): StatItem[] {
  const countByType = new Map<string, number>();

  books.forEach((book) => {
    const bookType = book.book_category?.trim() || '미분류';
    countByType.set(bookType, (countByType.get(bookType) ?? 0) + 1);
  });

  const totalCount = books.length;
  if (totalCount === 0) {
    return [];
  }

  return Array.from(countByType.entries())
    .sort(([leftLabel, leftCount], [rightLabel, rightCount]) => {
      if (rightCount !== leftCount) {
        return rightCount - leftCount;
      }

      return leftLabel.localeCompare(rightLabel, 'ko');
    })
    .map(([label, count], index) => {
      const value = (count / totalCount) * 100;
      const fill = STAT_COLORS[index % STAT_COLORS.length];

      return {
        label,
        count,
        value,
        percent: `${value.toFixed(1)}%`,
        fill,
        textColor: fill,
      };
    });
}

function getDonutPoint(center: number, radius: number, angle: number) {
  const angleInRadians = ((angle - 90) * Math.PI) / 180;

  return {
    x: center + radius * Math.cos(angleInRadians),
    y: center + radius * Math.sin(angleInRadians),
  };
}

function describeDonutSegment(
  center: number,
  outerRadius: number,
  innerRadius: number,
  startPercent: number,
  endPercent: number
) {
  const startAngle = (startPercent / 100) * 360;
  const endAngle = (endPercent / 100) * 360;
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  const outerStart = getDonutPoint(center, outerRadius, startAngle);
  const outerEnd = getDonutPoint(center, outerRadius, endAngle);
  const innerStart = getDonutPoint(center, innerRadius, startAngle);
  const innerEnd = getDonutPoint(center, innerRadius, endAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

export default function MyPageScreen() {
  const [userRbtiName, setUserRbtiName] = useState<string>('');
  const [userNickname, setUserNickname] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const [calendarDividerY, setCalendarDividerY] = useState(0);
  const [calendarSectionY, setCalendarSectionY] = useState(0);
  const [statsSectionY, setStatsSectionY] = useState(0);
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();

  const fetchUserProfile = useCallback(async () => {
    try {
      const userResponse = await getMe();
      setUserNickname(userResponse.nickname);
    } catch (error) {
      setUserNickname('');
    }

    try {
      const rbtiResponse = await getCurrentUserRbti();
      if (rbtiResponse.has_rbti && rbtiResponse.current_rbti?.rbti_name) {
        setUserRbtiName(rbtiResponse.current_rbti.rbti_name);
      } else {
        setUserRbtiName('');
      }
    } catch (error) {
      setUserRbtiName('');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchUserProfile();
    }, [fetchUserProfile, refreshKey]),
  );
  useScrollToTop(scrollViewRef);

  useEffect(() => {
    const parentNavigation = navigation.getParent();
    if (!parentNavigation) {
      return undefined;
    }

    return (parentNavigation as any).addListener('tabPress', () => {
      if (!navigation.isFocused() || scrollYRef.current > REFRESH_SCROLL_THRESHOLD) {
        return;
      }

      setRefreshKey((prev) => prev + 1);
    });
  }, [navigation]);

  const scrollToCalendarSection = useCallback(() => {
    const targetY = calendarDividerY > 0 ? calendarDividerY : calendarSectionY;
    scrollViewRef.current?.scrollTo({ y: Math.max(0, targetY - 8), animated: true });
  }, [calendarDividerY, calendarSectionY]);

  const scrollToStatsSection = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: Math.max(0, statsSectionY - 8), animated: true });
  }, [statsSectionY]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(event) => {
          scrollYRef.current = event.nativeEvent.contentOffset.y;
        }}
        contentContainerStyle={styles.contentContainer}
      >
        <UserProfileHeader
          rbtiName={userRbtiName}
          nickname={userNickname}
          rightAccessory={(
            <Pressable style={userProfileHeaderStyles.editButton} hitSlop={10}>
              <Text style={userProfileHeaderStyles.editButtonText}>프로필 수정</Text>
            </Pressable>
          )}
        />

        <MenuGrid
          onReadingCalendarPress={scrollToCalendarSection}
          onReadingStatsPress={scrollToStatsSection}
        />

        <DividerBlock
          onLayout={(event) => {
            setCalendarDividerY(event.nativeEvent.layout.y);
          }}
        />

        <ReadingCalendarSection
          refreshKey={refreshKey}
          onLayout={(event) => {
            setCalendarSectionY(event.nativeEvent.layout.y);
          }}
        />

        <DividerBlock />

        <ReadingStatsSection
          refreshKey={refreshKey}
          onLayout={(event) => {
            setStatsSectionY(event.nativeEvent.layout.y);
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuGrid({
  onReadingCalendarPress,
  onReadingStatsPress,
}: {
  onReadingCalendarPress: () => void;
  onReadingStatsPress: () => void;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();

  const handleMenuPress = (id: MenuItem['id']) => {
    if (id === 'rbti-retest') {
      navigation.navigate('RbtiSurvey');
    }

    if (id === 'rbti-record') {
      navigation.navigate('RbtiHistory');
    }

    if (id === 'my-review') {
      navigation.navigate('MyReview');
    }

    if (id === 'quote-note') {
      navigation.navigate('MyQuoteNote');
    }

    if (id === 'liked-review') {
      navigation.navigate('FavoriteReview');
    }

    if (id === 'settings') {
      navigation.navigate('Settings');
    }

    if (id === 'reading-calendar') {
      onReadingCalendarPress();
    }

    if (id === 'reading-stats') {
      onReadingStatsPress();
    }
  };

  return (
    <View style={styles.menuGrid}>
      {MENU_ITEMS.map((item) => (
        <Pressable key={item.id} style={styles.menuItem} onPress={() => handleMenuPress(item.id)}>
          <Ionicons name={item.icon} size={34} color="#FEC54B" />
          <Text style={styles.menuText}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function DividerBlock({ onLayout }: { onLayout?: (event: LayoutChangeEvent) => void }) {
  return <View style={styles.dividerBlock} onLayout={onLayout} />;
}

function ReadingCalendarSection({
  refreshKey,
  onLayout,
}: {
  refreshKey: number;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [draftYear, setDraftYear] = useState<number>(today.getFullYear());
  const [draftMonth, setDraftMonth] = useState<number>(today.getMonth());
  const [completedBooks, setCompletedBooks] = useState<UserLibraryBook[]>([]);
  const yearScrollRef = useRef<ScrollView>(null);
  const monthScrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      const fetchCompletedBooks = async () => {
        try {
          const doneBooks = await getMyLibraryBooks('DONE');
          setCompletedBooks(doneBooks);
        } catch (error) {
          setCompletedBooks([]);
        }
      };

      void fetchCompletedBooks();
    }, [refreshKey]),
  );

  const completedCoverByDay = useMemo(() => {
    const coverByDay = new Map<number, string>();

    completedBooks.forEach((book) => {
      const dateParts = getDateParts(book.finished_at);
      if (!dateParts) {
        return;
      }

      const isSameYear = dateParts.year === selectedYear;
      const isSameMonth = dateParts.month === selectedMonth + 1;
      if (!isSameYear || !isSameMonth) {
        return;
      }

      if (!book.book_thumbnail_url || coverByDay.has(dateParts.day)) {
        return;
      }

      coverByDay.set(dateParts.day, book.book_thumbnail_url);
    });

    return coverByDay;
  }, [completedBooks, selectedMonth, selectedYear]);

  const calendarDays = useMemo(
    () => buildCalendarDays(selectedYear, selectedMonth, completedCoverByDay),
    [completedCoverByDay, selectedYear, selectedMonth],
  );

  const openPicker = () => {
    setDraftYear(selectedYear);
    setDraftMonth(selectedMonth);
    setIsPickerVisible(true);

    requestAnimationFrame(() => {
      const yearIndex = YEAR_OPTIONS.findIndex((year) => year === selectedYear);
      const yearOffset = Math.max(
        0,
        yearIndex * PICKER_ROW_UNIT - (PICKER_VISIBLE_HEIGHT - PICKER_ITEM_HEIGHT) / 2,
      );
      const monthOffset = Math.max(
        0,
        selectedMonth * PICKER_ROW_UNIT - (PICKER_VISIBLE_HEIGHT - PICKER_ITEM_HEIGHT) / 2,
      );

      yearScrollRef.current?.scrollTo({ y: yearOffset, animated: false });
      monthScrollRef.current?.scrollTo({ y: monthOffset, animated: false });
    });
  };

  const applySelectedMonthYear = () => {
    setSelectedYear(draftYear);
    setSelectedMonth(draftMonth);
    setIsPickerVisible(false);
  };

  return (
    <View style={styles.section} onLayout={onLayout}>
      <Text style={styles.sectionTitle}>독서 달력</Text>

      <View style={styles.calendarHeaderRow}>
        <Pressable style={styles.monthButton} onPress={openPicker}>
          <Text style={styles.monthText}>{`${MONTH_LABELS[selectedMonth]} ${selectedYear}`}</Text>
          <Ionicons name="chevron-down" size={20} color="#FEC54B" />
        </Pressable>

        <Pressable>
          <Ionicons name="share-outline" size={24} color="#FEC54B" />
        </Pressable>
      </View>

      <View style={styles.weekHeaderRow}>
        {WEEK_LABELS.map((label) => (
          <Text key={label} style={styles.weekLabel}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {calendarDays.map((item, index) => (
          <CalendarCell key={`${selectedYear}-${selectedMonth}-${item.day}-${index}`} item={item} weekdayIndex={index % 7} />
        ))}
      </View>

      <Modal
        visible={isPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPickerVisible(false)}
      >
        <Pressable style={styles.pickerBackdrop} onPress={() => setIsPickerVisible(false)}>
          <Pressable style={styles.pickerCard} onPress={() => {}}>
            <Text style={styles.pickerTitle}>연도/월 선택</Text>

            <View style={styles.pickerColumns}>
              <ScrollView ref={yearScrollRef} style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                {YEAR_OPTIONS.map((year) => (
                  <Pressable
                    key={year}
                    style={[styles.pickerItem, draftYear === year && styles.pickerItemSelected]}
                    onPress={() => setDraftYear(year)}
                  >
                    <Text style={[styles.pickerItemText, draftYear === year && styles.pickerItemTextSelected]}>
                      {year}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <ScrollView ref={monthScrollRef} style={styles.pickerColumn} showsVerticalScrollIndicator={false}>
                {MONTH_LABELS.map((monthLabel, monthIndex) => (
                  <Pressable
                    key={monthLabel}
                    style={[styles.pickerItem, draftMonth === monthIndex && styles.pickerItemSelected]}
                    onPress={() => setDraftMonth(monthIndex)}
                  >
                    <Text style={[styles.pickerItemText, draftMonth === monthIndex && styles.pickerItemTextSelected]}>
                      {monthLabel}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.pickerActionRow}>
              <Pressable style={styles.pickerCancelButton} onPress={() => setIsPickerVisible(false)}>
                <Text style={styles.pickerCancelText}>취소</Text>
              </Pressable>
              <Pressable style={styles.pickerApplyButton} onPress={applySelectedMonthYear}>
                <Text style={styles.pickerApplyText}>적용</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function CalendarCell({ item, weekdayIndex }: { item: CalendarDay; weekdayIndex: number }) {
  if (item.day === null) {
    return <View style={styles.calendarCell} />;
  }

  const isSaturday = weekdayIndex === 5;
  const isSunday = weekdayIndex === 6;

  return (
    <View style={styles.calendarCell}>
      <View style={styles.bookSlot}>
        {item.coverUrl ? (
          <Image source={{ uri: item.coverUrl }} style={styles.bookCover} resizeMode="cover" />
        ) : null}
        {!item.coverUrl ? (
          <Text
            style={[
              styles.dayNumber,
              isSaturday && styles.saturdayText,
              isSunday && styles.sundayText,
            ]}
          >
            {item.day}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function DonutChart({ data, totalCount }: { data: StatItem[]; totalCount: number }) {
  const center = DONUT_SIZE / 2;
  const outerRadius = center;
  const innerRadius = center - DONUT_STROKE_WIDTH;
  let cumulativePercent = 0;

  return (
    <View style={styles.donutChartWrap}>
      <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
        {data.length === 1 ? (
          <Circle
            cx={center}
            cy={center}
            r={outerRadius - DONUT_STROKE_WIDTH / 2}
            fill="none"
            stroke={data[0].fill}
            strokeWidth={DONUT_STROKE_WIDTH}
          />
        ) : (
          data.map((item, index) => {
            const startPercent = cumulativePercent;
            const endPercent = index === data.length - 1 ? 100 : Math.min(100, cumulativePercent + item.value);
            cumulativePercent = endPercent;

            return (
              <Path
                key={item.label}
                d={describeDonutSegment(center, outerRadius, innerRadius, startPercent, endPercent)}
                fill={item.fill}
              />
            );
          })
        )}
      </Svg>

      <View style={styles.donutCenterHole}>
        <Text style={styles.donutCenterTitle}>도서 분야</Text>
        <Text style={styles.donutCenterCount}>{totalCount}권</Text>
      </View>
    </View>
  );
}

function ReadingStatsSection({
  refreshKey,
  onLayout,
}: {
  refreshKey: number;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const [completedBooks, setCompletedBooks] = useState<UserLibraryBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchCompletedBooks = async () => {
        setIsLoading(true);

        try {
          const doneBooks = await getMyLibraryBooks('DONE');
          if (isActive) {
            setCompletedBooks(doneBooks);
          }
        } catch (error) {
          if (isActive) {
            setCompletedBooks([]);
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      };

      void fetchCompletedBooks();

      return () => {
        isActive = false;
      };
    }, [refreshKey]),
  );

  const stats = useMemo(() => buildBookTypeStats(completedBooks), [completedBooks]);
  const totalCount = completedBooks.length;

  return (
    <View style={styles.section} onLayout={onLayout}>
      <Text style={styles.sectionTitle}>독서 통계</Text>

      <View style={styles.statsTextWrap}>
        <Text style={styles.statsMainTitle}>도서 분야</Text>
        <Text style={styles.statsSubTitle}>
          {isLoading ? '"완료" 상태의 도서 기준' : `"완료" 상태의 도서 ${totalCount}권 기준`}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.statsStateBox}>
          <ActivityIndicator color="#FEC54B" />
          <Text style={styles.statsStateText}>통계를 불러오는 중이에요</Text>
        </View>
      ) : stats.length > 0 ? (
        <View style={styles.donutSection}>
          <DonutChart data={stats} totalCount={totalCount} />

          <View style={styles.statsLegendWrap}>
            {stats.map((item) => (
              <View key={item.label} style={styles.statsLegendRow}>
                <View style={[styles.legendDot, { backgroundColor: item.fill }]} />
                <Text style={styles.statsLegendLabel} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={styles.statsLegendMeta}>{item.count}권</Text>
                <View style={styles.percentPill}>
                  <Text style={[styles.percentText, { color: item.textColor }]}>{item.percent}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.statsStateBox}>
          <Text style={styles.statsStateTitle}>완료한 책이 아직 없어요.</Text>
          <Text style={styles.statsStateText}>책을 완료하면 분야별 통계가 자동으로 표시됩니다.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    paddingTop: 18,
    paddingBottom: 130,
  },

  menuGrid: {
    paddingHorizontal: 34,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 28,
    marginBottom: 34,
  },
  menuItem: {
    width: '22%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    color: '#32353B',
    textAlign: 'center',
  },

  dividerBlock: {
    height: 25,
    backgroundColor: '#FFF6EA',
    marginBottom: 24,
  },

  section: {
    paddingHorizontal: 36,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#202228',
    marginBottom: 26,
  },

  calendarHeaderRow: {
    marginBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 19,
    fontWeight: '700',
    color: '#3A3D43',
    marginRight: 6,
  },

  weekHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  weekLabel: {
    width: CELL_WIDTH,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#9598A1',
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: CELL_GAP,
    rowGap: 18,
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2025',
    marginBottom: 14,
    textAlign: 'center',
  },
  pickerColumns: {
    flexDirection: 'row',
    columnGap: 10,
    marginBottom: 14,
  },
  pickerColumn: {
    flex: 1,
    maxHeight: 260,
  },
  pickerItem: {
    borderRadius: 10,
    height: PICKER_ITEM_HEIGHT,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItemSelected: {
    backgroundColor: '#FFF6EA',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#454851',
    fontWeight: '500',
  },
  pickerItemTextSelected: {
    color: '#E67F1E',
    fontWeight: '700',
  },
  pickerActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    columnGap: 8,
  },
  pickerCancelButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#EFEFF1',
  },
  pickerCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5A5D66',
  },
  pickerApplyButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FEC54B',
  },
  pickerApplyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  calendarCell: {
    width: CELL_WIDTH,
    alignItems: 'center',
  },
  bookSlot: {
    width: CELL_WIDTH,
    height: CELL_WIDTH * 1.42,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bookCover: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A4D55',
  },
  saturdayText: {
    color: '#1385FF',
  },
  sundayText: {
    color: '#FF5D89',
  },

  statsTextWrap: {
    marginBottom: 26,
  },
  statsMainTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2A2D33',
    marginBottom: 4,
  },
  statsSubTitle: {
    fontSize: 12,
    color: '#8A8E98',
  },

  donutSection: {
    alignItems: 'center',
  },
  donutChartWrap: {
    width: DONUT_SIZE,
    height: DONUT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterHole: {
    position: 'absolute',
    width: DONUT_SIZE - DONUT_STROKE_WIDTH * 2,
    height: DONUT_SIZE - DONUT_STROKE_WIDTH * 2,
    borderRadius: 999,
    backgroundColor: '#F6F6F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#A8844C',
  },
  donutCenterCount: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '800',
    color: '#2A2D33',
  },
  statsLegendWrap: {
    marginTop: 20,
    width: '100%',
    rowGap: 10,
  },
  statsLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statsLegendLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#2A2D33',
  },
  statsLegendMeta: {
    marginRight: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#8A8E98',
  },
  percentPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#FFF5E8',
  },
  percentText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DCA047',
  },
  statsStateBox: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: 10,
  },
  statsStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A2D33',
  },
  statsStateText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8A8E98',
    textAlign: 'center',
  },
});
