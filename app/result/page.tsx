"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AnalysisResult, TraitScore } from "../types";

const STORAGE_RESULT_KEY = "diagnosis_result_v1";

function Radar({ traitScores }: { traitScores: TraitScore[] }) {
  const center = 120;
  const radius = 86;
  const points = traitScores
    .map((item, i) => {
      const angle = (Math.PI * 2 * i) / traitScores.length - Math.PI / 2;
      const r = (item.value / 100) * radius;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-3xl border border-violet-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-zinc-900">
        性格スコア（5次元分析）
      </h3>
      <svg viewBox="0 0 240 240" className="mt-4 w-full">
        {[30, 50, 70, 90].map((step) => {
          const r = (step / 100) * radius;
          const ring = traitScores
            .map((_, i) => {
              const angle =
                (Math.PI * 2 * i) / traitScores.length - Math.PI / 2;
              const x = center + r * Math.cos(angle);
              const y = center + r * Math.sin(angle);
              return `${x},${y}`;
            })
            .join(" ");
          return (
            <polygon
              key={step}
              points={ring}
              fill="none"
              stroke="rgb(221 214 254)"
              strokeWidth="1"
            />
          );
        })}
        <polygon
          points={points}
          fill="rgba(139,92,246,0.2)"
          stroke="rgb(109 40 217)"
          strokeWidth="2"
        />
        {traitScores.map((item, i) => {
          const angle = (Math.PI * 2 * i) / traitScores.length - Math.PI / 2;
          const x = center + (radius + 20) * Math.cos(angle);
          const y = center + (radius + 20) * Math.sin(angle);
          return (
            <text
              key={item.label}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-zinc-600 text-[10px]"
            >
              {item.label}
            </text>
          );
        })}
      </svg>
      <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-zinc-700 md:grid-cols-2">
        {traitScores.map((item) => (
          <p key={item.label}>
            {item.label}: <span className="font-semibold">{item.value}</span> -{" "}
            {item.comment}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function ResultPage() {
  const [result] = useState<AnalysisResult | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_RESULT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AnalysisResult;
    } catch {
      return null;
    }
  });

  const confidenceLabel = useMemo(() => {
    if (!result) return "-";
    return `${Math.round(result.confidence * 100)}%`;
  }, [result]);

  if (!result) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-violet-50 via-pink-50 to-sky-50 px-6 text-zinc-900">
        <div className="max-w-xl rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold">結果データがありません</h1>
          <p className="mt-3 text-sm text-zinc-600">
            先に対話診断を実行してから結果画面へ進んでください。
          </p>
          <Link
            href="/chat"
            className="mt-6 inline-block rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
          >
            診断を開始する
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-violet-50 via-pink-50 to-sky-50 px-6 py-8 text-zinc-900 md:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-zinc-600">診断結果</p>
            <h1 className="text-3xl font-bold tracking-tight">人生創造レポート</h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold"
            >
              ホームへ
            </Link>
            <Link
              href="/chat"
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
            >
              再診断する
            </Link>
          </div>
        </header>

        <section className="mt-7 grid gap-5 lg:grid-cols-2">
          <article className="rounded-3xl border border-violet-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">あなたの人格タイプ</h2>
            <p className="mt-3 text-2xl font-bold text-violet-700">
              {result.personalityType}
            </p>
            <p className="mt-3 text-sm text-zinc-700">{result.summary}</p>
            <p className="mt-2 text-xs font-semibold text-zinc-500">
              分析信頼度: {confidenceLabel}
            </p>
          </article>

          <Radar traitScores={result.traitScores} />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <article className="rounded-3xl border border-pink-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">具体的な人生シナリオ</h2>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-zinc-700">
              {result.timelineItems.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                >
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-3xl border border-sky-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">人生ストーリー（章立て）</h2>
            <ul className="mt-4 space-y-2 text-sm text-zinc-700">
              {result.storyChapters.map((chapter) => (
                <li
                  key={chapter.title}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                >
                  <p className="font-semibold">{chapter.title}</p>
                  <p className="text-zinc-600">{chapter.body}</p>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="mt-5 rounded-3xl border border-violet-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">年代別アドバイス</h2>
          <div className="mt-4 grid gap-2 md:grid-cols-5">
            {result.ageAdvices.map((item) => (
              <article
                key={item.age}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3"
              >
                <p className="text-sm font-semibold text-violet-700">{item.age}</p>
                <p className="mt-1 text-xs text-zinc-700">{item.advice}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
