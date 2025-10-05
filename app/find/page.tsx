"use client";
import React from "react";

const MODALITIES = ["CBT","DBT","ACT","Psychodynamic","Person-Centered","Emotion-Focused","Solution-Focused"] as const;
const SPECIALTIES = ["Anxiety","Depression","Trauma/PTSD","ADHD","Grief","Couples","Family","LGBTQ+ Affirming"] as const;
const LANGS = ["English","中文","Spanish","Hindi","Tagalog","Vietnamese","French","Arabic","Korean","Russian"] as const;

function buildTerms({ city, telehealth, insurance, maxFee, modalities, specialties, language }: any) {
  const parts: string[] = [];
  if (city) parts.push(city);
  if (telehealth) parts.push("telehealth");
  if (insurance) parts.push(`insurance ${insurance}`);
  if (maxFee) parts.push(`fee <= ${maxFee}`);
  if (modalities?.length) parts.push(modalities.join(" "));
  if (specialties?.length) parts.push(specialties.join(" "));
  if (language) parts.push(language);
  return parts.filter(Boolean).join(" ");
}
function openGoogleSite(domain: string, query: string) {
  const url = `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} therapist ${query}`)}`;
  window.open(url, "_blank");
}

export default function FindPage() {
  const [lang, setLang] = React.useState<'en'|'zh'>(() => {
    try { return (JSON.parse(localStorage.getItem('pref.lang') || '"en"')) as 'en'|'zh'; } catch { return 'en'; }
  });
  React.useEffect(() => { try { localStorage.setItem('pref.lang', JSON.stringify(lang)); } catch {} }, [lang]);

  const [city, setCity] = React.useState("");
  const [telehealth, setTelehealth] = React.useState(true);
  const [insurance, setInsurance] = React.useState("");
  const [maxFee, setMaxFee] = React.useState<number | "">("");
  const [modalities, setModalities] = React.useState<string[]>([]);
  const [specialties, setSpecialties] = React.useState<string[]>([]);
  const [language, setLanguage] = React.useState("");

  const toggle = (setter: any, arr: string[], item: string) => setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]);

  const launch = (domain: string) => {
    const terms = buildTerms({ city, telehealth, insurance, maxFee, modalities, specialties, language });
    openGoogleSite(domain, terms);
  };

  const copyOutreach = () => {
    const body = lang==='zh'
      ? `你好，\n\n我正在寻找心理治疗，你的资料看起来可能比较匹配。以下是来自 Credibot（一个治疗准备工具）的简要信息：\n- 所在地�?{city || "(你的城市)"}\n- 会谈偏好�?{telehealth ? "远程" : "面谈"}\n- 保险�?{insurance || "自费 / 待定"}\n- 预算�?{maxFee ? `不超�?$${maxFee}` : "弹�?}\n- 可能偏好的取向：${modalities.join(", ") || "待定"}\n- 关注领域�?{specialties.join(", ") || "待定"}\n- 语言�?{language || "中文/英语"}\n\n如果你正在接收新来访者，能否告知初次咨询的可预约时间和通常费用？\n\n谢谢！`
      : `Hello,\n\nI’m exploring therapy and your profile looks like a potential fit. A quick snapshot about me from Credibot (a therapy-prep tool):\n- Location: ${city || "(your city)"}\n- Session preference: ${telehealth ? "Telehealth" : "In-person"}\n- Insurance: ${insurance || "Self-pay / TBD"}\n- Budget: ${maxFee ? `Up to $${maxFee}` : "Flexible"}\n- Modalities I think I might like: ${modalities.join(", ") || "TBD"}\n- Focus areas: ${specialties.join(", ") || "TBD"}\n- Language: ${language || "English"}\n\nIf you’re taking new clients, could you share openings for an initial consultation and typical fees?\n\nThank you!`;
    navigator.clipboard.writeText(body);
    alert(lang==='zh' ? '已复制联络邮件�? : 'Outreach note copied to clipboard.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-slate-200">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a href="/" className="h-8 w-8 rounded-xl bg-indigo-600 text-white grid place-items-center font-bold">C</a>
            <div>
              <div className="font-semibold">{lang==='zh' ? '找治疗师' : 'Find Therapists'}</div>
              <div className="text-xs text-slate-600">{lang==='zh' ? '构建筛�?�?打开可信的目�? : 'Build filters �?open trusted directories'}</div>
            </div>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <a className="underline" href="/">{lang==='zh' ? '返回聊天' : 'Back to Chat'}</a>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600">{lang==='zh' ? '语言' : 'Language'}:</label>
              <select value={lang} onChange={(e)=>setLang(e.target.value as any)} className="text-xs border rounded-md px-2 py-1">
                <option value="en">English</option>
                <option value="zh">中文</option>
              </select>
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 mt-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
          <strong>{lang==='zh' ? '提示�? : 'Note:'}</strong> {lang==='zh' ? '这些搜索会在新标签打开公共目录网站，你将根据筛选条件查看资料并直接联系治疗师�? : 'These searches open public directories in new tabs using your filters. You’ll review profiles and contact clinicians directly.'}
        </div>

        <div className="mt-4 grid gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="grid md:grid-cols-2 gap-3">
              <label className="text-sm">{lang==='zh' ? '城市/地区' : 'City/Region'}
                <input value={city} onChange={e=>setCity(e.target.value)} placeholder={lang==='zh' ? '例如：Seattle, WA �?Vancouver, BC' : 'e.g., Seattle WA or Vancouver BC'} className="mt-1 w-full border rounded-lg px-3 py-2" />
              </label>
              <label className="text-sm">{lang==='zh' ? '保险（可选）' : 'Insurance (optional)'}
                <input value={insurance} onChange={e=>setInsurance(e.target.value)} placeholder={lang==='zh' ? '例如：Aetna, Premera, Kaiser' : 'e.g., Aetna, Premera, Kaiser'} className="mt-1 w-full border rounded-lg px-3 py-2" />
              </label>
              <label className="text-sm">{lang==='zh' ? '最高费用（可选）' : 'Max Fee (optional)'}
                <input type="number" value={maxFee as any} onChange={e=>setMaxFee(e.target.value? Number(e.target.value) : "")} placeholder={lang==='zh' ? '例如�?50' : 'e.g., 150'} className="mt-1 w-full border rounded-lg px-3 py-2" />
              </label>
              <label className="text-sm flex items-center gap-2 mt-5 md:mt-0">
                <input type="checkbox" checked={telehealth} onChange={e=>setTelehealth(e.target.checked)} /> {lang==='zh' ? '优先远程诊疗' : 'Prefer Telehealth'}
              </label>
            </div>

            <div className="mt-4">
              <div className="text-sm font-medium">{lang==='zh' ? '治疗取向' : 'Modalities'}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {MODALITIES.map(m => (
                  <button key={m} onClick={()=>toggle(setModalities, modalities, m)} className={`text-xs px-2 py-1 rounded-full border ${modalities.includes(m) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300'}`}>{m}</button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm font-medium">{lang==='zh' ? '专长领域' : 'Specialties'}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {SPECIALTIES.map(s => (
                  <button key={s} onClick={()=>toggle(setSpecialties, specialties, s)} className={`text-xs px-2 py-1 rounded-full border ${specialties.includes(s) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300'}`}>{s}</button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid md:grid-cols-2 gap-3">
              <label className="text-sm">{lang==='zh' ? '语言' : 'Language'}
                <select value={language} onChange={e=>setLanguage(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2">
                  <option value="">{lang==='zh' ? '选择�? : 'Select�?}</option>
                  {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
            </div>

            <div className="mt-4 grid md:grid-cols-2 gap-3">
              <button onClick={() => launch("psychologytoday.com")} className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50">{lang==='zh' ? '搜索 Psychology Today' : 'Search Psychology Today'}</button>
              <button onClick={() => launch("therapyden.com")} className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50">{lang==='zh' ? '搜索 TherapyDen' : 'Search TherapyDen'}</button>
              <button onClick={() => launch("inclusivetherapists.com")} className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50">{lang==='zh' ? '搜索 Inclusive Therapists' : 'Search Inclusive Therapists'}</button>
              <button onClick={() => launch("openpathcollective.org")} className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50">{lang==='zh' ? '搜索 Open Path（低费用�? : 'Search Open Path (lower-cost)'}</button>
              <button onClick={() => launch("zencare.co")} className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50">{lang==='zh' ? '搜索 Zencare' : 'Search Zencare'}</button>
            </div>

            <div className="mt-4 flex items-center gap-3 text-sm">
              <button onClick={copyOutreach} className="underline">{lang==='zh' ? '复制联络邮件' : 'Copy outreach email'}</button>
              <a href="/" className="underline">{lang==='zh' ? '返回聊天' : 'Back to Chat'}</a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
