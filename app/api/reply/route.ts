// app/api/reply/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";

type Body = { userText?: string; modality?: string; lang?: "en" | "zh" };

const MODEL = "llama-3.1-8b-instant";

const MODALITY_STYLE: Record<string, string> = {
  pct: "Use person-centered counseling style: empathic reflections, non-directive, warm and validating.",
  eft: "Use emotion-focused style: slow the moment, invite naming and deepening present emotion.",
  cbt: "Use CBT style: map situation → thought → emotion (0–100) → behavior; collaborative empiricism.",
  dbt: "Use DBT style: balance acceptance and change; suggest concrete skills (mindfulness, TIP, DEAR MAN).",
  sfbt: "Use solution-focused style: notice exceptions, scale progress, co-create next tiny step.",
  psychodynamic: "Use psychodynamic style: patterns, defenses, meanings, transference; be gentle and curious.",
  act: "Use ACT style: acceptance, defusion, present-moment, values, committed action; brief exercise.",
};

function systemPrompt(modality: string, lang: "en" | "zh") {
  const safety =
    lang === "zh"
      ? "不要声称提供诊断或治疗；如涉及危机，请建议联系当地紧急电话或美国 988。语气温暖、具体、尊重。"
      : "Do not claim to diagnose or treat; if crisis is indicated, advise contacting local emergency services or 988 (US). Be warm, specific, respectful.";
  const style = MODALITY_STYLE[modality] || MODALITY_STYLE["pct"];
  const language = lang === "zh" ? "Respond in Simplified Chinese." : "Respond in English.";
  return `${language}
You are Credibot, a therapy-prep assistant. ${style}
Rules: ${safety} Keep replies about 80–140 words. End with ONE concise question that helps the user continue.`;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return new Response("Missing GROQ_API_KEY", { status: 500 });
    }

    const { userText, modality = "pct", lang = "en" } = (await req.json()) as Body;
    if (!userText || typeof userText !== "string") {
      return new Response("Bad Request: userText required", { status: 400 });
    }

    const payload = {
      model: MODEL,
      stream: true,
      temperature: 0.6,
      messages: [
        { role: "system", content: systemPrompt(modality, lang) },
        { role: "user", content: userText },
      ],
    };

    const groq = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!groq.ok || !groq.body) {
      const text = await groq.text().catch(() => "");
      return new Response(`Groq error: ${groq.status} ${text}`, { status: 500 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = groq.body!.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            for (const line of chunk.split("\n")) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data:")) continue;
              const data = trimmed.slice(5).trim();
              if (data === "[DONE]") continue;
              try {
                const json = JSON.parse(data);
                const delta: string =
                  json?.choices?.[0]?.delta?.content ??
                  json?.choices?.[0]?.delta ??
                  "";
                if (delta) controller.enqueue(encoder.encode(delta));
              } catch {}
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
      },
    });
  } catch (err: any) {
    return new Response(`Server error: ${err?.message || "unknown"}`, { status: 500 });
  }
}
