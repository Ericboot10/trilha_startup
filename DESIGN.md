# DESIGN.md

Sistema visual da landing page **Startup School** (trilha gamificada da playlist YC Startup School 2018).
Tom: tecnológico, minimalista, moderno. Dark por padrão, com tema claro.

> **Status: proposta.** Os valores vêm de `assets/css/styles.css` (`:root` e `[data-theme="light"]`).
> Duas regras novas em relação ao código atual: **uma única família tipográfica** e **vermelho exclusivo para o que é clicável**.

---

## 1. Princípios

1. **Uma família, muitas hierarquias.** Só Source Serif 4. Hierarquia vem de tamanho, peso, caixa-alta e espaçamento de letras — nunca de outra fonte.
2. **Vermelho = clique.** Se é vermelho, o usuário pode interagir. Se não é interativo, não é vermelho.
3. **Métrica em primeiro lugar.** Números grandes, tabulares, com rótulo pequeno em caixa-alta.
4. **Movimento constante, nunca gratuito.** Animações respondem ao scroll e ao progresso; ease-out longo.
5. **Sem dependências.** CSS/JS puro, tudo client-side.

---

## 2. Cor

### 2.1 Neutros (tokens existentes)

| Token | Dark | Light | Uso |
|---|---|---|---|
| `--bg` | `#090909` | `#F4F0E8` | Fundo da página |
| `--bg-2` | `#111111` | `#EAE5DC` | Seções alternadas |
| `--surface` | `#171717` | `#FFFFFF` | Cards, painéis, diálogos |
| `--border` | `#292929` | `#DED8CF` | Divisores sutis |
| `--border-2` | `#383838` | `#CCC5BA` | Contornos de controles |
| `--text` | `#F5F5F5` | `#171717` | Texto principal |
| `--text-2` | `#999999` | `#77716B` | Texto secundário |
| `--text-3` | `#5f5f5f` | `#A69F96` | Legendas, estados desativados |
| `--grid` | `rgba(255,255,255,.035)` | `rgba(23,23,23,.05)` | Grade de fundo |

Auxiliares: `--scrim-rgb` (`9,9,9` / `244,240,232`), `--fog-rgb` (`30,32,38` / `240,235,226`), `--shadow`.

### 2.2 Vermelho — somente interativo

| Token | Dark | Light | Uso |
|---|---|---|---|
| `--red` | `#E5483D` | `#C83F35` | Estado base de elemento clicável |
| `--red-2` | `#A92F29` | `#A3342C` | Hover / pressed |
| `--red-rgb` | `229, 72, 61` | `200, 63, 53` | Halo de foco, sombra de hover |

**Pode ser vermelho:**
- As Pontes Golden Gate podem se manter com a mesma cor
- `.btn--primary` (fundo `--red`, texto `#fff`; hover `--red-2`)
- Links de texto e itens de navegação ativáveis
- Checkpoints disponíveis para clicar na ponte (`.cp--available`) e seus anéis de pulso
- Controles de tema, seletor (`.seg`), botões do trilho de evolução, itens clicáveis da trilha
- `:focus-visible` (outline 2px, offset 3px)
- `::selection`

**Não pode ser vermelho (migrar):**

| Hoje (vermelho) | Proposta |
|---|---|
| `.eyebrow::before`, marcador do `.passport__brand` | `--text-3` |
| `.hero__headline em`, `.hero__title em`, `.hero__meta i` | `--text` com peso 600 ou itálico |
| `.hero__quote` (borda lateral) | `--border-2` |
| `.tnode__stage`, `.panel__meta`, `.cp-tip .mono`, `.learn__ex .mono`, `.toast__kicker`, `.journey__pct`, `.evo__num` | `--text-2` |
| Barras e trilhos de progresso (`.bar i`, `.readout__bar i`, `.learn__rail i`, `.ticks`, `.scroll-progress`, `.avatar__progress`) | `--text` (progresso é dado, não ação) |
| Rastro/walker da trilha (`.trail__lit`, `.trail__walker`), nós acesos (`.tnode.is-lit`) | `--text` |
| Cena isométrica (`.iso .accent`, `.pulse`, `.beacon`, `.link`, `.cable`, `.win--lit`, `.burst`, `.scan__line`) | `--text` / `--text-2`; vermelho só se o objeto for clicável |
| `.ladder li.is-current`, `.badge.is-unlocked .b-frame`, `.toast` (borda/ícone), `.stage-label.is-current` | `--text` |
| Calendário de contribuições (`--cell-1…4`, escala vermelha) | Rampa neutra: ver 2.3 |
| `.profile__badge` (fundo vermelho, texto branco) | `--text` sobre `--surface`, ou `.tag` |

### 2.3 Rampa de atividade (heatmap, estilo GitHub)

Substitui `--cell-0…4` vermelhos por luminância:

| Token | Dark | Light |
|---|---|---|
| `--cell-0` | `#1b1b1b` | `#E7E1D6` |
| `--cell-1` | `#2e2e2e` | `#CFC8BC` |
| `--cell-2` | `#4f4f4f` | `#A69F96` |
| `--cell-3` | `#8a8a8a` | `#77716B` |
| `--cell-4` | `#F5F5F5` | `#171717` |

### 2.4 Cena isométrica

`--iso-top`, `--iso-l`, `--iso-r`, `--iso-line` permanecem (dark: `#2b2b2b / #1b1b1b / #121212 / #2e2e2e`; light: `#FFFFFF / #EAE4DA / #DCD5CA / #D3CCC1`).

---

## 3. Tipografia

**Família única:** "Source Serif 4"

```css
--font: "Source Serif 4";
--mono: var(--font);        /* alias mantido por compatibilidade; remover quando possível */
--font-serif: var(--font);  /* idem */
```

Nenhuma outra `font-family` deve aparecer no CSS (hoje `.hero__headline` repete a pilha por extenso — trocar por `var(--font)`).

### 3.1 Escala

| Papel | Tamanho | Peso | Tracking | Line-height |
|---|---|---|---|---|
| Display (finale `h2`) | `clamp(42px, 6.6vw, 104px)` | 500 | -.055em | .95 |
| H1 de seção (`.section-head h2`) | `clamp(36px, 4.8vw, 68px)` | 500 | -.045em | 1.0 |
| H2 evolução | `clamp(34px, 4.2vw, 60px)` | 500 | -.045em | 1.0 |
| Nome da evolução | `clamp(32px, 3.6vw, 52px)` | 500 | -.035em | 1.05 |
| Hero headline | `clamp(28px, 3.4vw, 52px)` | 400 | -.01em | 1.08 |
| H2 travessia | `clamp(30px, 3.7vw, 54px)` | 500 | -.04em | 1.02 |
| Nível (número grande) | 64px | 400 | -.04em | .9 |
| Contador da jornada | 48px | 500 | -.04em | — |
| Stat grande | 30px | 500 | -.03em | — |
| H3 de painel / dialog | 21–26px | 500 | -.02 a -.03em | 1.15–1.2 |
| H3 de card | 17px | 500 | -.015em | 1.25 |
| Lead | `clamp(16px, 1.3vw, 19px)` | 400 | 0 | 1.55 |
| Corpo | 16px | 400 | 0 | 1.5 |
| Texto de apoio | 13–15px | 400 | 0 | 1.45–1.5 |
| Botão | 14.5px (`lg` 15.5, `sm` 13.5) | 500 | -.005em | — |
| **Label / eyebrow** (antigo `.mono`) | 11px | 400–500 | .08–.18em, CAIXA-ALTA | 1.5 |
| Micro-label | 9–10px | 500 | .1–.14em, CAIXA-ALTA | 1.3 |

Regras:
- Números de métrica: `font-variant-numeric: tabular-nums`.
- Em mobile (`≤ 720px`) os títulos descem para 26–28px.
- Labels em caixa-alta sempre usam tracking ≥ .08em; caixa-baixa nunca usa tracking positivo.
- Itálico só para ênfase editorial (`.hero__title--serif`).

---

## 4. Espaçamento, layout e forma

| Token | Valor |
|---|---|
| `--s-1…8` | 4 · 8 · 12 · 16 · 24 · 32 · 48 · 72 px |
| `--gutter` | `clamp(16px, 4vw, 48px)` |
| `--maxw` | 1240px |
| `--nav-h` | 64px |
| `--r-1 / --r-2 / --r-3` | 2 · 4 · 6 px (tags/barras · botões/inputs · cards/toasts) |

Bordas de 1px; divisores internos tracejados (`1px dashed var(--border)`). Sem cantos grandes: o visual é técnico, não "bolha".

Sombra: `--shadow: 0 40px 80px -30px rgba(0,0,0,.7)` (dark) / `0 40px 80px -40px rgba(70,50,30,.3)` (light).

---

## 5. Componentes

### Botão
- Altura 44px (`lg` 52, `sm` 36), padding 0 20px, raio `--r-2`, peso 500.
- **Primário:** fundo `--red`, texto `#fff`. Hover → `--red-2` + sombra `0 10px 30px -10px rgba(var(--red-rgb), .55)`. Active → `translateY(1px)`.
- **Ghost:** borda `--border-2`, fundo `rgba(var(--scrim-rgb), .4)` com blur 10px. Hover → borda `--text-2`. **Mesmo sendo clicável, o ghost não é vermelho**: o vermelho fica reservado à ação principal e ao foco.
- Seta (`.arrow`) desloca 3px à direita no hover.

### Botão de ícone
36×36, borda `--border`, ícone 18px (traço 1.5, `currentColor`). Hover: `--text` + `--border-2`. Desativado: opacidade .35.

### Cards e painéis
Fundo `--surface`, borda `--border`, raio `--r-3`. Estado ativo/acesso: borda `--text`, nunca vermelha.

### Tags e chips
Borda `--border-2`, padding 4×8, raio `--r-1`, 10px caixa-alta, cor `--text-2`.

### Foco
`outline: 2px solid var(--red); outline-offset: 3px` em qualquer elemento focável.

### Checkpoint clicável (ponte Golden Gate)
Único elemento do jogo em vermelho: ponto 11px `--red` com halo `rgba(var(--red-rgb), .22)` e anel pulsante. Checkpoints bloqueados/concluídos usam neutros.

---

## 6. Movimento

| Token | Valor |
|---|---|
| `--ease-out` | `cubic-bezier(.16, 1, .3, 1)` |
| `--ease-io` | `cubic-bezier(.65, 0, .35, 1)` |
| `--dur-fast` | .18s (cor, borda) |
| `--dur` | .4s (painéis, estados) |
| `--dur-slow` | .9s (revelações de scroll) |

- Scroll dinâmico: cada seção reage ao scroll (parallax, progresso, revelação). Sempre ligado ao `scrollY`, nunca a timers soltos.
- Respeitar `prefers-reduced-motion`: desligar pulsos, parallax e loops.

---

## 7. Dados e gamificação

- Perfil analítico em estilo GitHub: calendário de contribuições (rampa 2.3), streaks, XP, nível, badges.
- Níveis: THE DREAMER → EXPLORER → THINKER → BUILDER → MAKER → VALIDATOR → FOUNDER.
- Estágios: 00 THE BEGINNING … 08 IPO & BEYOND.
- Badge desbloqueado: moldura sólida `--text`; bloqueado: tracejada `--text-3`.
- Linguagem: português; termos de empreendedorismo em inglês quando mais naturais (MVP, seed, streak, pitch).

---

## 8. Tema

Atributo `data-theme="light"` no `<html>`; dark é o padrão. Todo componente usa apenas tokens — nenhum hex solto fora de `:root` (exceção: `#fff` sobre `--red`).

---

## 9. Checklist de migração (quando aprovado)

1. Trocar `--mono` e `--font-serif` por alias de `--font`; remover `font-family` literal em `.hero__headline`.
2. Reatribuir os usos de `--red` listados em 2.2 (o `grep "var(--red" styles.css` deve restar só em botões, links, checkpoints clicáveis e foco).
3. Trocar a rampa `--cell-*` pela versão neutra.
4. Revisar `bridge.js` e `main.js` por cores vermelhas hardcoded no canvas/SVG (ex.: `229, 72, 61`).
5. Conferir contraste: `--red` sobre `--bg` e `#fff` sobre `--red` ≥ 4.5:1 (dark 4.6:1 aprox. — validar).
6. Tirar screenshot mobile para aprovação antes de qualquer push.
