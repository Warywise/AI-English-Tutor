# 🎙️ SpeakFluent AI — Prática de Conversação em Inglês

Plataforma interativa para prática de conversação em inglês com Inteligência Artificial, projetada para estudantes brasileiros. Conta com tutores com vozes naturais, feedback gramatical e fonético em tempo real, cenários do mundo real (A1 a C2), **sistema de memória contínua do aluno** e sincronização segura de backup no **Google Drive**.

---

## ⚡ Principais Funcionalidades

- **🗣️ Prática por Voz em Tempo Real**: Fale diretamente ao microfone com reconhecimento de fala contínuo e analisador de ondas sonoras.
- **🧠 Memória Contínua do Aluno**: O tutor lembra de fatos sobre você (profissão, rotina, planos, preferências) ao longo de dias e sessões diferentes, sem misturar com outros usuários.
- **🎭 Modo Cenários & Modo Livre**:
  - *Modo Livre*: Conversa fluida com o tutor da sua escolha, que pode alternar naturalmente para o português para explicar nuances e gírias.
  - *Modo Cenários*: Simulações do dia a dia (Imigração no Aeroporto, Entrevista de Emprego, Café em Nova York, Pedir Comida em Londres).
- **🩺 Doutor de Pronúncia & Fonética**: Decomposição em IPA (alfabeto fonético), sílaba tônica e dicas para vícios comuns de pronúncia de brasileiros.
- **📊 Relatório Pedagógico & Certificado**: Avaliação detalhada de gramática, vocabulário e fluência com base no quadro europeu (CEFR).
- **☁️ Backup no Google Drive**: Salve e restaure seu histórico, cofre de vocabulário e memórias de forma criptografada na sua própria conta Google.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Motion.
- **Backend**: Express modular + Vercel Serverless Functions (`/api/*`).
- **IA**: Google Gemini API (`@google/genai` — modelos `gemini-3.1-flash-lite`, `gemini-3.8-flash` e áudio TTS).
- **Áudio & Voz**: Web Speech API nativa do navegador + Gemini TTS com vozes Fenrir, Zephyr, Kore, Charon e Puck.
- **Armazenamento & Nuvem**: `localStorage` no dispositivo do usuário + Google Drive API via Firebase Auth.

---

## ⚙️ O que é Feito "Por Baixo dos Panos" e Configurações Manuais

Para que a aplicação funcione em produção na Vercel, preste atenção aos seguintes pontos:

### 1. Chave de API do Gemini (`GEMINI_API_KEY`) — **Obrigatório**
- **O que acontece**: Todas as respostas dos tutores, correções gramaticais, fonética e extração de memórias passam pelo Gemini no backend.
- **O que você precisa fazer**:
  1. Obtenha uma chave de API gratuita no [Google AI Studio](https://aistudio.google.com/app/apikey).
  2. Ao subir na **Vercel**: adicione a variável `GEMINI_API_KEY` nas configurações do projeto (**Project Settings -> Environment Variables**).

### 2. Autenticação do Google Drive (Firebase Auth) — **Configuração de Domínio**
- **O que acontece**: O botão de sincronização com o Google Drive usa um popup do Google (`signInWithPopup`). O arquivo `firebase-applet-config.json` já contém o Client ID e a configuração base.
- **O que você precisa fazer após o primeiro deploy na Vercel**:
  1. Acesse o [Firebase Console](https://console.firebase.google.com/).
  2. Abra o projeto (`gen-lang-client-0871995579` ou o seu próprio projeto).
  3. Vá em **Authentication** ➔ aba **Settings** ➔ **Authorized domains** (Domínios autorizados).
  4. Clique em **Add domain** e insira o endereço da sua aplicação na Vercel (ex: `meu-app.vercel.app`).
  > *Sem esse passo, ao tentar conectar o Google Drive o navegador exibirá o erro `auth/unauthorized-domain`.*

### 3. Microfone e Reconhecimento de Voz (Web Speech API)
- **O que acontece**: O app capta o áudio do microfone do usuário e faz a transcrição em tempo real.
- **O que você precisa saber**:
  - Os navegadores exigem **HTTPS** para liberar o microfone. A Vercel já fornece HTTPS gratuito automaticamente.
  - O usuário deve autorizar a permissão de microfone quando o navegador solicitar.
  - Recomendado usar navegadores baseados em Chromium (Google Chrome, Edge, Brave, Opera) ou Safari.

### 4. Armazenamento das Memórias e Conversas
- **O que acontece**: Todas as conversas e memórias do perfil do aluno são salvas **localmente no navegador** (`localStorage`) de cada pessoa.
- **Por que isso é seguro**: Não existe risco de duas pessoas usando o mesmo link verem o histórico ou os dados uma da outra. Cada pessoa tem sua experiência 100% individual e privada.

---

## 🚀 Como Rodar Localmente

1. **Clone o repositório e instale as dependências:**
   ```bash
   git clone <URL_DO_REPOSITORIO>
   cd <PASTA_DO_PROJETO>
   npm install
   ```

2. **Crie o arquivo de variáveis de ambiente:**
   Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```
   Abra o `.env` e adicione sua chave:
   ```env
   GEMINI_API_KEY="sua_chave_do_google_ai_studio"
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse no navegador: `http://localhost:3000`

---

## 🌐 Como Fazer Deploy na Vercel

O projeto já está 100% configurado com `vercel.json` e o manipulador Serverless em `api/index.ts`.

1. Suba seu código para um repositório no **GitHub**, **GitLab** ou **Bitbucket**.
2. No painel da [Vercel](https://vercel.com/):
   - Clique em **Add New...** ➔ **Project**.
   - Selecione o seu repositório.
3. Nas configurações de **Environment Variables**:
   - Adicione `GEMINI_API_KEY` com o valor da sua chave do Google AI Studio.
4. Clique em **Deploy**!
5. Copie a URL gerada (ex: `https://speakfluent-ai.vercel.app`) e adicione nos **Authorized Domains** do Firebase conforme explicado na seção 2.

---

## 📁 Estrutura do Projeto

```text
├── api/
│   └── index.ts              # Handler serverless para a Vercel
├── src/
│   ├── components/           # Componentes React (Chat, Modais, Perfil, Cenários, etc.)
│   ├── data/                 # Cenários pré-configurados (A1 a C2)
│   ├── server/
│   │   └── app.ts            # Aplicação Express com rotas de IA e CORS
│   ├── services/
│   │   └── googleDriveService.ts  # Autenticação Google & Sync do Drive
│   ├── utils/
│   │   ├── speech.ts         # Reconhecimento de fala e síntese de áudio
│   │   └── storage.ts        # Gerenciamento de memória e histórico local
│   ├── App.tsx               # Componente principal da aplicação
│   └── types.ts              # Tipagens TypeScript completas
├── server.ts                 # Servidor local Express com Vite middlewares (porta 3000)
├── vercel.json               # Configurações de rotas e Serverless da Vercel
├── firebase-applet-config.json # Configuração base do Firebase
└── package.json              # Dependências e scripts de execução
```

---

Pronto para praticar e falar inglês com confiança! 🚀
