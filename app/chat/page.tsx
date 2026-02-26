"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { AnalysisResult, NextQuestionResponse, QAPair } from "../types";

const STORAGE_HISTORY_KEY = "diagnosis_history_v1";
const STORAGE_RESULT_KEY = "diagnosis_result_v1";
const MIN_QUESTIONS = 12;
const MAX_QUESTIONS = 20;

const INITIAL_QUESTION: NextQuestionResponse = {
  question: "あなたは現在何歳ですか？いまの生活や状況も教えてください。",
  questionType: "初期質問",
  shouldFinish: false,
  estimatedTotalQuestions: 14,
  reasoning: "initial",
};

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [history, setHistory] = useState<QAPair[]>([]);
  const [current, setCurrent] = useState<NextQuestionResponse>(INITIAL_QUESTION);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = useMemo(() => {
    const estimated = current.estimatedTotalQuestions || MIN_QUESTIONS;
    return Math.min(100, Math.round((history.length / estimated) * 100));
  }, [current.estimatedTotalQuestions, history.length]);

  async function fetchNextQuestion(nextHistory: QAPair[]) {
    const res = await fetch("/api/diagnosis/next-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        history: nextHistory,
        minQuestions: MIN_QUESTIONS,
        maxQuestions: MAX_QUESTIONS,
      }),
    });
    const json = (await res.json()) as NextQuestionResponse | { error: string };
    if (!res.ok || "error" in json) {
      throw new Error("error" in json ? json.error : "質問生成に失敗しました。");
    }
    return json;
  }

  async function generateResult(nextHistory: QAPair[]) {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/diagnosis/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: nextHistory }),
      });
      const json = (await res.json()) as AnalysisResult | { error: string };
      if (!res.ok || "error" in json) {
        throw new Error("error" in json ? json.error : "分析に失敗しました。");
      }
      localStorage.setItem(STORAGE_RESULT_KEY, JSON.stringify(json));
      router.push("/result");
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "結果生成に失敗しました。";
      setError(message);
    } finally {
      setAnalyzing(false);
    }
  }

  const initialize = useCallback(() => {
    setError(null);
    try {
      const shouldReset = searchParams.get("reset") === "1";
      if (shouldReset) {
        localStorage.removeItem(STORAGE_HISTORY_KEY);
        localStorage.removeItem(STORAGE_RESULT_KEY);
      }

      const saved = localStorage.getItem(STORAGE_HISTORY_KEY);
      const parsed = saved ? (JSON.parse(saved) as QAPair[]) : [];
      setHistory(parsed);
      setCurrent(INITIAL_QUESTION);
    } catch {
      setHistory([]);
      setCurrent(INITIAL_QUESTION);
    }
  }, [searchParams]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  async function submitAnswer() {
    if (!answer.trim() || loading || analyzing) return;

    setLoading(true);
    setError(null);
    try {
      const nextHistory: QAPair[] = [
        ...history,
        {
          question: current.question,
          answer: answer.trim(),
          questionType: current.questionType,
        },
      ];
      setHistory(nextHistory);
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(nextHistory));
      setAnswer("");

      if (current.shouldFinish && nextHistory.length >= MIN_QUESTIONS) {
        await generateResult(nextHistory);
        return;
      }

      if (nextHistory.length >= MAX_QUESTIONS) {
        await generateResult(nextHistory);
        return;
      }

      const next = await fetchNextQuestion(nextHistory);
      setCurrent(next);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "回答送信に失敗しました。";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function forceFinish() {
    if (history.length < MIN_QUESTIONS || analyzing || loading) return;
    await generateResult(history);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#1d4ed8_0%,#7c3aed_45%,#ec4899_100%)] px-6 py-8 text-white md:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-white/80">AI対話診断</p>
            <h1 className="text-2xl font-bold tracking-tight">
              インタラクティブ対話画面
            </h1>
          </div>
          <Link
            href="/"
            className="rounded-xl border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"
          >
            ホームへ戻る
          </Link>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.25fr,0.75fr]">
          <div className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-md">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold">
                質問 {history.length + 1} / {current.estimatedTotalQuestions}
              </p>
              <p className="text-xs text-white/80">AIが必要に応じて質問数を調整</p>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${Math.max(progress, 4)}%` }}
              />
            </div>

            <article className="mt-6 rounded-2xl border border-white/20 bg-white/10 p-5">
              <p className="text-xs font-semibold text-white/80">
                {current.questionType}
              </p>
              <p className="mt-3 text-lg font-semibold leading-relaxed">
                {current.question}
              </p>
            </article>

            <div className="mt-4 rounded-2xl border border-white/20 bg-black/20 p-4">
              <label className="text-xs font-semibold text-white/80">
                あなたの回答（自由記述）
              </label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="mt-2 h-36 w-full resize-none rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/50 focus:border-white/60"
                placeholder="あなたの考えを具体的に書いてください"
                disabled={loading || analyzing}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={submitAnswer}
                  disabled={!answer.trim() || loading || analyzing}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "送信中..." : "送信"}
                </button>
                <button
                  onClick={forceFinish}
                  disabled={history.length < MIN_QUESTIONS || loading || analyzing}
                  className="rounded-lg border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {analyzing ? "分析中..." : "ここで診断を終了"}
                </button>
              </div>
            </div>

            {error ? (
              <p className="mt-3 rounded-xl border border-red-300/50 bg-red-500/20 px-3 py-2 text-sm">
                {error}
              </p>
            ) : null}
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-md">
              <h2 className="text-sm font-semibold">対話の状態</h2>
              <ul className="mt-3 space-y-2 text-sm text-white/90">
                <li className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                  回答済み: {history.length}問
                </li>
                <li className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                  最小必要数: {MIN_QUESTIONS}問
                </li>
                <li className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                  最大目安: {MAX_QUESTIONS}問
                </li>
                <li className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                  現在の質問タイプ: {current.questionType}
                </li>
              </ul>
            </div>

            <div className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-md">
              <h2 className="text-sm font-semibold">直近の回答履歴</h2>
              <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1 text-xs leading-relaxed text-white/90">
                {history.length === 0 ? (
                  <li className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                    まだ回答はありません。
                  </li>
                ) : (
                  history
                    .slice(-5)
                    .reverse()
                    .map((item, i) => (
                      <li
                        key={`${item.question}-${i}`}
                        className="rounded-lg border border-white/15 bg-white/10 px-3 py-2"
                      >
                        <p className="font-semibold">{item.questionType}</p>
                        <p className="mt-1 text-white">{item.question}</p>
                        <p className="mt-1 text-white/80">{item.answer}</p>
                      </li>
                    ))
                )}
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
