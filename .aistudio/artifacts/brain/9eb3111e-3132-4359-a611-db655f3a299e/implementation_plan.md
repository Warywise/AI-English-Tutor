# Learner Long-Term Memory & Personalized Student Profile

Plano de arquitetura e implementação para dotar o tutor pessoal de inglês de **memória contínua de longo prazo (Long-Term Memory)** e um **Perfil Pessoal do Estudante**. O tutor agora recordará a profissão, rotina, gostos, objetivos e peculiaridades do usuário ao longo dos dias, mantendo um vínculo afetivo e pedagógico hiperpersonalizado em todos os modos e sincronizado remotamente no Google Drive.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Decisões confirmadas pelo usuário:**
> 1. **Gravação Automática com Curadoria Manual**: O tutor detectará e extrairá novos fatos e detalhes pessoais em tempo de conversa, além de fornecer uma central dedicada onde o usuário pode visualizar, ajustar, adicionar e apagar lembranças a qualquer momento.
> 2. **Presença em Ambos os Modos**: O contexto pessoal do aluno será utilizado tanto no **Modo Livre** (para conversas contínuas sobre rotina e vida real) quanto nos **Cenários Práticos** (para contextualizar simulações, como entrevistas na área profissional real do usuário).
> 3. **Latência vs. Profundidade**: O usuário priorizou respostas ricas, humanas e atenciosas, aceitando o tempo adicional necessário para o modelo sintetizar a memória persistente e gerar conselhos pedagógicos sob medida.

---

### 1. Overview & Core Concept

- **O que faz**:
  Transforma o tutor de um assistente sem memória entre sessões em um verdadeiro mentor contínuo. Ele se lembra de onde você mora, no que você trabalha, quais projetos está desenvolvendo, suas dificuldades gramaticais frequentes e seus hobbies. Em conversas futuras, ele puxa assunto naturalmente ("*How is that new software rollout going?*") e utiliza seus interesses para contextualizar explicações de vocabulário.
- **Público-alvo**:
  Estudantes e profissionais brasileiros que desejam uma experiência de mentoria particular diária sem precisar repetir quem são ou no que trabalham a cada nova sessão.
- **Valor central**:
  Continuidade real de aprendizado e alto engajamento, com total controle do usuário sobre o que está guardado na sua mente digital.

---

### 2. User Experience & Visual Design

#### A. Jornada do Usuário
1. **Acesso à Memória no Cabeçalho**:
   - Um novo botão elegante **"🧠 Memória do Aluno"** no cabeçalho superior (ao lado do Cofre de Vocabulário e Google Drive), exibindo um indicador numérico de fatos conhecidos pelo tutor.
2. **Modal / Central de Perfil & Memória**:
   - **Campos Estruturados**:
     - *Nome preferido de tratamento* (ex: Gustavo).
     - *Profissão / Área de Atuação* (ex: Engenheiro de Software / Desenvolvedor).
     - *Cidade / País* (ex: Curitiba, Brasil).
     - *Nível e Meta Principal* (ex: Destravar fluência para reuniões com clientes internacionais).
     - *Hobbies & Interesses* (ex: Música, violão, tecnologia, corrida).
   - **Fatos Memorizados Automaticamente**:
     - Lista dinâmica de fatos que o tutor aprendeu durante suas conversas (ex: *"Mencionou que prefere café sem açúcar"*, *"Tem uma apresentação em inglês na próxima sexta-feira"*).
     - Cada fato possui botão para editar ou excluir individualmente com 1 clique.
   - **Anotações Livres / Contexto Geral**:
     - Caixa de texto aberta para o estudante inserir qualquer instrução ou contexto especial que queira que o tutor sempre saiba.
3. **Detecção e Atualização Suave no Chat**:
   - Quando o estudante compartilha uma nova informação durante o bate-papo, a resposta da IA retorna opcionalmente uma chave `newMemoryFacts`.
   - Uma notificação sutil e não intrusiva ("*Alex guardou na memória: Engenheiro de Software*") surge para dar transparência ao que foi aprendido.
4. **Sincronização em Nuvem**:
   - A memória faz parte do payload do `SpeakFluent_AI_Backup.json`, subindo automaticamente para o Google Drive do usuário.

#### B. Identidade Visual & Diretrizes Estéticas
- **Paleta Temática**:
  - Índigo profundo (`#1E1B4B`), Azul Royal (`#2563EB`) e Violeta suave (`#7C3AED`) para evocar sabedoria, aprendizado e personalização refinada.
  - Cartões em ardósia neutra com bordas sutis e tipografia nítida (sem pílulas coloridas estáticas ou poluição visual).
- **Tipografia**:
  - Títulos elegantes com peso visual SemiBold e corpo de texto com leitura confortável e alto contraste (WCAG AA).

---

### 3. Key Product Decisions & Trade-Offs

- **Decisão 1: Formato Híbrido de Memória (Campos Estruturados + Fatos Dinâmicos + Texto Livre)**
  - *Abordagem escolhida*: Combinar campos chave com uma lista de marcadores dinâmicos e uma caixa de anotações livres.
  - *Por que*: Oferece o equilíbrio ideal entre precisão (para preencher prompts de forma estruturada) e flexibilidade total para qualquer detalhe inusitado que o aluno queira registrar.
  - *Alternativa descartada*: Somente texto livre (dificulta a formulação de perguntas focadas pelo modelo) ou apenas campos rígidos (inviabiliza capturar detalhes como "tenho uma viagem marcada para Orlando em novembro").

- **Decisão 2: Injeção Sintetizada no Backend (`server.ts`)**
  - *Abordagem escolhida*: O backend sintetiza o perfil em um bloco `STUDENT PROFILE & LONG-TERM MEMORY` nas diretrizes do sistema do Gemini 2.5 Flash.
  - *Por que*: O modelo processa esse bloco com alta prioridade de atenção, garantindo que ele não sofra de amnésia mesmo ao iniciar um cenário novo ou após centenas de mensagens trocadas.

- **Decisão 3: Privacidade e Controle Total (Zero Black Box)**
  - *Abordagem escolhida*: O usuário pode ver cada item individual que a IA memorizou, com botão de lixeira imediato e opção de desativar a gravação automática se preferir.
  - *Por que*: Segurança, transparência e confiança.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        INTERFACE DO USUÁRIO                            │
│                                                                        │
│  ┌───────────────────────┐             ┌────────────────────────────┐  │
│  │ Header / Controles    │             │ Chat (Livre & Cenários)    │  │
│  │ [🧠 Memória] [Cofre]  │             │ Mensagens + Feedback       │  │
│  └───────────┬───────────┘             └─────────────┬──────────────┘  │
└──────────────┼───────────────────────────────────────┼─────────────────┘
               │                                       │
               ▼                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   GERENCIADOR DE ESTADO & STORAGE                      │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ learnerProfile = {                                               │  │
│  │   name, occupation, location, goals, hobbies,                    │  │
│  │   autoLearnedFacts: string[], generalNotes: string               │  │
│  │ }                                                                │  │
│  └───────────────────┬───────────────────────────────┬──────────────┘  │
│                      │                               │                 │
│         Salva no localStorage            Sincroniza no Google Drive    │
└──────────────────────┼───────────────────────────────┼─────────────────┘
                       │                               │
                       ▼                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       BACKEND (server.ts)                              │
│                                                                        │
│  POST /api/chat {                                                      │
│    messages, userMessage, scenario, level, tutorName,                  │
│    learnerProfile: { ... }                                             │
│  }                                                                     │
│                                                                        │
│  Gemini 2.5 Flash Prompt:                                              │
│  "STUDENT MEMORY CONTEXT:                                              │
│   Occupation: ..., Goals: ..., Notes: ..., Facts: [...]                │
│   Use these details to personalize naturally..."                       │
│                                                                        │
│  Output JSON:                                                          │
│  { replyText, feedback, newMemoryFacts: ["..."] }                      │
└────────────────────────────────────────────────────────────────────────┘
```

#### Estrutura de Dados do Perfil (`LearnerProfile`)
```typescript
interface LearnerProfile {
  preferredName: string;
  occupation: string;
  location: string;
  primaryGoal: string;
  interests: string;
  generalNotes: string;
  autoLearnedFacts: Array<{
    id: string;
    fact: string;
    createdAt: number;
  }>;
  autoExtractEnabled: boolean;
}
```

#### Estratégia de Verificação e Teste
1. **Persistência**: Testar salvamento local e recuperação imediata no recarregamento.
2. **Integração no Google Drive**: Validar inclusão no arquivo `SpeakFluent_AI_Backup.json`.
3. **Conversação com Memória**: Testar envio de mensagem mencionando a profissão e verificar se o tutor reconhece e faz alusão ao contexto profissional.
4. **Auditoria de Código**: Executar compilação com `compile_applet` e `lint_applet` para garantir estabilidade e ausência de regressões.
