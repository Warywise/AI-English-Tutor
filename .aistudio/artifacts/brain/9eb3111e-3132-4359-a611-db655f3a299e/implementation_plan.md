# Plano de Implementação: Correção do Envio de Áudio e Remoção Total de Fallbacks Falsos

## 1. Diagnóstico do Problema Atual
1. **Por que o áudio enviava `"Let's talk and practice my English!"`**:
   - O gravador do navegador (`MediaRecorder`) gera fragmentos `audio/webm;codecs=opus` ou `audio/mp4` a cada 250ms (especialmente ao usar pausa/retomada), formato que frequentemente falha na decodificação multimodal ou retorna transcrição vazia.
   - No backend (`/api/index.ts` e `/src/server/app.ts`), quando `transcribeAndAnalyzeVoiceAudio` retornava vazio ou falhava, o código executava um fallback silencioso:
     ```ts
     if (!effectiveUserMessage) {
       effectiveUserMessage = "Let's talk and practice my English!";
     }
     ```
2. **Fallbacks Falsos Escondendo Erros da API**:
   - No backend (`/api/chat`), se os modelos falhassem, havia dois blocos de fallback que retornavam `HTTP 200` fingindo ser o tutor (`"Hey! I heard you loud and clear..."` e `"I heard you! Let's keep going..."`).
   - No frontend (`/src/App.tsx`), o bloco `catch` de `handleSendMessage` engolia qualquer erro e injetava uma resposta falsa do tutor: `"I heard you! That's a great point. Como você expandiria essa ideia em mais uma frase? Tell me more about it!"`.

---

## 2. Solução Proposta

### A. Conversão de Áudio para WAV 16kHz Mono no Cliente (`/src/utils/speech.ts`)
- Ao finalizar a gravação no `VoiceRecorder.stop()`, decodificar os chunks de áudio via `AudioContext.decodeAudioData` e codificar em **WAV padrão (`audio/wav`, 16kHz, 16-bit PCM mono)**.
- **Vantagens**:
  - Compatibilidade de 100% com todos os modelos de áudio do Gemini (`gemini-3.5-transcribe`, `gemini-3.8-flash`, `gemini-3.1-flash-lite`), eliminando falhas de container WebM/Opus em celulares e desktops, inclusive após usar **Pausar / Continuar**.
  - Verificação imediata de volume (RMS/pico) para avisar caso o microfone tenha gravado apenas silêncio absoluto.

### B. Transcrição Precisa e Remoção Total de Fallbacks no Backend (`/api/index.ts` e `/src/server/app.ts`)
- **Configuração correta dos modelos Gemini**:
  - Atualizar `transcribeAndAnalyzeVoiceAudio` para usar `ThinkingLevel.MINIMAL` / `ThinkingLevel.LOW` (em vez de `thinkingBudget` incompatível com a família Gemini 3) e incluir fallback para o modelo dedicado `gemini-3.5-transcribe` caso o modelo multimodal falhe.
- **Eliminação de todos os fallbacks silenciosos em `/api/chat` e `/api/transcribe`**:
  - Remover `effectiveUserMessage = "Let's talk and practice my English!"`.
  - Remover o bloco `if (!parsedData)` que inventava resposta automática do tutor.
  - Remover o `catch` que retornava `status(200)` com `"Mensagem recebida"`.
- **Retorno de erros reais e estruturados**:
  - Se o áudio não tiver fala compreensível ou a transcrição falhar: retornar **HTTP 422** com `{ error, details, code: 'TRANSCRIPTION_FAILED', stage: 'transcription' }`.
  - Se a geração da resposta do tutor falhar ou exceder o tempo limite: retornar **HTTP 502/503** com `{ error, details, code: 'TUTOR_API_ERROR', stage: 'chat', userTranscription }` (preservando a transcrição caso o áudio já tenha sido transcrito com sucesso).

### C. Estado de Erro Real na Conversa com "Tentar Novamente" e "Editar Texto" (`/src/types.ts`, `/src/components/ChatBubble.tsx`, `/src/App.tsx`)
- **Remoção da resposta falsa no `catch` de `/src/App.tsx`**:
  - Nenhuma mensagem fictícia do tutor será adicionada quando ocorrer erro.
- **Bolha do Usuário com Estado de Falha e Ações Diretas**:
  - A mensagem ou áudio enviado permanece na conversa marcada com aviso visual de falha contendo o **motivo resumido do erro** (ex: *"Falha na transcrição do áudio: nenhuma fala detectada"* ou *"Erro na API do tutor: tempo limite excedido"*).
  - **Botão "Tentar novamente"**: Reenvia exatamente o mesmo áudio gravado (ou texto) sem precisar gravar nem digitar de novo.
  - **Botão "Editar texto"**: Abre um campo ou leva para a barra inferior para você digitar/corrigir manualmente o que queria dizer e enviar como texto.
  - **Botão "Excluir"**: Remove a tentativa com falha caso queira descartá-la.
- **Filtro de Histórico**:
  - Mensagens com estado de erro não resolvido são ignoradas no histórico enviado nas próximas chamadas para não poluir o contexto da conversa.
