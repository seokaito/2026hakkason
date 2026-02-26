import Link from "next/link";

const steps = [
  {
    title: "1. 基本情報を共有",
    body: "年齢、現在の状況、価値観などを自由記述で入力します。",
  },
  {
    title: "2. AIが深掘り質問",
    body: "回答に応じて次の質問が変わり、あなたの内面を多角的に分析します。",
  },
  {
    title: "3. 人生創造レポートを表示",
    body: "人格タイプ、性格スコア、未来シナリオをまとめて提示します。",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#7c3aed_0%,#ec4899_42%,#3b82f6_100%)] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-16 pt-10 md:px-10">
        <header className="flex items-center justify-between">
          <p className="text-lg font-semibold tracking-tight md:text-xl">
            AI人生創造エンジン
          </p>
          <p className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium">
            所要時間: 約10分
          </p>
        </header>

        <section className="mt-14 grid gap-10 md:mt-20 md:grid-cols-2 md:items-center">
          <div>
            <p className="inline-block rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium">
              Interactive Personality Journey
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              AIと対話して、
              <br />
              人生の物語を創る
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-white/90 md:text-base">
              固定質問ではなく、回答に合わせてAIが質問を動的生成。価値観・願望・恐れ・強みを深く理解し、あなた専用の人生シナリオを可視化します。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/chat?reset=1"
                className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-violet-700 transition hover:-translate-y-0.5 hover:bg-white/90"
              >
                診断を始める
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-md">
            <h2 className="text-xl font-semibold">診断の流れ 3ステップ</h2>
            <div className="mt-5 space-y-3">
              {steps.map((step) => (
                <article
                  key={step.title}
                  className="rounded-2xl border border-white/20 bg-white/10 p-4"
                >
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/85">
                    {step.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
