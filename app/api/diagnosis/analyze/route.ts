import { NextRequest, NextResponse } from "next/server";
import { generateGeminiText, GeminiApiError } from "@/lib/gemini";
import { parseJsonText } from "@/lib/json";
import type { AnalysisResult, QAPair } from "@/app/types";

type AnalyzeBody = {
  history: QAPair[];
};

function buildFallbackAnalysis(history: QAPair[]): AnalysisResult {
  const recentAnswers = history
    .slice(-3)
    .map((item) => item.answer.trim())
    .filter(Boolean);

  const summarySource =
    recentAnswers.length > 0
      ? recentAnswers.join(" / ")
      : "回答履歴から傾向を抽出中です。";

  return {
    personalityType: "バランス探求タイプ",
    summary: `Geminiのクォータ超過のため簡易分析を返しています。最近の回答傾向: ${summarySource}`,
    confidence: 0.42,
    traitScores: [
      { label: "計画性", value: 62, comment: "回答内容から中程度の計画性が見えます。" },
      { label: "社交性", value: 58, comment: "状況に応じて対人スタイルを調整する傾向です。" },
      { label: "創造性", value: 64, comment: "言語化の中に独自の視点が含まれています。" },
      { label: "実行力", value: 60, comment: "目標達成に向けて継続する意識があります。" },
      { label: "柔軟性", value: 66, comment: "変化に合わせた再解釈がしやすい傾向です." },
    ],
    timelineItems: [
      "現在: 現状の自己理解を言語化する段階",
      "1年以内: 価値観に沿った選択基準を明確化",
      "3年以内: 強みを活かした領域で成果を積み上げる",
      "5年以内: 長期テーマを軸に役割を広げる",
    ],
    storyChapters: [
      { title: "第1章: 現在地", body: "今の状態を客観視し、判断軸を整理する時期です。" },
      { title: "第2章: 再定義", body: "経験の意味づけを更新し、行動方針を絞り込みます。" },
      { title: "第3章: 実装", body: "小さな実践を積み上げ、再現性のある成長を作ります。" },
      { title: "エピローグ: 拡張", body: "得意領域を他者貢献につなげる段階に入ります。" },
    ],
    ageAdvices: [
      { age: "20代", advice: "試行回数を増やし、向き不向きの解像度を上げてください。" },
      { age: "30代", advice: "選択と集中を進め、強みの市場価値を高めてください。" },
      { age: "40代", advice: "役割の幅を持たせつつ、核となる軸を維持してください。" },
      { age: "50代", advice: "経験の体系化を進め、再現可能な知見として残してください。" },
      { age: "60代以降", advice: "価値の継承と、自分らしい活動の持続性を両立してください。" },
    ],
  };
}

export async function POST(req: NextRequest) {
  let history: QAPair[] = [];
  try {
    const body = (await req.json()) as AnalyzeBody;
    history = body.history ?? [];

    if (history.length < 3) {
      return NextResponse.json(
        { error: "At least 3 answers are required for analysis." },
        { status: 400 }
      );
    }

    const prompt = `
You are a life-planning analyst AI.
Create a personalized analysis in Japanese based on the answer history.
Be specific but realistic.

History JSON:
${JSON.stringify(history, null, 2)}

Return JSON only:
{
  "personalityType": "人格タイプ名",
  "summary": "120文字以内の要約",
  "confidence": 0.78,
  "traitScores": [
    { "label": "規律性", "value": 80, "comment": "短評" },
    { "label": "社交性", "value": 70, "comment": "短評" },
    { "label": "冒険心", "value": 65, "comment": "短評" },
    { "label": "創造性", "value": 88, "comment": "短評" },
    { "label": "安定性", "value": 60, "comment": "短評" }
  ],
  "timelineItems": ["年齢: 出来事", "年齢: 出来事", "年齢: 出来事", "年齢: 出来事"],
  "storyChapters": [
    { "title": "第1章: 覚醒", "body": "内容" },
    { "title": "第2章: 飛躍", "body": "内容" },
    { "title": "第3章: 成熟", "body": "内容" },
    { "title": "エピローグ: 到達", "body": "内容" }
  ],
  "ageAdvices": [
    { "age": "20代", "advice": "助言" },
    { "age": "30代", "advice": "助言" },
    { "age": "40代", "advice": "助言" },
    { "age": "50代", "advice": "助言" },
    { "age": "60代以降", "advice": "助言" }
  ]
}
`;

    const raw = await generateGeminiText(prompt);
    const parsed = parseJsonText<AnalysisResult>(raw);

    if (!parsed.personalityType || !Array.isArray(parsed.traitScores)) {
      throw new Error("Invalid analysis response format.");
    }

    return NextResponse.json(parsed);
  } catch (error) {
    if (error instanceof GeminiApiError) {
      if (error.status === 429) {
        return NextResponse.json(buildFallbackAnalysis(history));
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to analyze answers.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
