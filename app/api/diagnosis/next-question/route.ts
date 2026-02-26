import { NextRequest, NextResponse } from "next/server";
import { generateGeminiText, GeminiApiError } from "@/lib/gemini";
import { parseJsonText } from "@/lib/json";
import type { NextQuestionResponse, QAPair } from "@/app/types";

type NextQuestionBody = {
  history: QAPair[];
  minQuestions?: number;
  maxQuestions?: number;
};

const FALLBACK_QUESTIONS = [
  "これまで触れていない観点として、今いちばん不安に感じていることは何ですか？",
  "あなたが最近うれしかった出来事を1つ挙げて、その理由を教えてください。",
  "人間関係で大切にしているルールや価値観があれば教えてください。",
  "仕事や学びで、今後1年で伸ばしたい力は何ですか？",
  "これまでの人生で、考え方が大きく変わった経験はありますか？",
  "理想の1日の過ごし方を、朝から夜まで具体的に教えてください。",
];

const ANALYSIS_AXES = [
  "現在の生活と環境",
  "価値観と信念",
  "強みとスキル",
  "恐れと不安",
  "人間関係",
  "キャリアとお金",
  "健康とライフスタイル",
  "10年後の理想像",
] as const;

const AXIS_KEYWORDS: Record<(typeof ANALYSIS_AXES)[number], string[]> = {
  現在の生活と環境: ["現在", "生活", "状況", "住", "仕事", "毎日", "環境"],
  価値観と信念: ["価値観", "大事", "信念", "理念", "優先", "意味"],
  強みとスキル: ["強み", "得意", "スキル", "能力", "経験", "実績"],
  恐れと不安: ["恐れ", "不安", "怖", "失敗", "リスク", "心配"],
  人間関係: ["家族", "友人", "恋人", "結婚", "人間関係", "コミュニティ"],
  キャリアとお金: ["キャリア", "転職", "独立", "収入", "年収", "資産", "お金"],
  健康とライフスタイル: ["健康", "睡眠", "運動", "食事", "習慣", "ストレス"],
  "10年後の理想像": ["10年後", "将来", "理想", "ビジョン", "夢", "目標"],
};

function countRecentDeepDive(history: QAPair[]) {
  let count = 0;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i]?.questionType === "深掘り質問") {
      count += 1;
      continue;
    }
    break;
  }
  return count;
}

function normalizeQuestionText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function isDuplicateQuestion(history: QAPair[], question: string) {
  const normalized = normalizeQuestionText(question);
  return history.some(
    (item) => normalizeQuestionText(item.question) === normalized
  );
}

function pickFallbackQuestion(history: QAPair[]) {
  const asked = new Set(
    history.map((item) => normalizeQuestionText(item.question))
  );
  const candidate = FALLBACK_QUESTIONS.find(
    (question) => !asked.has(normalizeQuestionText(question))
  );

  if (candidate) {
    return candidate;
  }

  // Ensure uniqueness even when all fallback questions were already used.
  return `これまでと違う切り口で伺います。最近の出来事から、あなたらしさが表れた場面を具体的に教えてください。（${history.length + 1}）`;
}

function detectCoveredAxes(history: QAPair[]) {
  const covered = new Set<string>();
  const text = history
    .map((h) => `${h.question} ${h.answer}`.toLowerCase())
    .join("\n");

  for (const axis of ANALYSIS_AXES) {
    const keywords = AXIS_KEYWORDS[axis];
    if (keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
      covered.add(axis);
    }
  }

  return covered;
}

export async function POST(req: NextRequest) {
  let history: QAPair[] = [];
  let minQuestions = 12;
  let maxQuestions = 20;
  try {
    const body = (await req.json()) as NextQuestionBody;
    history = body.history ?? [];
    const hasAskedBefore = history.length > 0;
    minQuestions = body.minQuestions ?? 12;
    maxQuestions = body.maxQuestions ?? 20;
    const recentDeepDiveCount = countRecentDeepDive(history);
    const coveredAxes = detectCoveredAxes(history);
    const uncoveredAxes = ANALYSIS_AXES.filter((axis) => !coveredAxes.has(axis));
    const preferredAxis =
      uncoveredAxes[0] ?? "未カバー軸がない場合はバランスが崩れない軸";

    const prompt = `
You are an interview AI for life planning.
Based on the answer history, return exactly one next question in Japanese.
Use natural and clear Japanese.

Constraints:
- Minimum total questions: ${minQuestions}
- Maximum total questions: ${maxQuestions}
- If enough information is collected, you may set shouldFinish=true
- questionType must be one of: 初期質問, 深掘り質問, 関連質問, 補足質問
- estimatedTotalQuestions must be between ${minQuestions} and ${maxQuestions}
- reasoning should be short
- Do not keep deep-diving on the same topic repeatedly.
- Do not use "初期質問" when history is not empty.
- If deep-dive was used 2 times in a row, the next question should be "関連質問".
- Prioritize unexplored perspectives to keep the interview multi-dimensional.

Current balance context:
- recentDeepDiveCount: ${recentDeepDiveCount}
- hasAskedBefore: ${hasAskedBefore}
- coveredAxes: ${JSON.stringify(Array.from(coveredAxes))}
- uncoveredAxes: ${JSON.stringify(uncoveredAxes)}
- preferredAxisForNextQuestion: ${preferredAxis}

History JSON:
${JSON.stringify(history, null, 2)}

Return JSON only:
{
  "question": "next question",
  "questionType": "深掘り質問",
  "shouldFinish": false,
  "estimatedTotalQuestions": 14,
  "reasoning": "short reason"
}
`;

    const raw = await generateGeminiText(prompt);
    const parsed = parseJsonText<NextQuestionResponse>(raw);

    if (!parsed.question || !parsed.questionType) {
      throw new Error("Invalid response format from question generator.");
    }

    const wasDuplicated = isDuplicateQuestion(history, parsed.question);
    const normalizedQuestion = wasDuplicated
      ? pickFallbackQuestion(history)
      : parsed.question;

    const normalized: NextQuestionResponse = {
      question: normalizedQuestion,
      questionType:
        hasAskedBefore && parsed.questionType === "初期質問"
          ? "関連質問"
          : recentDeepDiveCount >= 2 && parsed.questionType === "深掘り質問"
            ? "関連質問"
            : parsed.questionType,
      shouldFinish: Boolean(parsed.shouldFinish),
      estimatedTotalQuestions: Math.max(
        minQuestions,
        Math.min(maxQuestions, parsed.estimatedTotalQuestions || minQuestions)
      ),
      reasoning: wasDuplicated
        ? parsed.reasoning
          ? `${parsed.reasoning} deduplicated`
          : "deduplicated"
        : parsed.reasoning || "",
    };

    return NextResponse.json(normalized);
  } catch (error) {
    if (error instanceof GeminiApiError) {
      if (error.status === 429) {
        const fallback: NextQuestionResponse = {
          question: pickFallbackQuestion(history),
          questionType: history.length > 0 ? "関連質問" : "初期質問",
          shouldFinish: history.length >= minQuestions,
          estimatedTotalQuestions: Math.max(minQuestions, Math.min(maxQuestions, 14)),
          reasoning: "quota fallback",
        };
        return NextResponse.json(fallback);
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to generate next question.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
