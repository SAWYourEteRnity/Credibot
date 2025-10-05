"use client";
import React, { useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";

const MODALITIES = [
  { key: "pct", name: "Person-Centered (PCT)", short: "Person-Centered", color: "bg-blue-100 text-blue-700" },
  { key: "eft", name: "Emotion-Focused (EFT)", short: "Emotion-Focused", color: "bg-pink-100 text-pink-700" },
  { key: "cbt", name: "Cognitive Behavioral (CBT)", short: "CBT", color: "bg-amber-100 text-amber-800" },
  { key: "dbt", name: "Dialectical Behavior (DBT)", short: "DBT", color: "bg-violet-100 text-violet-800" },
  { key: "sfbt", name: "Solution-Focused (SFBT)", short: "Solution-Focused", color: "bg-emerald-100 text-emerald-800" },
  { key: "psychodynamic", name: "Psychodynamic", short: "Psychodynamic", color: "bg-slate-100 text-slate-800" },
  { key: "act", name: "Acceptance & Commitment (ACT)", short: "ACT", color: "bg-teal-100 text-teal-800" },
] as const;

const INITIAL_BOT_MESSAGE = {
  role: "bot" as const,
  text: "Hi there—I’m Credibot. I can help you get ready for therapy: understand different conversational styles, clarify your preferences, and sketch next steps. If this is an emergency, call your local crisis line or 988 in the U.S.",
};

type ModKey = (typeof MODALITIES)[number]["key"];
type ChatMsg = { role: "user" | "bot"; text: string; modality?: ModKey };

export default function Page() {
  const [messages, setMessages] = useState<ChatMsg[]>([INITIAL_BOT_MESSAGE]);
  const [input, setInput] = useState("");
  const [active, setActive] = useState<ModKey>("pct");
  const [lang, setLang] = useState<"en" | "zh">("en");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement | null>(null);
  const activeLabel = useMemo(() => MODALITIES.find(m => m.key === active)?.short || "Person-Centered", [active]);

  const startOver = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setMessages([INITIAL_BOT_MESSAGE]);
    setInput("");
  };

  async function send(text: string, modality: ModKey) {
    if (!text.trim() || isStreaming) return;

    setMessages(m => [...m, { role: "user", text }]);

    const botIndex = messages.length + 1;
    setMessages(m => [...m, { role: "bot", text: "", modality }]);

    const ac = new AbortController();
    abortRef.current = ac;
    setIsStreaming(true);
    try {
      const res = await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userText: text, modality, lang }),
        signal: ac.signal,
      });
      if (!res.ok) throw new Error(await res.text());
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        setMessages(m => {
          const copy = [...m];
          const msg = copy[botIndex];
          if (msg && msg.role === "bot") msg.text += chunk;
          return copy;
        });
        scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
      }
    } catch {
      setMessages(m => {
        const copy = [...m];
        const msg = copy[botIndex];
        if (msg && msg.role === "bot") msg.text = msg.text || (lang === "zh" ? "网络错误，请重试�? : "Network error. Please try again.");
        return copy;
      });
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  function onSubmit() {
    const t = input.trim();
    if (!t) return;
    setInput("");
    send(t, active);
  }

  function changeModality() {
    const lastUser = [...messages].reverse().find(m => m.role === "user")?.text;
    if (!lastUser || isStreaming) return;
    const i = MODALITIES.findIndex(m => m.key === active);
    const next = MODALITIES[(i + 1) % MODALITIES.length].key;
    setActive(next);
    send(lastUser, next);
  }

  function exportIntakePDF() {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const margin = 56;
    let y = margin;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - margin * 2;

    const H = (t: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(t, margin, y);
      y += 22;
    };
    const P = (t: string) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      const lines = doc.splitTextToSize(t, maxWidth);
      for (const line of lines) {
        if (y > 740) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 16;
      }
      y += 6;
    };
    const t = (en: string, zh: string) => (lang === "zh" ? zh : en);

    H(t("Credibot �?Therapy Intake Snapshot", "Credibot �?治疗准备摘要"));
    P(new Date().toLocaleString());

    H(t("Active Style", "当前风格"));
    P(MODALITIES.find(m => m.key === active)?.name || "Person-Centered (PCT)");

    H(t("Recent Conversation (excerpt)", "最近对话（节选）"));
    const recent = messages.slice(-12);
    const convo = recent
      .map(m => `${m.role === "user" ? t("Client", "来访�?) : "Credibot"}${m.modality ? ` [${MODALITIES.find(x => x.key === m.modality)?.short}]` : ""}: ${m.text}`)
      .join("\\n\\n");
    P(convo || t("No messages yet.", "暂无对话�?));

    H(t("Notes & Boundaries", "说明与边�?));
    P(
      t(
        "This document is for preparation and discussion with a licensed clinician. It is not diagnosis or treatment. If you are in crisis, contact your local emergency number or 988 in the U.S.",
        "本文件用于与持证临床医生进行准备与沟通，不构成诊断或治疗。如果你处于危机中，请联系当地紧急电话（在美国拨�?988）�?
      )
    );

    doc.save("credibot-intake.pdf");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-slate-200">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">{lang === "zh" ? "会话风格" : "Active style"}:</span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${MODALITIES.find(m => m.key === active)!.color}`}>{activeLabel}</span>
            <button onClick={changeModality} className="text-xs underline">
              {lang === "zh" ? "切换风格" : "Change modality"}
            </button>
          </div>
          <nav className="flex items-center gap-4 text-xs">
            <a className="underline" href="/find">
              {lang === "zh" ? "找治疗师" : "Find Therapists"}
            </a>
            <label className="flex items-center gap-1">
              <span>{lang === "zh" ? "语言" : "Language"}:</span>
              <select value={lang} onChange={e => setLang(e.target.value as any)} className="border rounded px-2 py-0.5">
                <option value="en">English</option>
                <option value="zh">中文</option>
              </select>
            </label>
            <button onClick={startOver} className="underline" disabled={isStreaming}>
              {lang === "zh" ? "重新开�? : "Start over"}
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 mt-4">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm">
          <strong>{lang === "zh" ? "安全优先�? : "Safety first:"}</strong>{" "}
          {lang === "zh" ? "如果你处于紧急危险或有伤害自己的想法，请拨打当地紧急电话，或在美国拨打 988�? : "If you’re in immediate danger or thinking about harming yourself, call your local emergency number or 988 (U.S.)."}
        </div>

        <div ref={scroller} className="h-[56vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mt-4">
          {messages.map((m, i) => (
            <div key={i} className={`mb-4 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${m.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-900"}`}>
                <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                {m.role === "bot" && m.modality && <div className="mt-2 text-xs text-slate-600">{lang === "zh" ? "风格�? : "Style:"} {MODALITIES.find(x => x.key === m.modality)?.short}</div>}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-start gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder={lang === "zh" ? "想说什么都可以…（�?Enter 发送，Shift+Enter 换行�? : "Share what’s on your mind�?(press Enter to send, Shift+Enter for a new line)"}
            className="flex-1 resize-none h-24 rounded-xl border border-slate-300 bg-white p-3 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <div className="flex flex-col gap-2">
            <button onClick={onSubmit} disabled={isStreaming} className="rounded-xl bg-indigo-600 px-4 py-2 text-white font-semibold shadow hover:bg-indigo-700 disabled:opacity-50">
              {isStreaming ? (lang === "zh" ? "生成中�? : "Thinking�?) : lang === "zh" ? "发�? : "Send"}
            </button>
            <button onClick={exportIntakePDF} className="rounded-xl border px-4 py-2 text-sm">{lang === "zh" ? "导出 Intake PDF" : "Export intake PDF"}</button>
          </div>
        </div>

        <div className="mt-6 text-xs text-slate-600">
          {lang === "zh" ? "继续使用表示你理解：这是教育性准备工具，不构成诊断或治疗；临床需要请寻求专业帮助�? : "By continuing, you agree this is educational prep—not diagnosis or treatment—and you’ll seek professional care for clinical needs."}
        </div>
      </main>
    </div>
  );
}
