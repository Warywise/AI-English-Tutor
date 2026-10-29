import { Scenario } from '../types';

export const PRESET_SCENARIOS: Scenario[] = [
  // --- NÍVEL A1 (Iniciante) ---
  {
    id: 'first-day-english',
    title: 'Apresentação & Primeiro Dia de Aula',
    titleEn: 'First Day of English Class & Introductions',
    description: 'Apresente-se com calma: diga seu nome, país de origem, soletre seu sobrenome e fale sobre sua profissão e o que gosta de fazer nas horas vagas.',
    category: 'social',
    partnerRole: 'Emma, a warm and patient English teacher in Dublin welcoming new students',
    userRole: 'A beginner English student on their very first day of class',
    context: 'A bright, friendly language school classroom in Dublin. Everyone is introducing themselves in simple, clear English.',
    accent: 'British',
    recommendedLevel: 'A1',
    starterMessage: "Hello and welcome to our class! I'm Emma. What is your name and where are you from?",
    starterTranslationPt: "Olá e bem-vindo à nossa aula! Eu sou a Emma. Qual é o seu nome e de onde você é?",
    iconName: 'Sparkles',
    missionGoals: [
      'Dizer seu nome e de onde você é no Brasil',
      'Informar sua profissão ou ocupação de forma simples',
      'Falar um hobby ou algo que você gosta de fazer'
    ]
  },
  {
    id: 'convenience-store',
    title: 'Mercadinho & Compras do Dia a Dia',
    titleEn: 'Corner Store & Daily Groceries',
    description: 'Pratique perguntas básicas: encontre garrafas de água, pergunte o preço de frutas, peça uma sacola plástica e faça o pagamento.',
    category: 'daily',
    partnerRole: 'Sam, a friendly cashier at a neighborhood corner store in Chicago',
    userRole: 'A customer buying basic items and snacks',
    context: 'A well-lit corner grocery store with shelves of snacks, drinks, and fresh fruit.',
    accent: 'American',
    recommendedLevel: 'A1',
    starterMessage: "Hi there! Just let me know if you need help finding anything today.",
    starterTranslationPt: "Olá! Só me avisar se precisar de ajuda para encontrar qualquer coisa hoje.",
    iconName: 'Coffee',
    missionGoals: [
      'Perguntar onde fica a água mineral ou refrigerante',
      'Perguntar o preço de um item ("How much is this?")',
      'Dizer se vai pagar em dinheiro ou cartão'
    ]
  },

  // --- NÍVEL A2 (Básico) ---
  {
    id: 'cafe-order',
    title: 'Café em Nova York',
    titleEn: 'Ordering at a Brooklyn Café',
    description: 'Faça seu pedido de café especial, peça opções de leite vegetal, pergunte sobre doces frescos e interaja com o barista nova-iorquino.',
    category: 'daily',
    partnerRole: 'A friendly Brooklyn barista named Liam at a popular neighborhood coffee shop',
    userRole: 'A customer grabbing morning coffee and breakfast',
    context: 'A busy, cozy artisan coffee roastery in Brooklyn with indie music in the background. Rain is tapping on the window.',
    accent: 'American',
    recommendedLevel: 'A2',
    starterMessage: "Good morning! Welcome to Roost & Brew. What can I get started for you today?",
    starterTranslationPt: "Bom dia! Bem-vindo ao Roost & Brew. O que posso preparar para você hoje?",
    iconName: 'Coffee',
    missionGoals: [
      'Pedir um café (ex: oat milk latte ou cappuccino)',
      'Perguntar sobre as opções de lanche ou doce fresco',
      'Perguntar se aceita pagamento com cartão ou Apple Pay'
    ]
  },
  {
    id: 'hotel-checkin',
    title: 'Check-in e Problemas no Hotel',
    titleEn: 'Hotel Check-in & Room Request',
    description: 'Faça check-in no hotel, solicite um quarto silencioso em andar alto e relate um pequeno imprevisto como chave ou ar condicionado.',
    category: 'travel',
    partnerRole: 'David, the front desk concierge at a boutique hotel in Chicago',
    userRole: 'A guest arriving after a long flight',
    context: 'The elegant hotel lobby. You have a reservation and want to check in, request Wi-Fi information and luggage storage.',
    accent: 'American',
    recommendedLevel: 'A2',
    starterMessage: "Welcome to the Grandview Hotel! How are you doing this evening? Are you checking in?",
    starterTranslationPt: "Bem-vindo ao Grandview Hotel! Como você está nesta noite? Deseja fazer o check-in?",
    iconName: 'Building',
    missionGoals: [
      'Fornecer o nome da reserva e documento de identificação',
      'Pedir a senha do Wi-Fi e horário do café da manhã',
      'Solicitar um quarto silencioso ou andar alto'
    ]
  },
  {
    id: 'asking-directions',
    title: 'Pedindo Direções na Cidade',
    titleEn: 'Asking for Street Directions',
    description: 'Aprenda a se orientar no exterior: pergunte como chegar a pontos turísticos, estações de metrô e compreenda referências como "vire à esquerda" e "fica a duas quadras".',
    category: 'travel',
    partnerRole: 'Clara, a helpful local resident walking her dog in San Francisco',
    userRole: 'A traveler looking for the nearest subway station and pharmacy',
    context: 'A street corner near Union Square. You have a map on your phone with low battery and need quick directions.',
    accent: 'American',
    recommendedLevel: 'A2',
    starterMessage: "Excuse me! You look a bit lost—can I help you find somewhere around here?",
    starterTranslationPt: "Com licença! Você parece um pouco perdido — posso te ajudar a encontrar algum lugar por aqui?",
    iconName: 'Plane',
    missionGoals: [
      'Perguntar onde fica a estação de metrô mais próxima',
      'Perguntar se dá para ir a pé e quanto tempo demora',
      'Agradecer cordialmente e confirmar a direção'
    ]
  },

  // --- NÍVEL B1 (Intermediário) ---
  {
    id: 'airport-immigration',
    title: 'Imigração no Aeroporto de Londres',
    titleEn: 'Heathrow Airport Border Control',
    description: 'Enfrente com segurança as perguntas do oficial de imigração: motivo da viagem, duração da estadia, comprovante de hospedagem e retorno.',
    category: 'travel',
    partnerRole: 'Officer Jenkins, a polite but firm UK Border Force officer at London Heathrow Terminal 2',
    userRole: 'An international traveler arriving in the United Kingdom',
    context: 'Passport control desk at London Heathrow. The officer is inspecting your passport and asking mandatory entry questions.',
    accent: 'British',
    recommendedLevel: 'B1',
    starterMessage: "Passport and landing slip, please. What is the primary purpose of your visit to the United Kingdom?",
    starterTranslationPt: "Passaporte e ficha de desembarque, por favor. Qual é o objetivo principal da sua visita ao Reino Unido?",
    iconName: 'Plane',
    missionGoals: [
      'Explicar claramente o propósito da viagem (turismo, conferência ou visita)',
      'Informar quantos dias vai ficar e onde vai se hospedar',
      'Responder com calma e segurança em caso de pedido de comprovante'
    ]
  },
  {
    id: 'social-party',
    title: 'Festa e Networking em Sydney',
    titleEn: 'Casual Chit-Chat at a Rooftop Party',
    description: 'Aprenda o "small talk" natural: como iniciar conversas, falar sobre interesses, filmes, viagens e trabalho de forma descontraída.',
    category: 'social',
    partnerRole: 'Chloe, an upbeat graphic designer attending a mutual friend’s rooftop barbecue in Sydney',
    userRole: 'A newcomer at the party mingling with guests',
    context: 'A relaxed sunset barbecue on a Sydney rooftop overlooking the harbor. Music is playing, drinks are being poured.',
    accent: 'Australian',
    recommendedLevel: 'B1',
    starterMessage: "Hey there! I don't think we've met yet—I'm Chloe. How do you know Marcus? That breeze up here is amazing, isn't it?",
    starterTranslationPt: "Ei! Acho que a gente ainda não se conhece — sou a Chloe. De onde você conhece o Marcus? Essa brisa aqui em cima está maravilhosa, não é?",
    iconName: 'Sparkles',
    missionGoals: [
      'Apresentar-se e comentar sobre como conheceu o anfitrião',
      'Compartilhar um hobby ou o que você faz no dia a dia',
      'Fazer perguntas abertas para manter a conversa fluindo'
    ]
  },
  {
    id: 'doctor-clinic',
    title: 'Consulta Médica de Urgência',
    titleEn: 'Doctor Walk-in Clinic Visit',
    description: 'Descreva sintomas físicos com precisão (dor, febre, tempo de duração), pergunte sobre dosagem de remédios e alergias.',
    category: 'daily',
    partnerRole: 'Dr. Evans, a caring general practitioner at an urgent care clinic in Miami',
    userRole: 'A patient feeling unwell seeking medical advice',
    context: 'Examination room in a modern clinic. The doctor is ready to take notes and diagnose your symptoms.',
    accent: 'American',
    recommendedLevel: 'B1',
    starterMessage: "Hello! Come on in, please have a seat. What seems to be bothering you today?",
    starterTranslationPt: "Olá! Pode entrar, por favor sente-se. O que está te incomodando hoje?",
    iconName: 'HeartPulse',
    missionGoals: [
      'Descrever os sintomas (ex: dor de cabeça, febre, garganta)',
      'Explicar há quantos dias os sintomas começaram',
      'Perguntar sobre a medicação e quantas vezes ao dia tomar'
    ]
  },
  {
    id: 'restaurant-complaint',
    title: 'Jantar Fora & Pedido Trocado',
    titleEn: 'Dining Out & Polite Food Replacement',
    description: 'Pratique como expressar insatisfação de forma educada em um restaurante: comunique que seu prato veio frio ou trocado, peça substituição e solicite a conta.',
    category: 'daily',
    partnerRole: 'Julian, an attentive waiter at an Italian bistro in Manchester',
    userRole: 'A diner whose main course arrived lukewarm and with an unexpected ingredient',
    context: 'A bustling bistro during dinner rush. You need to call the waiter and politely resolve the issue with your meal.',
    accent: 'British',
    recommendedLevel: 'B1',
    starterMessage: "Good evening! How is everything tasting over here? Is your meal to your satisfaction?",
    starterTranslationPt: "Boa noite! Como está tudo por aqui? O prato está do seu agrado?",
    iconName: 'Coffee',
    missionGoals: [
      'Agradecer e explicar com cortesia que o prato veio frio ou incorreto',
      'Pedir gentilmente para aquecer ou trocar o prato',
      'Pedir a conta no final ("Could we get the check, please?")'
    ]
  },

  // --- NÍVEL B2 (Intermediário Alto) ---
  {
    id: 'tech-interview',
    title: 'Entrevista de Emprego Tech',
    titleEn: 'Software Engineering Job Interview',
    description: 'Pratique perguntas clássicas de entrevista técnica em inglês: apresentação pessoal, como lidou com conflitos de prazo e expectativas de carreira.',
    category: 'work',
    partnerRole: 'Sarah, an Engineering Director at a Silicon Valley tech company',
    userRole: 'A software engineer interviewing for a senior remote position',
    context: 'A video call job interview. Sarah is warm but professional, evaluating both communication clarity and engineering problem-solving.',
    accent: 'American',
    recommendedLevel: 'B2',
    starterMessage: "Hi there! Thanks for joining today's call. To kick things off, could you walk me through your background and what made you interested in joining our team?",
    starterTranslationPt: "Olá! Obrigado por entrar na chamada hoje. Para começar, você poderia me contar um pouco sobre sua trajetória e o que te fez se interessar pela nossa equipe?",
    iconName: 'Briefcase',
    missionGoals: [
      'Apresentar sua experiência profissional de forma concisa',
      'Explicar um desafio técnico que você superou',
      'Fazer uma pergunta inteligente sobre a cultura da empresa'
    ]
  },
  {
    id: 'apartment-rental',
    title: 'Aluguel de Apartamento & Negociação',
    titleEn: 'Apartment Lease & Tenant Negotiation',
    description: 'Discuta cláusulas contratuais de aluguel em Toronto: depósito de segurança (caução), regras sobre animais de estimação, taxas de utilidades e data de mudança.',
    category: 'travel',
    partnerRole: 'Arthur, a property manager renting out a 1-bedroom flat in Toronto',
    userRole: 'A prospective tenant viewing the apartment and negotiating lease terms',
    context: 'Standing inside an empty modern apartment with hardwood floors and city views.',
    accent: 'American',
    recommendedLevel: 'B2',
    starterMessage: "So this is the living area—great natural sunlight in the afternoon. What do you think, and do you have any questions regarding the lease agreement?",
    starterTranslationPt: "Esta é a sala — ótima luz natural à tarde. O que achou, e você tem alguma dúvida sobre o contrato de locação?",
    iconName: 'Building',
    missionGoals: [
      'Perguntar quais utilidades (água, aquecimento, internet) estão inclusas no aluguel',
      'Negociar a data de início da locação ou valor do depósito caução',
      'Confirmar as regras de visitantes e animais de estimação'
    ]
  },

  // --- NÍVEL C1 (Avançado) ---
  {
    id: 'tech-architecture',
    title: 'Discussão de Arquitetura de Software',
    titleEn: 'Software Design & Tech Discussion',
    description: 'Debata trade-offs entre microsserviços, cache distribuído, escalabilidade e prazos com um Principal Engineer.',
    category: 'work',
    partnerRole: 'Marcus, a Staff Software Architect in San Francisco',
    userRole: 'A Tech Lead proposing an architectural upgrade for high traffic',
    context: 'A virtual whiteboard sync discussing high-throughput latency issues and database bottleneck solutions.',
    accent: 'American',
    recommendedLevel: 'C1',
    starterMessage: "Hey! Glad we could sync up. Our read-heavy workload is putting heavy pressure on the primary database during peak hours. How do you propose we decouple and scale this?",
    starterTranslationPt: "Ei! Que bom que conseguimos sincronizar. Nossa carga pesada de leitura está colocando muita pressão no banco principal nos horários de pico. Como você propõe desacoplar e escalar isso?",
    iconName: 'Cpu',
    missionGoals: [
      'Propor uma estratégia de cache distribuído (ex: Redis) ou réplicas',
      'Discutir trade-offs de consistência eventual vs latência',
      'Concluir com um plano de entrega em fases'
    ]
  },
  {
    id: 'cinema-philosophy-debate',
    title: 'Debate Crítico sobre Cinema & Cultura',
    titleEn: 'Film Aesthetics & Cultural Critique',
    description: 'Participe de uma discussão aprofundada sobre cinematografia, metáforas narrativas, impacto da inteligência artificial nas artes e ética contemporânea.',
    category: 'social',
    partnerRole: 'Elena, a cultural essayist and cinema podcast co-host in Melbourne',
    userRole: 'A film enthusiast and critic discussing the psychological themes of recent sci-fi cinema',
    context: 'A recording studio conversation with vintage posters on the wall and high-end microphones.',
    accent: 'Australian',
    recommendedLevel: 'C1',
    starterMessage: "I’ve been pondering how modern sci-fi seems increasingly obsessed with memory and surrogate realities rather than outer space. What's your take on why cinema has taken this introspective turn?",
    starterTranslationPt: "Estive refletindo sobre como a ficção científica moderna parece cada vez mais obcecada por memória e realidades substitutas em vez do espaço sideral. Qual é a sua visão sobre o motivo de o cinema ter tomado esse rumo introspectivo?",
    iconName: 'Sparkles',
    missionGoals: [
      'Articular uma tese pessoal utilizando vocabulário conceitual rico',
      'Empregar conectivos avançados (ex: "Consequently", "On the premise that", "To nuance this further")',
      'Debater respeitosamente uma contraposição crítica'
    ]
  },

  // --- NÍVEL C2 (Fluente / Maestria Plena) ---
  {
    id: 'executive-boardroom-pitch',
    title: 'Reunião Executiva & Rodada de Investimento',
    titleEn: 'Venture Capital Boardroom Pitch & Due Diligence',
    description: 'Defenda sua tese de investimento perante sócios de um fundo de Venture Capital: responda a questionamentos duros sobre churn rate, CAC, unit economics e cláusulas de liquidação preferencial.',
    category: 'work',
    partnerRole: 'Victoria Sterling, a shrewd Managing Partner at a London-based venture capital firm',
    userRole: 'A startup founder seeking a Series-B funding round under intense scrutiny',
    context: 'A minimalist high-rise boardroom in Mayfair, London. Financial projections and cap tables are projected on the screen.',
    accent: 'British',
    recommendedLevel: 'C2',
    starterMessage: "Your top-line revenue growth is undeniable, but your customer acquisition cost rose 35% quarter-over-quarter without a corresponding expansion in net retention. Convince me this model doesn't deteriorate at scale.",
    starterTranslationPt: "O crescimento da sua receita bruta é inegável, mas o seu custo de aquisição de clientes subiu 35% no trimestre sem uma expansão correspondente na retenção líquida. Convença-me de que este modelo não se deteriora em escala.",
    iconName: 'Briefcase',
    missionGoals: [
      'Justificar métricas complexas de SaaS com retórica persuasiva e precisa',
      'Desarmar objeções céticas com diplomacia e dados circunstanciados',
      'Negociar termos estratégicos de governança sem concessões desnecessárias'
    ]
  },
  {
    id: 'crisis-pr-press-conference',
    title: 'Gestão de Crise & Coletiva de Imprensa',
    titleEn: 'Corporate Crisis Management & Press Conference',
    description: 'Atue como porta-voz oficial durante uma crise de relações públicas global: responda a jornalistas investigativos afiados com precisão cirúrgica, sem gerar passivos jurídicos.',
    category: 'work',
    partnerRole: 'Jonathan Reed, a seasoned investigative journalist from a major financial newspaper',
    userRole: 'The Chief Communications Officer holding an emergency televised press conference',
    context: 'A crowded auditorium with flashing cameras and journalists demanding immediate accountability after a major cloud security incident.',
    accent: 'American',
    recommendedLevel: 'C2',
    starterMessage: "Mr. Spokesperson, internal memos leaked twenty minutes ago suggest your executive team was alerted to this data vulnerability over six months ago. Was this negligence, or an intentional cover-up?",
    starterTranslationPt: "Senhor Porta-voz, memorandos internos vazados há vinte minutos sugerem que sua equipe executiva foi alertada sobre esta vulnerabilidade de dados há mais de seis meses. Isso foi negligência ou uma ocultação intencional?",
    iconName: 'Cpu',
    missionGoals: [
      'Manejar perguntas agressivas com compostura, eufemismos diplomáticos e prudência jurídica',
      'Reafirmar o compromisso de transparência sem especular sobre investigações em andamento',
      'Conduzir o foco da narrativa para as ações corretivas imediatas e de longo prazo'
    ]
  }
];
