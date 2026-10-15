/*
 * Conteúdo da jornada — separado da interface.
 *
 * Aulas: playlist pública "How to Start a Startup" (Stanford CS183B, 2014),
 * publicada pela Y Combinator. Títulos e palestrantes devem ser conferidos
 * com a playlist oficial antes de publicar. `videoUrl` fica vazio até que os
 * links oficiais sejam adicionados — nenhum conteúdo é baixado ou redistribuído.
 *
 * `focus` e `challenge` são textos da plataforma (não são resumos atribuídos
 * aos palestrantes).
 */
(function () {
  'use strict';
  var SS = (window.SS = window.SS || {});

  /* Sequência EDUCACIONAL — não implica captação, PMF ou IPO reais. */
  SS.STAGES = [
    { id: 0, code: '00', name: 'THE BEGINNING', desc: 'Mentalidade empreendedora.' },
    { id: 1, code: '01', name: 'IDEA', desc: 'Identificação de problemas relevantes.' },
    { id: 2, code: '02', name: 'VALIDATION', desc: 'Entrevistas e compreensão de usuários.' },
    { id: 3, code: '03', name: 'MVP', desc: 'Construção de um produto mínimo viável.' },
    { id: 4, code: '04', name: 'PRODUCT-MARKET FIT', desc: 'Descobrir se as pessoas realmente querem o produto.' },
    { id: 5, code: '05', name: 'PRE-SEED', desc: 'Primeiros recursos, equipe e fundamentos.' },
    { id: 6, code: '06', name: 'SEED', desc: 'Modelos de negócio e crescimento inicial.' },
    { id: 7, code: '07', name: 'SERIES A', desc: 'Escala, métricas e operação.' },
    { id: 8, code: '08', name: 'IPO & BEYOND', desc: 'Empresas duradouras e visão de longo prazo.' }
  ];

  /* Ordem da jornada (não a ordem da playlist). `playlist` = número original da aula. */
  SS.LESSONS = [
    { playlist: 1, stage: 0, title: 'How to Start a Startup', speakers: 'Sam Altman, Dustin Moskovitz',
      focus: 'O mapa geral: ideia, produto, equipe e execução.',
      challenge: { type: 'reflection', text: 'Liste três problemas que você vive no dia a dia e escolha um para investigar.' } },
    { playlist: 3, stage: 0, title: 'Before the Startup', speakers: 'Paul Graham',
      focus: 'O que considerar antes de decidir empreender.',
      challenge: { type: 'reflection', text: 'Escreva por que você quer empreender — e do que abriria mão para isso.' } },
    { playlist: 5, stage: 1, title: 'Competition is for Losers', speakers: 'Peter Thiel',
      focus: 'Por que procurar mercados onde você pode ser único.',
      challenge: { type: 'research', text: 'Mapeie as alternativas que já existem para o seu problema e onde você poderia ser diferente.' } },
    { playlist: 4, stage: 2, title: 'Building Product, Talking to Users, and Growing', speakers: 'Adora Cheung',
      focus: 'Construir, conversar com usuários e crescer em ciclos curtos.',
      challenge: { type: 'interview', text: 'Converse com três pessoas que têm o problema que você escolheu.' } },
    { playlist: 16, stage: 2, title: 'How to Run a User Interview', speakers: 'Emmett Shear',
      focus: 'Entrevistas que revelam problemas reais, não opiniões educadas.',
      challenge: { type: 'interview', text: 'Conduza e registre cinco entrevistas sem apresentar a sua solução.' } },
    { playlist: 8, stage: 3, title: "How to Get Started, Doing Things that Don't Scale, Press", speakers: 'Stanley Tang, Walker Williams, Justin Kan',
      focus: 'Começar pequeno e conquistar os primeiros usuários na mão.',
      challenge: { type: 'build', text: 'Conquiste seus cinco primeiros usuários manualmente, um por um.' } },
    { playlist: 17, stage: 3, title: 'How to Design Hardware Products', speakers: 'Hosain Rahman',
      focus: 'Os desafios específicos de construir produtos físicos.',
      challenge: { type: 'build', text: 'Desenhe o protótipo mais simples possível da sua ideia — papel vale.' } },
    { playlist: 7, stage: 3, title: 'How to Build Products Users Love', speakers: 'Kevin Hale',
      focus: 'O que faz usuários amarem um produto — e voltarem.',
      challenge: { type: 'build', text: 'Identifique o momento em que o usuário percebe valor e encurte o caminho até ele.' } },
    { playlist: 6, stage: 4, title: 'Growth', speakers: 'Alex Schultz',
      focus: 'Medir o que importa antes de tentar crescer.',
      challenge: { type: 'metric', text: 'Defina a métrica de retenção mais importante do seu produto.' } },
    { playlist: 2, stage: 5, title: 'Team and Execution', speakers: 'Sam Altman',
      focus: 'Cofundadores, primeiras contratações e ritmo de execução.',
      challenge: { type: 'reflection', text: 'Descreva o cofundador ou primeiro integrante ideal do seu time.' } },
    { playlist: 18, stage: 5, title: 'Legal and Accounting Basics for Startups', speakers: 'Kirsty Nathoo, Carolynn Levy',
      focus: 'Fundamentos legais e contábeis para não tropeçar no início.',
      challenge: { type: 'research', text: 'Liste as decisões legais e contábeis que você precisa tomar antes de começar.' } },
    { playlist: 9, stage: 6, title: 'How to Raise Money', speakers: 'Marc Andreessen, Ron Conway, Parker Conrad',
      focus: 'Como funciona uma captação — e quando ela faz sentido.',
      challenge: { type: 'reflection', text: 'Responda: sua ideia precisa de investimento externo? Por quê?' } },
    { playlist: 19, stage: 6, title: 'Sales and Marketing; How to Talk to Investors', speakers: 'Tyler Bosmeny; YC Partners',
      focus: 'Vender, posicionar e apresentar sua empresa com clareza.',
      challenge: { type: 'pitch', text: 'Escreva o pitch da sua ideia em até três frases.' } },
    { playlist: 12, stage: 6, title: 'Building for the Enterprise', speakers: 'Aaron Levie',
      focus: 'Construir para empresas: quem usa, quem decide, quem paga.',
      challenge: { type: 'research', text: 'Identifique quem decide, quem usa e quem paga em um cliente B2B.' } },
    { playlist: 10, stage: 7, title: 'Culture', speakers: 'Brian Chesky, Alfred Lin',
      focus: 'Cultura como fundação de uma empresa que cresce.',
      challenge: { type: 'reflection', text: 'Escreva três valores dos quais você não abriria mão.' } },
    { playlist: 11, stage: 7, title: 'Hiring and Culture, Part 2', speakers: 'Patrick & John Collison, Ben Silbermann',
      focus: 'Contratar bem sem perder a cultura.',
      challenge: { type: 'build', text: 'Crie o roteiro de entrevista para a sua primeira contratação.' } },
    { playlist: 14, stage: 7, title: 'How to Operate', speakers: 'Keith Rabois',
      focus: 'Operar com métricas, ritmo e boas decisões.',
      challenge: { type: 'metric', text: 'Monte um painel com as três métricas que guiariam a sua semana.' } },
    { playlist: 15, stage: 7, title: 'How to Manage', speakers: 'Ben Horowitz, Emmett Shear',
      focus: 'Gestão de pessoas quando a empresa deixa de ser pequena.',
      challenge: { type: 'reflection', text: 'Planeje a primeira reunião 1:1 com alguém do seu time.' } },
    { playlist: 13, stage: 8, title: 'How to be a Great Founder', speakers: 'Reid Hoffman',
      focus: 'Escolhas de founders que constroem por décadas.',
      challenge: { type: 'reflection', text: 'Escreva onde você quer que sua empresa esteja em dez anos.' } },
    { playlist: 20, stage: 8, title: 'Later-stage Advice', speakers: 'Sam Altman',
      focus: 'Quando a empresa já existe e precisa durar.',
      challenge: { type: 'build', text: 'Revise sua jornada e defina o próximo projeto que você vai construir.' } }
  ].map(function (l, i) {
    l.index = i;
    l.id = 'm' + (i < 9 ? '0' : '') + (i + 1);
    l.videoUrl = null;
    return l;
  });

  SS.LEVELS = [
    { level: 1, name: 'THE DREAMER', xp: 0 },
    { level: 2, name: 'THE EXPLORER', xp: 150 },
    { level: 3, name: 'THE THINKER', xp: 400 },
    { level: 4, name: 'THE BUILDER', xp: 800 },
    { level: 5, name: 'THE MAKER', xp: 1400 },
    { level: 6, name: 'THE VALIDATOR', xp: 2100 },
    { level: 7, name: 'THE FOUNDER', xp: 3000 }
  ];

  /* XP só por atividades com aprendizagem real — nunca por cliques ou visitas. */
  SS.XP_RULES = { lesson: 100, challenge: 60, project: 200 };

  SS.ACHIEVEMENTS = [
    { id: 'first-commit', name: 'FIRST COMMIT', desc: 'Conclua sua primeira aula.', quote: 'Todo grande projeto começa com uma primeira entrega.', icon: 'commit',
      test: function (s) { return s.lessons >= 1; } },
    { id: 'talk-to-users', name: 'TALK TO USERS', desc: 'Conclua um desafio de entrevistas.', quote: 'As respostas estão fora do prédio.', icon: 'users',
      test: function (s) { return s.interviewChallenges >= 1; } },
    { id: 'ship-it', name: 'SHIP IT', desc: 'Publique seu primeiro MVP.', quote: 'Feito é melhor que perfeito.', icon: 'ship',
      test: function (s) { return s.projects >= 1; } },
    { id: 'the-builder', name: 'THE BUILDER', desc: 'Conclua oito desafios práticos.', quote: 'Construir é o melhor jeito de aprender.', icon: 'cube',
      test: function (s) { return s.challenges >= 8; } },
    { id: 'consistency', name: 'CONSISTENCY', desc: 'Mantenha uma sequência de sete dias ativos.', quote: 'Sete dias seguidos construindo algo real.', icon: 'streak',
      test: function (s) { return s.longestStreak >= 7; } },
    { id: 'network-effect', name: 'NETWORK EFFECT', desc: 'Cruze a ponte até o fim da travessia.', quote: 'Você cruzou a ponte. Agora a rede cresce com você.', icon: 'network',
      test: function (s) { return s.crossed; } },
    { id: 'zero-to-one', name: 'ZERO TO ONE', desc: 'Conclua toda a jornada educacional.', quote: 'Do zero ao primeiro passo de verdade.', icon: 'one',
      test: function (s) { return s.lessons >= 20; } }
  ];
})();
