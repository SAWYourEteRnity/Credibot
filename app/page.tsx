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
  text: "Hi there閳ユ摠閳ユ獡 Credibot. I can help you get ready for therapy: understand different conversational styles, clarify your preferences, and sketch next steps. If this is an emergency, call your local crisis line or 988 in the U.S.",
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
          if (msg && msg.role === "bot") { msg.text = msg.text || (lang === "zh" ? "网络错误，请重试。" : "Network error. Please try again."); }
          return copy;
        });
        scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
      }
    } catch {
      setMessages(m => {
        const copy = [...m];
        const msg = copy[botIndex];
        if (msg && msg.role === "bot") { msg.text = msg.text || (lang === "zh" ? "网络错误，请重试。" : "Network error. Please try again."); }
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

    H(t("Credibot 閳?Therapy Intake Snapshot", "Credibot 閳?濞岃崵鏋熼崙鍡楊槵閹芥顩?));
    P(new Date().toLocaleString());

    H(t("Active Style", "瑜版挸澧犳搴㈢壐"));
    P(MODALITIES.find(m => m.key === active)?.name || "Person-Centered (PCT)");

    H(t("Recent Conversation (excerpt)", "閺堚偓鏉╂垵顕拠婵撶礄閼哄倿鈧绱?));
    const recent = messages.slice(-12);
    const convo = recent
      .map(m => `${m.role === "user" ? t("Client", "閺夈儴顔栭懓?) : "Credibot"}${m.modality ? ` [${MODALITIES.find(x => x.key === m.modality)?.short}]` : ""}: ${m.text}`)
      .join("\\n\\n");
    P(convo || t("No messages yet.", "閺嗗倹妫ょ€电鐦介妴?));

    H(t("Notes & Boundaries", "鐠囧瓨妲戞稉搴ょ珶閻?));
    P(
      t(
        "This document is for preparation and discussion with a licensed clinician. It is not diagnosis or treatment. If you are in crisis, contact your local emergency number or 988 in the U.S.",
        "閺堫剚鏋冩禒鍓佹暏娴滃簼绗岄幐浣界槈娑撴潙绨ラ崠鑽ゆ晸鏉╂稖顢戦崙鍡楊槵娑撳孩鐭￠柅姘剧礉娑撳秵鐎幋鎰槚閺傤厽鍨ㄥ▽鑽ゆ灍閵嗗倸顩ч弸婊€缍樻径鍕艾閸楄鲸婧€娑擃叏绱濈拠鐤粓缁缍嬮崷鎵彛閹儳鏁哥拠婵撶礄閸︺劎绶ㄩ崶鑺ュ閹?988閿涘鈧?
      )
    );

    doc.save("credibot-intake.pdf");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-slate-200">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">{lang === "zh" ? "娴兼俺鐦芥搴㈢壐" : "Active style"}:</span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${MODALITIES.find(m => m.key === active)!.color}`}>{activeLabel}</span>
            <button onClick={changeModality} className="text-xs underline">
              {lang === "zh" ? "閸掑洦宕叉搴㈢壐" : "Change modality"}
            </button>
          </div>
          <nav className="flex items-center gap-4 text-xs">
            <a className="underline" href="/find">
              {lang === "zh" ? "閹电偓涓嶉悿妤€绗€" : "Find Therapists"}
            </a>
            <label className="flex items-center gap-1">
              <span>{lang === "zh" ? "鐠囶叀鈻? : "Language"}:</span>
              <select value={lang} onChange={e => setLang(e.target.value as any)} className="border rounded px-2 py-0.5">
                <option value="en">English</option>
                <option value="zh">娑擃厽鏋?/option>
              </select>
            </label>
            <button onClick={startOver} className="underline" disabled={isStreaming}>
              {lang === "zh" ? "闁插秵鏌婂鈧慨? : "Start over"}
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 mt-4">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm">
          <strong>{lang === "zh" ? "鐎瑰鍙忔导妯哄帥閿? : "Safety first:"}</strong>{" "}
          {lang === "zh" ? "婵″倹鐏夋担鐘差槱娴滃海鎻ｉ幀銉ュ祫闂勨晜鍨ㄩ張澶夋縺鐎瑰疇鍤滃杈╂畱閹櫕纭堕敍宀冾嚞閹枫劍澧﹁ぐ鎾虫勾缁毖勨偓銉ф暩鐠囨繐绱濋幋鏍ф躬缂囧骸娴楅幏銊﹀ⅵ 988閵? : "If you閳ユ獧e in immediate danger or thinking about harming yourself, call your local emergency number or 988 (U.S.)."}
        </div>

        <div ref={scroller} className="h-[56vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mt-4">
          {messages.map((m, i) => (
            <div key={i} className={`mb-4 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${m.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-900"}`}>
                <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                {m.role === "bot" && m.modality && <div className="mt-2 text-xs text-slate-600">{lang === "zh" ? "妞嬪孩鐗搁敍? : "Style:"} {MODALITIES.find(x => x.key === m.modality)?.short}</div>}
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
            placeholder={lang === "zh" ? "閹疇顕╂禒鈧稊鍫ュ厴閸欘垯浜掗垾锔肩礄閹?Enter 閸欐垿鈧緤绱漇hift+Enter 閹广垼顢戦敍? : "Share what閳ユ獨 on your mind閳?(press Enter to send, Shift+Enter for a new line)"}
            className="flex-1 resize-none h-24 rounded-xl border border-slate-300 bg-white p-3 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <div className="flex flex-col gap-2">
            <button onClick={onSubmit} disabled={isStreaming} className="rounded-xl bg-indigo-600 px-4 py-2 text-white font-semibold shadow hover:bg-indigo-700 disabled:opacity-50">
              {isStreaming ? (lang === "zh" ? "閻㈢喐鍨氭稉顓涒偓? : "Thinking閳?) : lang === "zh" ? "閸欐垿鈧? : "Send"}
            </button>
            <button onClick={exportIntakePDF} className="rounded-xl border px-4 py-2 text-sm">{lang === "zh" ? "鐎电厧鍤?Intake PDF" : "Export intake PDF"}</button>
          </div>
        </div>

        <div className="mt-6 text-xs text-slate-600">
          {lang === "zh" ? "缂佈呯敾娴ｈ法鏁ょ悰銊с仛娴ｇ姷鎮婄憴锝忕窗鏉╂瑦妲搁弫娆掑仜閹冨櫙婢跺洤浼愰崗鍑ょ礉娑撳秵鐎幋鎰槚閺傤厽鍨ㄥ▽鑽ゆ灍閿涙稐澶嶆惔濠囨付鐟曚浇顕€电粯鐪版稉鎾茬瑹鐢喖濮妴? : "By continuing, you agree this is educational prep閳ユ攺ot diagnosis or treatment閳ユ攣nd you閳ユ獟l seek professional care for clinical needs."}
        </div>
      </main>
    </div>
  );
}


