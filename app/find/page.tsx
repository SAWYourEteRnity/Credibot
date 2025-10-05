"use client";
import React, { useMemo, useState } from "react";

/**
 * Credibot - Find Therapists (Client Page)
 * - Simple finder with filters (city, telehealth, insurance, fee cap, modalities, specialties, language)
 * - Mock search results (local-only) to demonstrate UX
 * - One-click "Copy Outreach Note"
 * - Returns from /find; pairs with the main chat at /
 */

type Therapist = {
  id: string;
  name: string;
  city: string;
  telehealth: boolean;
  insurance: string[];
  fee: number;
  modalities: string[];
  specialties: string[];
  language: string[];
  website?: string;
  email?: string;
};

const CATALOG: Therapist[] = [
  {
    id: "t1",
    name: "Dr. Maya Chen, LMFT",
    city: "San Francisco, CA",
    telehealth: true,
    insurance: ["Aetna", "Self-pay"],
    fee: 160,
    modalities: ["PCT", "EFT"],
    specialties: ["Anxiety", "Relationships", "Life transitions"],
    language: ["English", "中文"],
    website: "https://example.com/maya",
    email: "maya@example.com",
  },
  {
    id: "t2",
    name: "Jordan Patel, LCSW",
    city: "New York, NY",
    telehealth: true,
    insurance: ["BCBS", "Self-pay"],
    fee: 200,
    modalities: ["CBT", "DBT"],
    specialties: ["Mood", "Stress", "ADHD"],
    language: ["English", "Español"],
    website: "https://example.com/jordan",
    email: "jordan@example.com",
  },
  {
    id: "t3",
    name: "Aisha Rahman, PsyD",
    city: "Seattle, WA",
    telehealth: false,
    insurance: ["Self-pay"],
    fee: 140,
    modalities: ["ACT", "Psychodynamic"],
    specialties: ["Trauma", "Identity", "Anxiety"],
    language: ["English"],
    website: "https://example.com/aisha",
    email: "aisha@example.com",
  },
];

export default function FindPage() {
  const [lang, setLang] = useState<"en" | "zh">("en");

  // Form state
  const [city, setCity] = useState("");
  const [telehealth, setTelehealth] = useState(true);
  const [insurance, setInsurance] = useState("");
  const [maxFee, setMaxFee] = useState<number | "">("");
  const [modalities, setModalities] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [language, setLanguage] = useState("");

  const t = (en: string, zh: string) => (lang === "zh" ? zh : en);

  const filtered = useMemo(() => {
    return CATALOG.filter((t) => {
      if (city && !t.city.toLowerCase().includes(city.toLowerCase())) return false;
      if (telehealth && !t.telehealth) return false;
      if (insurance && !t.insurance.some(i => i.toLowerCase().includes(insurance.toLowerCase()))) return false;
      if (typeof maxFee === "number" && t.fee > maxFee) return false;
      if (modalities.length && !modalities.some(m => t.modalities.includes(m))) return false;
      if (specialties.length && !specialties.some(s => t.specialties.some(x => x.toLowerCase().includes(s.toLowerCase())))) return false;
      if (language && !t.language.some(l => l.toLowerCase().includes(language.toLowerCase()))) return false;
      return true;
    });
  }, [city, telehealth, insurance, maxFee, modalities, specialties, language]);

  function toggle(list: string[], value: string, setter: (v: string[]) => void) {
    if (list.includes(value)) setter(list.filter((x) => x !== value));
    else setter([...list, value]);
  }

  function copyOutreach(th: Therapist) {
    const body =
      lang === "zh"
        ? `你好 ${th.name}，

我正在了解心理治疗，你的资料看起来可能很适合我。以下是来自 Credibot（一个治疗准备工具）的简要信息：
- 所在地：${city || "(你的城市)"}
- 会谈偏好：${telehealth ? "远程" : "面谈"}
- 保险：${insurance || "自费 / 待定"}
- 预算：${maxFee ? `不超过 $${maxFee}` : "灵活"}
- 可能喜欢的取向：${modalities.join(", ") || "待定"}
- 关注领域：${specialties.join(", ") || "待定"}
- 语言：${language || "中文/英文"}

如果你目前接收新来访者，可否告知初谈时间与常规费用？谢谢！`
        : `Hello ${th.name},

I'm exploring therapy and your profile looks like a potential fit. A quick snapshot about me from Credibot (a therapy-prep tool):
- Location: ${city || "(your city)"}
- Session preference: ${telehealth ? "Telehealth" : "In-person"}
- Insurance: ${insurance || "Self-pay / TBD"}
- Budget: ${maxFee ? `Up to $${maxFee}` : "Flexible"}
- Modalities I think I might like: ${modalities.join(", ") || "TBD"}
- Focus areas: ${specialties.join(", ") || "TBD"}
- Language: ${language || "English"}

If you're taking new clients, could you share openings for an initial consultation and typical fees? Thank you!`;

    navigator.clipboard.writeText(body);
    alert(lang === "zh" ? "已复制联系邮件。" : "Outreach note copied to clipboard.");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Credibot — {t("Find Therapists", "找治疗师")}</div>
          <div className="flex items-center gap-3 text-xs">
            <a href="/" className="underline">{t("Back to Chat", "返回对话")}</a>
            <label className="flex items-center gap-1">
              <span>{t("Language", "语言")}:</span>
              <select value={lang} onChange={(e) => setLang(e.target.value as any)} className="border rounded px-2 py-0.5">
                <option value="en">English</option>
                <option value="zh">中文</option>
              </select>
            </label>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Filters */}
        <section className="md:col-span-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold mb-3">{t("Filters", "筛选条件")}</h2>

          <label className="block text-xs text-slate-600 mb-1">{t("City", "城市")}</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t("e.g., Seattle, WA", "例如：上海 / 北京")}
            className="w-full mb-3 rounded border border-slate-300 px-2 py-1"
          />

          <label className="block text-xs text-slate-600 mb-1">{t("Insurance", "保险/支付")}</label>
          <input
            value={insurance}
            onChange={(e) => setInsurance(e.target.value)}
            placeholder={t("e.g., Aetna, Self-pay", "例如：自费 / 商业险")}
            className="w-full mb-3 rounded border border-slate-300 px-2 py-1"
          />

          <div className="flex items-center justify-between mb-3">
            <label className="text-xs text-slate-600">{t("Telehealth only", "仅远程")}</label>
            <input
              type="checkbox"
              checked={telehealth}
              onChange={(e) => setTelehealth(e.target.checked)}
            />
          </div>

          <label className="block text-xs text-slate-600 mb-1">{t("Max fee (USD)", "最高预算（美元）")}</label>
          <input
            type="number"
            value={maxFee}
            onChange={(e) => setMaxFee(e.target.value ? Number(e.target.value) : "")}
            placeholder="150"
            className="w-full mb-3 rounded border border-slate-300 px-2 py-1"
          />

          <div className="mb-3">
            <div className="text-xs text-slate-600 mb-1">{t("Modalities", "取向")}</div>
            {["PCT", "EFT", "CBT", "DBT", "SFBT", "ACT", "Psychodynamic"].map((m) => (
              <label key={m} className="mr-3 inline-flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={modalities.includes(m)}
                  onChange={() => toggle(modalities, m, setModalities)}
                />
                <span>{m}</span>
              </label>
            ))}
          </div>

          <div className="mb-3">
            <div className="text-xs text-slate-600 mb-1">{t("Specialties", "关注领域")}</div>
            {["Anxiety", "Trauma", "Relationships", "ADHD", "Stress", "Identity"].map((s) => (
              <label key={s} className="mr-3 inline-flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={specialties.includes(s)}
                  onChange={() => toggle(specialties, s, setSpecialties)}
                />
                <span>{s}</span>
              </label>
            ))}
          </div>

          <label className="block text-xs text-slate-600 mb-1">{t("Language", "语言")}</label>
          <input
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder={t("e.g., English, 中文", "例如：中文 / 英文")}
            className="w-full mb-3 rounded border border-slate-300 px-2 py-1"
          />

          <div className="text-xs text-slate-500">
            {t("Note: This is sample data for demo. Replace with a real directory API when ready.", "提示：为演示所用的示例数据。后续可对接真实目录 API。")}
          </div>
        </section>

        {/* Results */}
        <section className="md:col-span-2">
          <h2 className="font-semibold mb-3">{t("Results", "匹配结果")}</h2>
          {filtered.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              {t("No matches yet. Try widening your filters.", "暂无匹配，请放宽筛选条件试试。")}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {filtered.map((th) => (
              <div key={th.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{th.name}</div>
                    <div className="text-xs text-slate-600">{th.city} • {th.telehealth ? t("Telehealth", "远程") : t("In-person", "面谈")} • ${th.fee}/{t("session", "次")}</div>
                  </div>
                  <div className="text-xs text-slate-600">
                    {th.website && <a className="underline mr-3" href={th.website} target="_blank">Website</a>}
                    {th.email && <a className="underline" href={`mailto:${th.email}`}>Email</a>}
                  </div>
                </div>
                <div className="mt-2 text-sm text-slate-700">
                  <div><span className="font-medium">{t("Modalities", "取向")}:</span> {th.modalities.join(", ")}</div>
                  <div><span className="font-medium">{t("Specialties", "关注领域")}:</span> {th.specialties.join(", ")}</div>
                  <div><span className="font-medium">{t("Insurance", "保险/支付")}:</span> {th.insurance.join(", ")}</div>
                  <div><span className="font-medium">{t("Language", "语言")}:</span> {th.language.join(", ")}</div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => copyOutreach(th)}
                    className="rounded-xl border px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    {t("Copy Outreach Note", "复制联系邮件")}
                  </button>
                  {th.email && (
                    <a
                      className="rounded-xl border px-3 py-1.5 text-sm hover:bg-slate-50"
                      href={`mailto:${th.email}`}
                    >
                      {t("Email", "发邮件")}
                    </a>
                  )}
                  {th.website && (
                    <a
                      className="rounded-xl border px-3 py-1.5 text-sm hover:bg-slate-50"
                      target="_blank"
                      href={th.website}
                    >
                      {t("Open Website", "打开网站")}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
