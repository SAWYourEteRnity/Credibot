import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const PROVIDER = (process.env.PROVIDER || 'groq').toLowerCase();
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama3-8b-8192';
const HF_TOKEN = process.env.HF_TOKEN;
const HF_MODEL = process.env.HF_MODEL || 'meta-llama/Meta-Llama-3-8B-Instruct';

const BodySchema = z.object({
  userText: z.string().min(1),
  modality: z.enum(["pct","eft","cbt","dbt","sfbt","psychodynamic","act"]),
  lang: z.enum(["en","zh"]).default("en"),
});

const MODALITY_SYSTEMS: Record<string,string> = {
  pct: `You are a Person-Centered therapist: empathic, reflective, non-directive, unconditional positive regard. Avoid advice. Mirror and clarify.`,
  eft: `You are an Emotion-Focused therapist: track bodily feelings, deepen present emotion, name and explore primary emotions, compassionate tone.`,
  cbt: `You are a CBT therapist: collaborative empiricism, identify thoughts, feelings, behaviors, and run small experiments. Be structured and clear.`,
  dbt: `You are a DBT therapist: balance acceptance and change, teach skills (mindfulness, distress tolerance, emotion regulation, interpersonal effectiveness). Validate first.`,
  sfbt: `You are a Solution-Focused therapist: future oriented, exceptions, scaling questions, co-construct small next steps.`,
  psychodynamic: `You are a Psychodynamic therapist: explore themes, defenses, transference/countertransference, and meanings over time. Gentle curiosity.`,
  act: `You are an ACT therapist: build psychological flexibility via acceptance, defusion, present-focus, values, committed action. Normalize internal experiences.`,
};

const CRISIS_PATTERNS: RegExp[] = [
  /(kill myself|suicide|end my life|want to die|self-harm|cut myself)/i,
  /(kill (him|her|them)|hurt (someone|him|her|them)|homicide)/i,
  /(overdose|OD on)/i,
];
const detectCrisis = (t: string) => CRISIS_PATTERNS.some((re)=>re.test(t));

function crisisResources(country?: string) {
  const c = (country || "US").toUpperCase();
  switch (c) {
    case "CA": return { headline: "If you are in immediate danger, call 911.", line: "Talk Suicide Canada: 1-833-456-4566 (24/7) or text 45645.", web: "https://talksuicide.ca/" };
    case "GB": case "UK": return { headline: "If you are in immediate danger, call 999.", line: "Samaritans: 116 123 (free, 24/7).", web: "https://www.samaritans.org/" };
    case "AU": return { headline: "If you are in immediate danger, call 000.", line: "Lifeline: 13 11 14 (24/7).", web: "https://www.lifeline.org.au/" };
    default: return { headline: "If you are in immediate danger, call your local emergency number.", line: "U.S. 988 Suicide & Crisis Lifeline: call or text 988 (24/7).", web: "https://988lifeline.org/" };
  }
}

export async function POST(req: NextRequest) {
  const country = req.headers.get("x-vercel-ip-country") || undefined;
  const { userText, modality, lang } = BodySchema.parse(await req.json());

  // Safety gate block LLM calls if crisis detected
  if (detectCrisis(userText)) {
    const help = crisisResources(country);
    return NextResponse.json({
      type: 'crisis',
      message: lang==='zh'
        ? '很高兴你愿意说出来。你描述的情况听起来很紧急。很抱歉我不能直接为你提供紧急援助，但下面是可以立即支持你的资源。'
        : 'I am really glad you reached out. What you are describing sounds urgent. I can not provide emergency help, but here are resources that can support you right now.',
      resources: help
    }, { status: 200 });
  }

  const system = `${lang==='zh' ? 'Respond in Simplified Chinese.' : 'Respond in English.'}
${MODALITY_SYSTEMS[modality]}
Rules: Do not claim to diagnose or provide treatment. Encourage professional therapy. Use 80-140 words. End with 1 concise question that helps the user continue.`;

  if (PROVIDER === 'groq') {
    if (!GROQ_API_KEY) return new NextResponse('Missing GROQ_API_KEY', { status: 500 });

    // Stream from Groq (OpenAI-compatible SSE) and convert to a plain text stream
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.7,
        stream: true,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userText }
        ]
      })
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      return new NextResponse(`Groq error: ${upstream.status} ${text}`, { status: 500 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader();
        let buffer = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\\n\\n');
          buffer = parts.pop() || '';
          for (const part of parts) {
            if (!part.startsWith('data:')) continue;
            const data = part.replace(/^data:\\s*/, '').trim();
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              const token = json.choices?.[0]?.delta?.content || '';
              if (token) controller.enqueue(encoder.encode(token));
            } catch {}
          }
        }
        controller.close();
      }
    });

    return new NextResponse(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  // Fallback: Hugging Face (blocking, returns full text)
  if (PROVIDER === 'hf') {
    if (!HF_TOKEN) return new NextResponse('Missing HF_TOKEN', { status: 500 });
    const prompt = `System: ${system}\n\nUser: ${userText}\n\nAssistant:`;
    const res = await fetch(`https://api-inference.huggingface.co/models/${encodeURIComponent(HF_MODEL)}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 220, temperature: 0.7, do_sample: true, return_full_text: false } })
    });
    if (!res.ok) return new NextResponse(`HF error: ${res.status} ${await res.text()}`, { status: 500 });
    const data = await res.json();
    const reply = (Array.isArray(data) ? data[0]?.generated_text : (data?.generated_text || data?.choices?.[0]?.text)) || '';
    return new NextResponse(reply, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  return new NextResponse('Unsupported PROVIDER', { status: 500 });
}

