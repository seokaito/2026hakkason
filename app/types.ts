export type QAPair = {
  question: string;
  answer: string;
  questionType: "初期質問" | "深掘り質問" | "関連質問" | "補足質問";
};

export type NextQuestionResponse = {
  question: string;
  questionType: QAPair["questionType"];
  shouldFinish: boolean;
  estimatedTotalQuestions: number;
  reasoning: string;
};

export type TraitScore = {
  label: "規律性" | "社交性" | "冒険心" | "創造性" | "安定性";
  value: number;
  comment: string;
};

export type AnalysisResult = {
  personalityType: string;
  summary: string;
  confidence: number;
  traitScores: TraitScore[];
  timelineItems: string[];
  storyChapters: { title: string; body: string }[];
  ageAdvices: { age: string; advice: string }[];
};
