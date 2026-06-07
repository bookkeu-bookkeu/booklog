import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Alert,
  PanResponder,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import BottomActionButton from "../../components/BottomActionButton";
import {
  getRbtiSurveyQuestions,
  submitRbtiSurvey,
  type RbtiSurveyQuestion,
} from "../../api/rbti";

type Props = {
  isRequired?: boolean;
  onCompleted?: () => void;
};

export default function RbtiSurveyScreen({ isRequired = false, onCompleted }: Props) {
  const navigation = useNavigation();
  const allowExitRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questions, setQuestions] = useState<RbtiSurveyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await getRbtiSurveyQuestions({ random: true });
      setQuestions(response.questions);
      setCurrentIndex(0);
      setAnswers({});
      setIsSubmitted(false);
    } catch (error) {
      console.log("RBTI 설문 문항 조회 실패", error);
      setErrorMessage("설문 문항을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (allowExitRef.current) {
        return;
      }

      if (isSubmitting) {
        event.preventDefault();
        return;
      }

      if (isSubmitted || currentIndex === 0) {
        return;
      }

      event.preventDefault();
      setCurrentIndex((prev) => prev - 1);
    });

    return unsubscribe;
  }, [currentIndex, isSubmitted, isSubmitting, navigation]);

  const currentQuestion = questions[currentIndex];
  const selectedChoiceId = currentQuestion ? answers[currentQuestion.id] ?? null : null;

  const progressPercent = useMemo(() => {
    if (questions.length === 0) {
      return 0;
    }

    return ((currentIndex + 1) / questions.length) * 100;
  }, [currentIndex, questions.length]);

  const handleSelectChoice = (choiceId: number) => {
    if (!currentQuestion) {
      return;
    }

    if (isSubmitted) {
      return;
    }

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: choiceId,
    }));
  };

  const handlePrevious = useCallback(() => {
    if (currentIndex === 0 || isSubmitting || isSubmitted) {
      return;
    }

    setCurrentIndex((prev) => prev - 1);
  }, [currentIndex, isSubmitted, isSubmitting]);

  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) => {
          const isRightSwipe = gestureState.dx > 24;
          const isMostlyHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.6;

          return isRightSwipe && isMostlyHorizontal;
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.dx > 70) {
            handlePrevious();
          }
        },
      }),
    [handlePrevious],
  );

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    if (isRequired) {
      Alert.alert("RBTI 검사", "서비스 이용을 위해 RBTI 검사를 먼저 완료해주세요.");
      return;
    }

    allowExitRef.current = true;
    navigation.goBack();
  };

  const handleNext = async () => {
    if (!currentQuestion) {
      return;
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    const answerPayload = questions
      .map((question) => {
        const choiceId = answers[question.id];

        if (!choiceId) {
          return null;
        }

        return {
          question_id: question.id,
          choice_id: choiceId,
        };
      })
      .filter((answer): answer is { question_id: number; choice_id: number } => answer !== null);

    if (answerPayload.length !== questions.length) {
      Alert.alert("응답 확인", "모든 문항에 답변해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitRbtiSurvey({
        is_retest: false,
        answers: answerPayload,
      });

      Alert.alert(
        "RBTI 검사 완료",
        `${result.current_rbti.rbti_name} 유형으로 저장되었습니다.`,
        [
          {
            text: "확인",
            onPress: () => {
              allowExitRef.current = true;
              if (onCompleted) {
                onCompleted();
                return;
              }
              navigation.goBack();
            },
          },
        ],
      );
      setIsSubmitted(true);
    } catch (error) {
      console.log("RBTI 설문 제출 실패", error);
      Alert.alert("저장 실패", "검사 결과를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.stateArea}>
          <ActivityIndicator color={MAIN_COLOR} />
          <Text style={styles.stateText}>설문 문항을 불러오는 중입니다.</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.stateArea}>
          <Text style={styles.stateTitle}>문항을 불러올 수 없어요</Text>
          <Text style={styles.stateText}>{errorMessage}</Text>
          <Pressable onPress={fetchQuestions} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </Pressable>
        </View>
      );
    }

    if (!currentQuestion) {
      return (
        <View style={styles.stateArea}>
          <Text style={styles.stateTitle}>등록된 설문 문항이 없습니다.</Text>
          <Text style={styles.stateText}>관리자 페이지에서 RBTI 문항을 추가해주세요.</Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.questionArea}>
          <Text style={styles.questionText}>{currentQuestion.question_text}</Text>
          <Text style={styles.descriptionText}>
            아래 선택지 중 하나를 선택하세요.
          </Text>
        </View>

        <View style={styles.choiceList}>
          {currentQuestion.choices.map((choice) => {
            const isSelected = selectedChoiceId === choice.id;

            return (
              <Pressable
                key={choice.id}
                onPress={() => handleSelectChoice(choice.id)}
                style={[
                  styles.choiceButton,
                  isSelected && styles.choiceButtonSelected,
                ]}
              >
                <Text style={styles.choiceText}>
                  {choice.label}. {choice.choice_text}
                </Text>

                {isSelected && <Text style={styles.checkIcon}>✓</Text>}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.container} {...swipeResponder.panHandlers}>
        <View style={styles.header}>
          <Pressable
            onPress={handlePrevious}
            disabled={currentIndex === 0 || isSubmitting || isSubmitted}
            style={[
              styles.headerIconButton,
              (currentIndex === 0 || isSubmitting || isSubmitted) && styles.headerIconButtonDisabled,
            ]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={26} color={MAIN_COLOR} />
          </Pressable>

          <Pressable
            onPress={handleClose}
            disabled={isSubmitting}
            style={[
              styles.headerIconButton,
              (isSubmitting || isRequired) && styles.headerIconButtonDisabled,
            ]}
            hitSlop={8}
          >
            <Ionicons name="close" size={26} color={TEXT_MAIN} />
          </Pressable>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progressPercent}%`,
              },
            ]}
          />
        </View>

        {renderContent()}

        <View style={styles.bottomArea}>
          <BottomActionButton
            label={
              isSubmitted
                ? "저장 완료"
                : isSubmitting
                  ? "저장 중..."
                  : currentIndex === questions.length - 1
                    ? "검사 완료"
                    : "Next"
            }
            onPress={handleNext}
            disabled={
              isLoading ||
              isSubmitting ||
              isSubmitted ||
              !!errorMessage ||
              !currentQuestion ||
              selectedChoiceId === null
            }
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const MAIN_COLOR = "#FFC64A";
const SELECTED_BG = "#FFF5E8";
const BORDER_COLOR = "#E5E7EB";
const TEXT_MAIN = "#202124";
const TEXT_SUB = "#7A7F87";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    flex: 1,
    paddingHorizontal: 22,
    backgroundColor: "#FFFFFF",
  },

  header: {
    height: 44,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerIconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  headerIconButtonDisabled: {
    opacity: 0.28,
  },

  progressTrack: {
    width: "100%",
    height: 7,
    marginTop: 18,
    borderRadius: 999,
    backgroundColor: "#E9EAF0",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: MAIN_COLOR,
  },

  contentScroll: {
    flex: 1,
  },

  contentScrollContent: {
    paddingBottom: 24,
  },

  questionArea: {
    marginTop: 37,
  },

  questionText: {
    fontSize: 22,
    fontWeight: "800",
    color: TEXT_MAIN,
    letterSpacing: -0.4,
    lineHeight: 31,
  },

  descriptionText: {
    marginTop: 13,
    fontSize: 13,
    fontWeight: "400",
    color: TEXT_SUB,
    lineHeight: 20,
  },

  choiceList: {
    marginTop: 38,
    gap: 9,
  },

  choiceButton: {
    minHeight: 48,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  choiceButtonSelected: {
    borderColor: SELECTED_BG,
    backgroundColor: SELECTED_BG,
  },

  choiceText: {
    flex: 1,
    marginRight: 12,
    fontSize: 14,
    fontWeight: "400",
    color: TEXT_MAIN,
    lineHeight: 20,
  },

  checkIcon: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF8A00",
    marginRight: 1,
  },

  bottomArea: {
    marginTop: "auto",
    paddingBottom: 33,
  },

  stateArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  stateTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: TEXT_MAIN,
    textAlign: "center",
  },

  stateText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "400",
    color: TEXT_SUB,
    lineHeight: 20,
    textAlign: "center",
  },

  retryButton: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: MAIN_COLOR,
  },

  retryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT_MAIN,
  },
});
