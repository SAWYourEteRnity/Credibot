# Credibot (Next.js 14, Groq streaming)
Therapy-style conversation prep tool with bilingual UI, streaming LLM replies (Groq), Find-Therapist helper, and one-click Intake PDF export.

## Quick start
```bash
npm install
npm run dev
# open http://localhost:3000
```

## Configure LLM (Groq)
Create `.env.local`:
```
PROVIDER=groq
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama3-8b-8192
```

## Deploy to Vercel
- Push to GitHub, import in Vercel.
- Add the same env vars in Project 鈫?Settings 鈫?Environment Variables.
- Deploy.

## Notes
- Crisis screening happens server-side; if flagged, the route returns resources without calling the model.
- PDF export uses jsPDF and includes recent conversation + style summary.

