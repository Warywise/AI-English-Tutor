import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

export const app = express();

app.use(express.json({ limit: '10mb' }));

// CORS & Preflight handling
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Helper to get GoogleGenAI client dynamically with latest env vars
export function getAiClient(): GoogleGenAI | null {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper to sanitize JSON response from Gemini
export function extractJson(text: string): any {
  try {
    const clean = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(text.substring(start, end + 1));
    }
    throw new Error('Failed to parse model response as JSON');
  }
}

// Convert raw Gemini SDK ApiError / JSON messages into concise Portuguese reason strings
export function summarizeGeminiErrorPt(err: any): string {
  const raw = String(err?.message || err || '').trim();
  const status = err?.status || err?.code;
  if (status === 429 || raw.includes('"code":429') || raw.includes('RESOURCE_EXHAUSTED') || raw.includes('quota')) {
    return 'Limite de cota da API Gemini atingido temporariamente (Erro 429). Aguarde alguns instantes e tente novamente.';
  }
  if (status === 503 || raw.includes('"code":503') || raw.includes('UNAVAILABLE') || raw.includes('high demand')) {
    return 'O modelo de IA está com alta demanda no momento (Erro 503). Clique em Tentar novamente.';
  }
  if (raw.includes('Tempo limite') || raw.includes('timeout')) {
    return 'Tempo limite excedido ao aguardar resposta da IA. Clique em Tentar novamente.';
  }
  if (raw.startsWith('{') && raw.includes('"message"')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.error?.message) {
        return String(parsed.error.message).split('\n')[0];
      }
    } catch {}
  }
  return raw || 'Falha na comunicação com o serviço de IA.';
}

// Ensure TTS base64 audio always has a valid 44-byte RIFF WAV header (24kHz, 16-bit, mono)
export function ensureWavBase64(base64Audio: string, sampleRate: number = 24000): string {
  const pcmBuffer = Buffer.from(base64Audio, 'base64');
  if (pcmBuffer.length >= 4 && pcmBuffer.subarray(0, 4).toString('ascii') === 'RIFF') {
    return base64Audio;
  }
  const header = Buffer.alloc(44);
  const dataLen = pcmBuffer.length;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLen, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataLen, 40);
  return Buffer.concat([header, pcmBuffer]).toString('base64');
}

// Voice mapping from persona to Gemini prebuilt voice
// Standard official Gemini voices are: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'
export const VALID_GEMINI_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'] as const;

export const VOICE_MAP: Record<string, string> = {
  kore: 'Kore',
  zephyra: 'Aoede',
  alex: 'Fenrir',
  david: 'Charon',
  puck: 'Puck',
  Kore: 'Kore',
  Zephyr: 'Aoede',
  Zephyra: 'Aoede',
  Aoede: 'Aoede',
  Fenrir: 'Fenrir',
  Charon: 'Charon',
  Puck: 'Puck',
};

export function resolveVoice(voiceId?: string, fallback: string = 'Fenrir'): string {
  const candidate = (voiceId && VOICE_MAP[voiceId.toLowerCase()]) || (voiceId && VOICE_MAP[voiceId]) || fallback;
  return VALID_GEMINI_VOICES.includes(candidate as any) ? candidate : fallback;
}

// Router with all API endpoints
const apiRouter = express.Router();

// Health Check Endpoint with diagnostic info for Vercel
apiRouter.get('/health', (_req, res) => {
  const rawKey =
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    '';

  const keyConfigured = rawKey.trim().length > 0;
  const keyPrefix = keyConfigured
    ? `${rawKey.trim().substring(0, 6)}... (length: ${rawKey.trim().length})`
    : 'none';

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: keyConfigured,
    keyDetected: keyPrefix,
    environment: process.env.NODE_ENV || 'production',
  });
});

// Fast, accurate helper for contextual voice transcription + real acoustic pronunciation note
async function transcribeAndAnalyzeVoiceAudio(
  ai: GoogleGenAI,
  audioBase64: string,
  mimeType: string,
  contextSummary: string
): Promise<{ transcript: string; pronunciationNotePt: string; errorReason?: string }> {
  const cleanMime = (mimeType || 'audio/wav').split(';')[0].trim() || 'audio/wav';
  const cleanData = audioBase64.includes(',') ? audioBase64.split(',')[1].trim() : audioBase64.trim();
  const audioModels = [
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash',
    'gemini-3-flash-preview',
    'gemini-3.5-transcribe',
    'gemini-3.8-flash',
  ];

  let lastErrorReason = '';

  for (const modelName of audioModels) {
    try {
      const config: any = {};
      if (modelName === 'gemini-3.1-flash-lite') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
      } else if (modelName === 'gemini-3.8-flash' || modelName === 'gemini-3-flash-preview') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }

      const isDedicatedTranscribeModel = modelName === 'gemini-3.5-transcribe';
      const promptText = isDedicatedTranscribeModel
        ? 'Transcribe this English audio accurately. If there is no speech at all, output [NO_SPEECH].'
        : `Listen carefully to this English learner's voice recording.
Context of the conversation and student profile: ${contextSummary || 'English tutoring session with a Brazilian learner / software developer'}.
Tasks:
1. Transcribe EXACTLY what the speaker said in English. Use the context above to accurately spell technical or domain terms (such as "full-stack developer", "front-end", "back-end", "API", "deploy", "software engineer") instead of phonetically similar unrelated words. Preserve the speaker's actual grammar and phrasing. If the audio contains only silence or noise with no intelligible words, output [NO_SPEECH] for the transcript.
2. Write 1 brief observation in Portuguese about how their real spoken pronunciation, rhythm, or syllable stress sounded in the audio.

Return ONLY these two lines (no markdown, no extra text):
TRANSCRIPT: <exact English transcription or [NO_SPEECH]>
PRONUNCIATION_NOTE: <1 brief sentence in Portuguese about their spoken pronunciation>`;

      const audioPromise = ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: cleanMime,
                  data: cleanData,
                },
              },
              {
                text: promptText,
              },
            ],
          },
        ],
        config,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Tempo limite no modelo de áudio (${modelName})`)), 9000)
      );

      const response: any = await Promise.race([audioPromise, timeoutPromise]);
      const rawText = (response?.text || '').trim();
      if (!rawText) {
        lastErrorReason = `Modelo ${modelName} retornou transcrição vazia.`;
        continue;
      }

      let transcript = '';
      let pronunciationNotePt = '';

      if (isDedicatedTranscribeModel) {
        transcript = rawText.replace(/^["']|["']$/g, '').trim();
      } else {
        const lines = rawText.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
        for (const line of lines) {
          if (/^TRANSCRIPT\s*:/i.test(line)) {
            transcript = line.replace(/^TRANSCRIPT\s*:/i, '').trim();
          } else if (/^PRONUNCIATION_NOTE\s*:/i.test(line)) {
            pronunciationNotePt = line.replace(/^PRONUNCIATION_NOTE\s*:/i, '').trim();
          }
        }

        if (!transcript && lines.length > 0) {
          transcript = lines[0]
            .replace(/^(TRANSCRIPT|TEXT)\s*:/i, '')
            .replace(/^["']|["']$/g, '')
            .trim();
        }
      }

      if (
        !transcript ||
        transcript.toUpperCase().includes('[NO_SPEECH]') ||
        transcript.toLowerCase() === 'none' ||
        transcript.toLowerCase() === 'silence'
      ) {
        lastErrorReason = 'Nenhuma fala compreensível foi detectada na gravação.';
        continue;
      }

      console.log(`[SpeakFluent Audio] Transcribed with ${modelName}: "${transcript}"`);
      return { transcript, pronunciationNotePt };
    } catch (err: any) {
      lastErrorReason = summarizeGeminiErrorPt(err);
      console.warn(`[SpeakFluent Audio] Model ${modelName} failed:`, lastErrorReason);
    }
  }

  return {
    transcript: '',
    pronunciationNotePt: '',
    errorReason: lastErrorReason || 'Não foi possível transcrever o áudio.',
  };
}

// 1. Conversation Chat Endpoint (Supports both text and direct multimodal audio input)
apiRouter.post('/chat', async (req, res) => {
  try {
    const ai = getAiClient();
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const {
      mode = 'free_tutor', // 'scenario' | 'free_tutor'
      messages = [],
      userMessage = '',
      userAudioBase64 = '',
      userAudioMimeType = 'audio/webm',
      scenario = {
        title: 'Casual Conversation',
        partnerRole: 'A friendly native English speaker from New York',
        userRole: 'A curious English learner',
        context: 'Chatting in a cozy café while waiting for coffee',
        accent: 'American',
      },
      level = 'B1', // A1, A2, B1, B2, C1, C2
      voiceId = 'alex',
      tutorName = 'Alex',
      generateAudio = false,
      learnerProfile = null,
    } = body;

    const hasAudioInput = typeof userAudioBase64 === 'string' && userAudioBase64.trim().length > 0;
    const cleanMimeType = (userAudioMimeType || 'audio/webm').split(';')[0].trim() || 'audio/webm';

    const tutorDisplayName =
      tutorName ||
      (voiceId === 'zephyra'
        ? 'Zephyra'
        : voiceId === 'kore'
        ? 'Kore'
        : voiceId === 'david'
        ? 'David'
        : voiceId === 'puck'
        ? 'Puck'
        : 'Alex');

    const conversationHistoryText = Array.isArray(messages)
      ? messages
          .slice(-8)
          .map((m: { role: string; text: string }) => `${m.role === 'user' ? 'User' : tutorDisplayName}: "${m.text}"`)
          .join('\n')
      : '';

    // Build Continuous Learner Profile & Long-term Memory Context
    let learnerMemorySection = '';
    const contextHintParts: string[] = [];

    if (learnerProfile && typeof learnerProfile === 'object') {
      const memoryLines: string[] = [];
      if (learnerProfile.preferredName) memoryLines.push(`- Student Preferred Name: ${learnerProfile.preferredName}`);
      if (learnerProfile.occupation) {
        memoryLines.push(`- Occupation / Field of Work: ${learnerProfile.occupation}`);
        contextHintParts.push(`Occupation: ${learnerProfile.occupation}`);
      }
      if (learnerProfile.location) memoryLines.push(`- Location (City/Country): ${learnerProfile.location}`);
      if (learnerProfile.primaryGoal) {
        memoryLines.push(`- Main English Learning Goal: ${learnerProfile.primaryGoal}`);
        contextHintParts.push(`Goal: ${learnerProfile.primaryGoal}`);
      }
      if (learnerProfile.interests) {
        memoryLines.push(`- Hobbies & Interests: ${learnerProfile.interests}`);
        contextHintParts.push(`Interests: ${learnerProfile.interests}`);
      }
      if (learnerProfile.generalNotes) memoryLines.push(`- Student Personal Notes & Instructions: ${learnerProfile.generalNotes}`);

      if (Array.isArray(learnerProfile.autoLearnedFacts) && learnerProfile.autoLearnedFacts.length > 0) {
        const facts = learnerProfile.autoLearnedFacts
          .map((f: any) => (typeof f === 'string' ? f : f?.fact))
          .filter(Boolean)
          .slice(0, 20);
        if (facts.length > 0) {
          memoryLines.push(`- Continuous Memories & Known Facts from Past Talks:\n    * ${facts.join('\n    * ')}`);
          contextHintParts.push(`Known facts: ${facts.slice(0, 5).join('; ')}`);
        }
      }

      if (memoryLines.length > 0) {
        learnerMemorySection = `
=========================================
STUDENT PROFILE & CONTINUOUS LONG-TERM MEMORY:
You have a persistent, ongoing memory of this student across multiple days and sessions:
${memoryLines.join('\n')}

HOW TO USE THIS CONTINUOUS MEMORY:
1. Naturally weave this background into your responses when relevant! (e.g. ask how their job, projects, hobbies, or events are going, or use relevant metaphors).
2. Do NOT act like you are meeting them for the first time. Treat them like an ongoing student you know well.
3. In Scenarios: Adapt your persona's interaction slightly to align with the student's background where realistic.
=========================================
`;
      }
    }

    if (!ai) {
      return res.status(503).json({
        error: 'Chave da API Gemini não configurada no servidor.',
        details: 'Verifique a variável GEMINI_API_KEY nas configurações do ambiente.',
        code: 'MISSING_API_KEY',
        stage: 'chat',
      });
    }

    // Step 1 (if voice audio sent): Fast contextual transcription + acoustic pronunciation check
    let effectiveUserMessage = (userMessage || '').trim();
    let acousticPronunciationNote = '';

    if (hasAudioInput && !effectiveUserMessage) {
      const recentChatSnippet = Array.isArray(messages)
        ? messages
            .slice(-3)
            .map((m: any) => m?.text || '')
            .filter(Boolean)
            .join(' | ')
        : '';
      const fullContextSummary = [...contextHintParts, recentChatSnippet].filter(Boolean).join(' — ');

      const audioAnalysis = await transcribeAndAnalyzeVoiceAudio(
        ai,
        userAudioBase64,
        cleanMimeType,
        fullContextSummary
      );

      if (audioAnalysis.transcript) {
        effectiveUserMessage = audioAnalysis.transcript;
      }
      if (audioAnalysis.pronunciationNotePt) {
        acousticPronunciationNote = audioAnalysis.pronunciationNotePt;
      }

      if (!effectiveUserMessage) {
        return res.status(422).json({
          error: 'Não foi possível identificar fala clara no áudio gravado.',
          details:
            audioAnalysis.errorReason ||
            'O áudio parece sem fala compreensível ou o serviço de transcrição falhou.',
          code: 'TRANSCRIPTION_EMPTY',
          stage: 'transcription',
        });
      }
    }

    if (!effectiveUserMessage) {
      return res.status(400).json({
        error: 'Nenhuma mensagem de texto ou áudio válido foi enviada.',
        details: 'Digite uma mensagem ou grave seu áudio novamente.',
        code: 'EMPTY_MESSAGE',
        stage: 'chat',
      });
    }

    const audioInstructionSection = hasAudioInput
      ? `
=========================================
REAL VOICE RECORDING ASSESSMENT:
The learner spoke this message aloud via microphone!
${acousticPronunciationNote ? `Acoustic observation from their real voice recording: "${acousticPronunciationNote}"` : ''}
- In "overallFeedbackPt", include a brief, encouraging mention of their spoken delivery/pronunciation alongside your grammar/fluency tip.
- In "pronunciationTips", provide 1 to 2 specific words from their message ("${effectiveUserMessage}") with IPA and a practical Brazilian Portuguese phonetic tip to make their spoken English sound even more natural.
=========================================
`
      : '';

    let prompt = '';

    if (mode === 'free_tutor') {
      prompt = `You are ${tutorDisplayName}, an empathetic, supportive, witty, and friendly Personal English Tutor talking with a Brazilian learner.
The user is in FREE CONVERSATION MODE (Modo Conversa Livre), chatting lightly about whatever topic they bring up.
${learnerMemorySection}${audioInstructionSection}
CRITICAL INSTRUCTIONS FOR ${tutorDisplayName.toUpperCase()}:
1. Primary conversation language: Natural, conversational English tailored to CEFR level ${level}.
2. Natural Code-Switching (Inglês & Português) with Smooth Cadence:
   - You CAN and SHOULD smoothly switch between English and Portuguese when you need to explain a quick grammar nuance, translate a tricky idiom, or clarify a common Brazilian pitfall, WITHOUT losing the conversation flow!
   - Crucial for audio synthesis: When switching languages, use clean punctuation (commas, dashes, or short clauses) so text-to-speech pauses naturally and does not mangle Brazilian Portuguese words into English phonetics.
   - Example tone: "That sounds like an amazing plan! By the way — no inglês a gente costuma dizer 'on the weekend' em vez de 'in the weekend', beleza? — So what was the best thing you did?"
3. Light and Concise Feedback:
   - Keep your conversational reply between 2 and 4 sentences.
   - The feedback MUST BE CONCISE and encouraging. Give 1 sharp golden tip or praise in Portuguese, 1 natural alternative, and quick scores.
4. Continuous Memory Extraction:
   - Examine the learner's latest message ("${effectiveUserMessage}").
   - If the user explicitly shares a new personal fact about themselves (such as their profession, company, pets, family, travel plans, projects, preferences, city, or hobbies), extract it as a concise, objective bullet in Portuguese (e.g. "Trabalha como desenvolvedor full-stack", "Tem uma apresentação em inglês na sexta-feira").
   - If no new personal fact is shared, return an empty array [].

Conversation history:
${conversationHistoryText || '(First message)'}

Learner's latest message:
"${effectiveUserMessage}"

Return STRICT JSON matching this schema:
{
  "userTranscription": string (Repeat "${effectiveUserMessage}"),
  "replyText": string (Conversational reply from ${tutorDisplayName} in English with natural, light Portuguese tutor interventions when explaining something quick),
  "replyTranslationPt": string (Full Portuguese translation of the reply for reference),
  "newMemoryFacts": string[] (Array of 0 to 2 concise facts learned about the user from their latest message, or [] if none),
  "feedback": {
    "grammarScore": number,
    "fluencyScore": number,
    "vocabularyScore": number,
    "overallFeedbackPt": string (1 concise encouraging sentence with the main tip, mentioning their spoken pronunciation if audio was sent),
    "corrections": [
      {
        "original": string,
        "corrected": string,
        "explanationPt": string
      }
    ],
    "betterWaysToSay": [
      {
        "version": string,
        "style": "casual" | "natural",
        "explanationPt": string
      }
    ],
    "pronunciationTips": [
      {
        "word": string,
        "ipa": string,
        "tipPt": string
      }
    ],
    "vocabularyBoost": [
      {
        "word": string,
        "meaningPt": string,
        "example": string
      }
    ]
  },
  "suggestedReplies": [
    {
      "en": string,
      "pt": string,
      "tone": string
    }
  ]
}`;
    } else {
      prompt = `You are IAlex acting in an immersive English Conversation Scenario for a Brazilian student.
Scenario: ${scenario.title}
Your Character Role: ${scenario.partnerRole}
User's Role: ${scenario.userRole}
Context: ${scenario.context}
Target Dialect/Accent: ${scenario.accent || 'American'} English
Target CEFR Level of the learner: ${level}
${learnerMemorySection}${audioInstructionSection}
Conversation history so far:
${conversationHistoryText || '(Starting the conversation)'}

Latest user input:
"${effectiveUserMessage}"

Tasks:
1. Respond naturally IN CHARACTER as ${scenario.partnerRole}.
   - Keep the reply conversational, authentic, engaging, and matched to CEFR level ${level}.
   - Length: 2 to 4 natural sentences, ending with an open question or encouraging continuation.
   - You can occasionally drop a quick 1-phrase bilingual tutor tip in Portuguese if it clarifies a big hurdle.
2. Provide a natural Brazilian Portuguese translation of your reply for comprehension.
3. Analyze the user's latest input ("${effectiveUserMessage}"):
   - Identify any grammatical mistakes or Portuguese-to-English literal translations.
   - Give 1-3 direct grammar or syntax corrections (with explanation in Portuguese).
   - Give 2 "native speaker alternative ways to say this" (one casual and one natural).
   - Identify 1-2 words from their message for pronunciation improvement with IPA and practical Portuguese phonetic tip.
   - Extract 1-3 useful idioms or vocabulary words.
   - Rate the user's message on Grammar (1-100), Fluency (1-100), and Vocabulary (1-100).
4. Continuous Memory Extraction:
   - If the user explicitly mentioned any personal real-life fact (profession, real background, goals), extract as 0-2 concise bullets in Portuguese in "newMemoryFacts", else [].
5. Provide 3 smart suggested replies in English with Portuguese translation.

Return STRICT JSON matching this schema:
{
  "userTranscription": string,
  "replyText": string,
  "replyTranslationPt": string,
  "newMemoryFacts": string[],
  "feedback": {
    "grammarScore": number,
    "fluencyScore": number,
    "vocabularyScore": number,
    "overallFeedbackPt": string,
    "corrections": [
      {
        "original": string,
        "corrected": string,
        "explanationPt": string
      }
    ],
    "betterWaysToSay": [
      {
        "version": string,
        "style": "casual" | "natural" | "formal",
        "explanationPt": string
      }
    ],
    "pronunciationTips": [
      {
        "word": string,
        "ipa": string,
        "tipPt": string
      }
    ],
    "vocabularyBoost": [
      {
        "word": string,
        "meaningPt": string,
        "example": string
      }
    ]
  },
  "suggestedReplies": [
    {
      "en": string,
      "pt": string,
      "tone": string
    }
  ]
}`;
    }

    // Fast model chain with proper ThinkingLevel config and explicit error reporting (NO fake fallbacks)
    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      'gemini-3-flash-preview',
      'gemini-3.8-flash',
    ];
    let parsedData: any = null;
    let lastTutorError = '';

    for (const modelName of candidateModels) {
      try {
        console.log(`[SpeakFluent] Trying tutor model: ${modelName}`);
        const config: any = {
          responseMimeType: 'application/json',
        };
        if (modelName === 'gemini-3.1-flash-lite') {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
        } else if (modelName === 'gemini-3.8-flash' || modelName === 'gemini-3-flash-preview') {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }

        const genPromise = ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config,
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Tempo limite excedido no modelo ${modelName}`)), 10000)
        );

        const textResponse: any = await Promise.race([genPromise, timeoutPromise]);

        if (textResponse?.text) {
          parsedData = extractJson(textResponse.text);
          console.log(`[SpeakFluent] Model ${modelName} succeeded!`);
          break;
        }
      } catch (err: any) {
        lastTutorError = summarizeGeminiErrorPt(err);
        console.warn(`[SpeakFluent] Model ${modelName} failed or unavailable:`, lastTutorError);
      }
    }

    // Never return a fake tutor message if all models fail — return an explicit 502 error so user can retry
    if (!parsedData) {
      console.error('[SpeakFluent] All tutor models failed:', lastTutorError);
      return res.status(502).json({
        error: 'Não foi possível gerar a resposta do tutor no momento.',
        details: lastTutorError || 'Os modelos de IA não responderam a tempo.',
        code: 'TUTOR_API_ERROR',
        stage: 'chat',
        userTranscription: effectiveUserMessage,
      });
    }

    // TTS generation with strict timeout & non-blocking fallback
    let audioBase64: string | null = null;
    if (generateAudio && ai && parsedData.replyText) {
      try {
        const selectedVoice = resolveVoice(voiceId || tutorDisplayName, 'Fenrir');
        const ttsCandidateModels = [
          'gemini-3.1-flash-tts-preview',
          'gemini-2.5-flash-preview-tts',
          'gemini-3.8-flash-tts',
          'gemini-3.8-flash-lite-tts',
        ];

        for (const ttsModel of ttsCandidateModels) {
          try {
            const ttsPromise = ai.models.generateContent({
              model: ttsModel,
              contents: parsedData.replyText,
              config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: selectedVoice },
                  },
                },
              },
            });

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('TTS timeout')), 6000)
            );

            const ttsResponse: any = await Promise.race([ttsPromise, timeoutPromise]);
            const rawAudioData = ttsResponse?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (rawAudioData) {
              audioBase64 = ensureWavBase64(rawAudioData, 24000);
              break;
            }
          } catch (mErr: any) {
            console.warn(`[Tutor] TTS model ${ttsModel} attempt failed:`, mErr?.message || mErr);
          }
        }
      } catch (audioErr) {
        console.log('[Tutor] TTS generation error or timeout:', audioErr);
      }
    }

    return res.json({
      ...parsedData,
      userTranscription: effectiveUserMessage || parsedData.userTranscription || '',
      newMemoryFacts: Array.isArray(parsedData.newMemoryFacts) ? parsedData.newMemoryFacts : [],
      audioBase64,
      audioMimeType: 'audio/wav',
    });
  } catch (err: any) {
    console.error('Unhandled error in /api/chat:', err);
    return res.status(500).json({
      error: 'Erro ao processar sua mensagem na API.',
      details: err?.message || 'Falha inesperada na comunicação com o servidor.',
      code: 'INTERNAL_CHAT_ERROR',
      stage: 'chat',
    });
  }
});

// 1.5 Dedicated Contextual Audio Transcription Endpoint (for "Edit before sending")
apiRouter.post('/transcribe', async (req, res) => {
  try {
    const ai = getAiClient();
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { audioBase64 = '', mimeType = 'audio/wav', contextHint = '' } = body;

    if (!audioBase64 || !ai) {
      return res.status(400).json({
        error: 'Áudio não fornecido ou chave da API não configurada.',
        details: !ai ? 'GEMINI_API_KEY ausente no servidor.' : 'Buffer de áudio vazio.',
      });
    }

    const { transcript, errorReason } = await transcribeAndAnalyzeVoiceAudio(
      ai,
      audioBase64,
      mimeType,
      contextHint
    );

    if (transcript) {
      return res.json({ transcription: transcript });
    }

    return res.status(422).json({
      error: 'Não foi possível identificar fala clara no áudio.',
      details: errorReason || 'Tente falar mais próximo ao microfone ou digite o texto.',
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Erro ao transcrever áudio.',
      details: err?.message || 'Falha inesperada no serviço de transcrição.',
    });
  }
});

// 2. Dedicated Text-to-Speech Endpoint
apiRouter.post('/tts', async (req, res) => {
  try {
    const ai = getAiClient();
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { text, voiceId = 'alex', voiceName } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required for TTS.' });
    }

    if (!ai) {
      console.warn('[TTS] GEMINI_API_KEY is not configured on the server. Returning graceful fallback.');
      return res.status(200).json({
        audioBase64: null,
        fallbackToWebSpeech: true,
        warning: 'GEMINI_API_KEY not configured on server.',
      });
    }

    const selectedVoice = resolveVoice(voiceId || voiceName, 'Fenrir');
    const ttsCandidateModels = [
      'gemini-3.8-flash-tts',
      'gemini-3.1-flash-tts-preview',
      'gemini-2.5-flash-preview-tts',
      'gemini-3.8-flash-lite-tts',
    ];
    let audioData: string | null = null;
    let lastError: any = null;

    for (const model of ttsCandidateModels) {
      try {
        const ttsResponse = await ai.models.generateContent({
          model,
          contents: text.trim(),
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: selectedVoice },
              },
            },
          },
        });

        const rawAudioData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
        if (rawAudioData) {
          audioData = ensureWavBase64(rawAudioData, 24000);
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[TTS] Model ${model} failed:`, err?.message || err);
      }
    }

    if (audioData) {
      return res.json({
        audioBase64: audioData,
        mimeType: 'audio/wav',
      });
    }

    // Gracefully advise client to fallback to WebSpeech rather than crashing with 500
    return res.status(200).json({
      audioBase64: null,
      fallbackToWebSpeech: true,
      warning: lastError?.message || 'TTS generation unavailable.',
    });
  } catch (error: any) {
    console.error('Error in /api/tts handler:', error);
    return res.status(200).json({
      audioBase64: null,
      fallbackToWebSpeech: true,
      error: error?.message || 'Internal handler error',
    });
  }
});

// Shared JSON generation helper across auxiliary endpoints
async function generateJsonWithFallback(ai: GoogleGenAI, prompt: string): Promise<any> {
  const models = [
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash',
    'gemini-3-flash-preview',
    'gemini-3.8-flash',
  ];
  let lastErr: any = null;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
      if (response.text) {
        return extractJson(response.text);
      }
    } catch (err: any) {
      lastErr = err;
      console.warn(`[SpeakFluent] Auxiliary JSON model ${model} failed:`, summarizeGeminiErrorPt(err));
    }
  }
  throw new Error(summarizeGeminiErrorPt(lastErr));
}

// 3. Pronunciation & Phonetics Doctor Endpoint
apiRouter.post('/pronunciation-check', async (req, res) => {
  const ai = getAiClient();
  if (!ai) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }

  try {
    const { phrase, userSpokenText } = req.body;

    const prompt = `You are a specialized English Pronunciation Coach for Brazilian Portuguese speakers.
Target phrase or word: "${phrase}"
${userSpokenText ? `User transcribed speech: "${userSpokenText}"` : ''}

Break down this phrase for a Brazilian learner:
1. International Phonetic Alphabet (IPA) representation.
2. Syllable stress breakdown (e.g. pho-TO-gra-pher vs PHO-to-graph).
3. Common pitfalls for Portuguese speakers (e.g., adding extra "i" sound at the end like "Facebook-i", swallowing final consonant, mixing /θ/ with /s/ or /f/, rolling the R instead of retroflex American R).
4. Rhymes with or sounds like familiar Portuguese approximation.
5. Three tongue & mouth placement tips.

Return JSON matching:
{
  "phrase": string,
  "ipa": string,
  "syllableStress": string,
  "portuguesePitfalls": [string],
  "mouthPlacementTips": [string],
  "audioComparison": string,
  "practiceDrill": string
}`;

    const parsed = await generateJsonWithFallback(ai, prompt);
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/pronunciation-check:', error);
    return res.status(500).json({ error: summarizeGeminiErrorPt(error) });
  }
});

// 4. Custom Scenario Generator
apiRouter.post('/generate-scenario', async (req, res) => {
  const ai = getAiClient();
  if (!ai) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }

  try {
    const { idea, level = 'B1' } = req.body;

    const prompt = `Create a realistic, exciting English conversation practice scenario based on this user request:
"${idea}"
Learner CEFR level: ${level}

Return JSON with:
{
  "id": string (kebab-case),
  "title": string (Portuguese title),
  "titleEn": string (English title),
  "description": string (in Portuguese, explaining what the user will practice),
  "partnerRole": string (e.g. "Airbnb host in Edinburgh"),
  "userRole": string (e.g. "Guest arriving with travel questions"),
  "context": string (short scene setting),
  "accent": "American" | "British" | "Australian",
  "starterMessage": string (Opening sentence said by the partner in English),
  "starterTranslationPt": string (Translation in Portuguese),
  "keyVocabulary": [{"word": string, "translationPt": string}],
  "missionGoals": [string] (3 goals to achieve during the dialogue, in Portuguese)
}`;

    const parsed = await generateJsonWithFallback(ai, prompt);
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/generate-scenario:', error);
    return res.status(500).json({ error: summarizeGeminiErrorPt(error) });
  }
});

// 5. Session Evaluation & Certificate Report
apiRouter.post('/session-report', async (req, res) => {
  const ai = getAiClient();
  const { messages = [], scenarioTitle = '', level = 'B1' } = req.body;

  const userMessages = Array.isArray(messages)
    ? messages.filter((m: any) => m.role === 'user' && m.text && m.text.trim())
    : [];

  const buildCalculatedReport = () => {
    const feedbacks = Array.isArray(messages)
      ? messages
          .map((m: any) => m.feedback)
          .filter((f: any) => f && typeof f.grammarScore === 'number')
      : [];

    const grammarAvg = feedbacks.length > 0
      ? Math.round(feedbacks.reduce((acc: number, f: any) => acc + f.grammarScore, 0) / feedbacks.length)
      : 84;
    const fluencyAvg = feedbacks.length > 0
      ? Math.round(feedbacks.reduce((acc: number, f: any) => acc + f.fluencyScore, 0) / feedbacks.length)
      : 82;
    const vocabAvg = feedbacks.length > 0
      ? Math.round(feedbacks.reduce((acc: number, f: any) => acc + f.vocabularyScore, 0) / feedbacks.length)
      : 85;
    const overallAvg = Math.round((grammarAvg + fluencyAvg + vocabAvg) / 3);

    const allCorrections: any[] = [];
    feedbacks.forEach((f: any) => {
      if (Array.isArray(f.corrections)) {
        f.corrections.forEach((c: any) => {
          allCorrections.push({
            before: c.original || 'Frase inicial',
            after: c.corrected || 'Frase aperfeiçoada',
            ruleExplanationPt: c.explanationPt || 'Ajuste de concordância e naturalidade.',
          });
        });
      }
    });

    const allVocab: any[] = [];
    feedbacks.forEach((f: any) => {
      if (Array.isArray(f.vocabularyBoost)) {
        f.vocabularyBoost.forEach((v: any) => {
          allVocab.push({
            word: v.word,
            meaningPt: v.meaningPt,
            usage: v.example || `Pratique "${v.word}" em conversas do dia a dia.`,
          });
        });
      }
    });

    return {
      overallScore: userMessages.length === 0 ? 75 : overallAvg,
      grammarScore: userMessages.length === 0 ? 75 : grammarAvg,
      fluencyScore: userMessages.length === 0 ? 75 : fluencyAvg,
      vocabularyScore: userMessages.length === 0 ? 75 : vocabAvg,
      summaryPt: userMessages.length === 0
        ? 'Sua sessão foi iniciada! Envie algumas mensagens em inglês para que o tutor faça uma análise aprofundada da sua fala.'
        : `Excelente dedicação na prática de "${scenarioTitle || 'Conversação'}" no nível ${level}. Você demonstrou clareza nas ideias e bom ritmo na troca de turnos.`,
      topStrengths: [
        'Boa disposição para comunicar suas ideias em inglês',
        'Compreensão do contexto e fluxo do diálogo',
        'Uso assertivo das palavras-chave da conversa',
      ],
      areasToImprove: [
        'Atenção à concordância de tempos verbais no passado',
        'Expandir respostas utilizando conectivos como "however", "therefore" e "besides"',
      ],
      topVocabularyLearned: allVocab.slice(0, 4),
      keyGrammarFixes: allCorrections.slice(0, 3),
      suggestedNextChallenge: 'Pratique um cenário de trabalho ou faça mais 3 perguntas ao tutor no Modo Livre!',
    };
  };

  if (!ai) {
    return res.json(buildCalculatedReport());
  }

  try {
    if (userMessages.length === 0) {
      return res.json(buildCalculatedReport());
    }

    const transcript = messages
      .map((m: any) => `${m.role === 'user' ? 'STUDENT' : 'TUTOR'}: ${m.text}`)
      .join('\n');

    const prompt = `Analyze this complete English practice dialogue between a Brazilian Portuguese learner and an AI English tutor.
Scenario Title: ${scenarioTitle || 'Free Conversation'}
Target CEFR Level: ${level || 'B1'}

Full Transcript:
${transcript}

Return ONLY a valid JSON object with this exact structure:
{
  "overallScore": number (1-100),
  "grammarScore": number (1-100),
  "fluencyScore": number (1-100),
  "vocabularyScore": number (1-100),
  "summaryPt": string (2-3 encouraging sentences in Portuguese about the student's performance),
  "topStrengths": [string] (2-3 bullet points in Portuguese),
  "areasToImprove": [string] (2-3 actionable points in Portuguese),
  "topVocabularyLearned": [{"word": string, "meaningPt": string, "usage": string}],
  "keyGrammarFixes": [{"before": string, "after": string, "ruleExplanationPt": string}],
  "suggestedNextChallenge": string (in Portuguese)
}`;

    const parsed = await generateJsonWithFallback(ai, prompt);
    if (!parsed || typeof parsed.overallScore !== 'number') {
      return res.json(buildCalculatedReport());
    }

    return res.json({
      overallScore: parsed.overallScore || 85,
      grammarScore: parsed.grammarScore || 82,
      fluencyScore: parsed.fluencyScore || 85,
      vocabularyScore: parsed.vocabularyScore || 84,
      summaryPt: parsed.summaryPt || 'Parabéns pela dedicação nesta sessão de conversação!',
      topStrengths: Array.isArray(parsed.topStrengths) ? parsed.topStrengths : ['Comunicação fluida'],
      areasToImprove: Array.isArray(parsed.areasToImprove) ? parsed.areasToImprove : ['Praticar mais conectivos'],
      topVocabularyLearned: Array.isArray(parsed.topVocabularyLearned) ? parsed.topVocabularyLearned : [],
      keyGrammarFixes: Array.isArray(parsed.keyGrammarFixes) ? parsed.keyGrammarFixes : [],
      suggestedNextChallenge: parsed.suggestedNextChallenge || 'Continue praticando novos tópicos!',
    });
  } catch (error: any) {
    console.warn('AI report generation error, using calculated report:', error);
    return res.json(buildCalculatedReport());
  }
});

// Mount the router both on /api and root (to handle all Vercel rewrite permutations seamlessly)
app.use('/api', apiRouter);
app.use(apiRouter);

// Export handler for Vercel Serverless Function directly
export default app;
