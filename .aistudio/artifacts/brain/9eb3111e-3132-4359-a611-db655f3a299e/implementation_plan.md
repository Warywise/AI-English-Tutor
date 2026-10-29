# Plano de Aprimoramento de Áudio Bilíngue, Paridade Mobile e Correção do Botão Parar

Este plano resolve os problemas identificados:
1. **Pronúncia embolada** ao misturar inglês e português no áudio.
2. **Degradação de voz no celular** para o sintetizador mecânico do Google Tradutor.
3. **Comportamento do botão "Parar"**, que atualmente reiniciava o áudio do início em vez de interromper a reprodução.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Decisões confirmadas e novos itens incorporados:**
> 1. **Code-Switching com Fonética e Pausas Ajustadas**: O tutor manterá o estilo bilíngue nas falas, com pausas estruturadas e estilo vocal orientado no backend para pronunciar explicações em português brasileiro com clareza, sem fonética anglo-saxônica distorcida.
> 2. **Paridade Absoluta Mobile vs. PC**: O celular reproduzirá a exata mesma voz neural do desktop (Gemini TTS), desbloqueando o contexto de áudio no toque do botão de envio ou microfone e eliminando o fallback mecânico do Google Tradutor.
> 3. **Correção do Botão "Parar" (Stop)**: Correção da lógica de interrupção em `handlePlayAudio` — atualmente, o valor de `playbackSpeed` passado como parâmetro anulava a verificação `!customSpeed`, fazendo o player recomeçar do segundo zero em vez de pausar.

---

### 1. Overview & Core Concept

- **Objetivo**: Garantir uma experiência de áudio consistente, natural e com controle total do usuário tanto no computador quanto no smartphone.
- **Público-Alvo**: Estudantes brasileiros que utilizam o app em diferentes dispositivos (celular e desktop) e precisam pausar, repetir ou ouvir explicações com clareza fonética.
- **Valor Principal**: Conversação agradável, controle instantâneo de play/pause e qualidade de estúdio em qualquer tela.

---

### 2. User Experience & Visual Design

- **Controle Preciso de Reprodução (Play / Pause / Stop)**:
  - Ao tocar em **"Ouvir"**, o botão se transforma imediatamente no estado visual ativo: **"Parar"** (com ícone `VolumeX` e cor de destaque).
  - Ao clicar em **"Parar"**, o áudio é imediatamente interrompido, o player é zerado e o botão volta ao estado de repouso ("Ouvir").
  - Ao clicar no botão de velocidade lenta (🐢 0.75x Lento) durante uma reprodução, o áudio alterna para o ritmo lento sem reiniciar inesperadamente.

- **Fluxo Mobile (Toque e Autoplay)**:
  - O toque do usuário no botão de envio ou microfone executa uma chamada síncrona de desbloqueio (`unlockAudioContext()`).
  - Quando a resposta do servidor chega com o áudio neural, o navegador móvel (iOS Safari / Android Chrome) executa a reprodução com a mesma voz do PC.
  - Caso o sistema do celular esteja em modo silencioso físico, o botão de áudio no balão da mensagem permite disparar o áudio manualmente a qualquer momento.

---

### 3. Key Product Decisions & Trade-Offs

#### Decisão 1: Correção do Bug do Botão "Parar"
- **Diagnóstico**: No componente de mensagem (`App.tsx`), o botão chamava `handlePlayAudio(message.id, message.text, message.audioBase64, playbackSpeed)`. Como `playbackSpeed` (ex.: `1.0`) era passado como 4º argumento (`customSpeed`), a verificação `if (currentlyPlayingId === id && !customSpeed)` falhava (pois `!1.0 === false`). Em vez de pausar, o código executava `audioPlayer.play()`, reiniciando a fala do início.
- **Solução**:
  - Criar uma função explícita `handleStopAudio()` ou refatorar `handlePlayAudio` para que, se o áudio clicado já for o `currentlyPlayingId` (com a mesma velocidade ou clique direto no botão Parar), execute `audioPlayer.stop()` e resete o estado imediatamente.
  - Desacoplar a ação de parar da passagem do parâmetro de velocidade padrão.

#### Decisão 2: Fonética Bilíngue e Pausas Naturais
- **Abordagem Escolhida**:
  - Refinar o prompt do sistema para orientar o tutor a usar pontuação cadenciada (travessões e quebras) ao fazer transições de idioma.
  - Ajustar o `speechMetadata` do Gemini TTS (`gemini-3.8-flash-lite-tts`) com a instrução explícita de estilo vocal: `"Conversational bilingual English tutor speaking with Brazilian learners. Natural English pronunciation and authentic Portuguese pronunciation for quick explanations"`.
  - Normalizar termos em português para evitar que regras fonéticas inglesas gerem pronúncias truncadas.

#### Decisão 3: Paridade Mobile e Remoção do Google Tradutor
- **Abordagem Escolhida**:
  - Ampliar o timeout do backend de 4s para 18s em `src/server/app.ts`, garantindo que conexões móveis não descartem o áudio neural.
  - Implementar o desbloqueador de áudio móvel acionado no toque físico do usuário.
  - Remover o fallback automático para o `SpeechSynthesis` nativo quando o áudio do Gemini estiver habilitado. Se houver falha de rede, exibir opção de retry com áudio da IA em vez de forçar a voz mecânica do sistema.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        USER ACTIONS (TOUCH & CLICKS)                   │
│                                                                        │
│  [Enviar / Mic] ────► unlockAudio() (Libera autoplay em iOS/Android)   │
│  [Parar]        ────► handleStopAudio() / audioPlayer.stop()           │
│                       └─► Interrupção imediata, sem reinício           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       BACKEND API (/api/chat)                          │
│                                                                        │
│  1. Prompt com cadência bilíngue e pontuação natural                   │
│  2. Gemini TTS com timeout de 18s (evita queda no mobile)             │
│  3. speechMetadata orientado para dicção bilíngue clara                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      GLOBAL AUDIO PLAYER (speech.ts)                   │
│                                                                        │
│  - Áudio neural WAV base64 do Gemini em HTMLAudioElement               │
│  - Stop limpo: pause(), currentTime = 0, onEndCallback resetado        │
│  - Sem fallback forçado para voz robótica do Google Tradutor           │
└────────────────────────────────────────────────────────────────────────┘
```

#### Arquivos Envolvidos na Execução:
1. **`src/App.tsx`**:
   - Correção do `handlePlayAudio` e implementação de toggle limpo de play/stop.
   - Chamada de desbloqueio de áudio mobile no envio de mensagens e acionamento do microfone.
2. **`src/utils/speech.ts`**:
   - Adição do utilitário `unlockMobileAudio()`.
   - Limpeza do método `stop()` e desativação do fallback que ativava a voz mecânica do sistema.
3. **`src/server/app.ts`**:
   - Aumento do timeout de síntese para 18s.
   - Instruções de estilo bilíngue no prompt e no `speechMetadata`.
