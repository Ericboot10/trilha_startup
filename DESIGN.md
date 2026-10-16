# DESIGN.md

Landing page **Startup School** (trilha gamificada da playlist YC Startup School 2018).
Tom: tecnológico, minimalista, moderno. Dark por padrão, com tema claro.
Valores de referência: `assets/css/styles.css`.

## Princípios

1. **Uma família tipográfica.** Só Source Serif 4. A hierarquia vem de tamanho, peso, caixa-alta e tracking, nunca de outra fonte.
2. **Vermelho tem missão.** Significa "dá para clicar" ou "isto avançou / está ativo". Decoração e rótulos estáticos ficam neutros.
3. **Tudo vira métrica.** Números grandes e tabulares, rótulo pequeno em caixa-alta, estilo GitHub (streaks, calendário).
4. **O scroll é dinâmico.** Cada seção reage à rolagem; movimento sempre ligado ao progresso, nunca gratuito.
5. **Tokens, não hex.** Todo componente usa variáveis; nada de cor solta (exceção: `#fff` sobre `--red`).
6. **Sem dependências.** CSS e JS puro, tudo client-side.
7. **Português**, com termos de empreendedorismo em inglês quando soarem mais naturais.

## Cor

| Token | Dark | Light | Uso |
|---|---|---|---|
| `--bg` | `#090909` | `#F4F0E8` | Fundo |
| `--surface` | `#171717` | `#FFFFFF` | Cards e painéis |
| `--border` / `--border-2` | `#292929` / `#383838` | `#DED8CF` / `#CCC5BA` | Divisores / controles |
| `--text` | `#F5F5F5` | `#171717` | Texto principal |
| `--text-2` | `#999999` | `#77716B` | Texto secundário |
| `--text-3` | `#5f5f5f` | `#A69F96` | Legendas, bloqueado |
| `--red` | `#E5483D` | `#C83F35` | Clicável, progresso, ativo |
| `--red-2` | `#A92F29` | `#A3342C` | Hover / pressed |

### Regra do vermelho

- **Clicável:** botão primário, links, checkpoints disponíveis na ponte Golden Gate, controles, foco.
- **Progresso / ativo:** barras de avanço, rastro percorrido, item atual, conquistas, calendário de contribuições.
- **Aula acesa na trilha:** o avatar do professor ganha borda, brilho e pulso vermelhos quando a aula é alcançada. É o sinal de progresso mais visível da trilha.
- **Neutro:** eyebrows, bordas de citação, ênfase em títulos, rótulos informativos, estados futuros ou bloqueados e a anotação do hero ("TORRE SUL"), incluindo o ponto e a linha dela.

Teste: *isto convida a clicar ou mostra que algo avançou?* Se não, não é vermelho, salvo a cor original da ponte Golden Gate que se mantém na cor vermelha. 

## Tipografia

`--font: "Source Serif 4", Georgia, "Times New Roman", serif`. `--mono` e `--font-serif` são apenas alias dela.

| Papel | Tamanho | Peso | Tracking |
|---|---|---|---|
| Display | `clamp(42px, 6.6vw, 104px)` | 500 | -.055em |
| Título de seção | `clamp(36px, 4.8vw, 68px)` | 500 | -.045em |
| Hero | `clamp(28px, 3.4vw, 52px)` | 400 | -.01em |
| Título de card | 17–26px | 500 | -.015 a -.03em |
| Corpo | 16px | 400 | 0 |
| Apoio | 13–15px | 400 | 0 |
| Label (caixa-alta) | 9–11px | 400–500 | .08–.18em |

Números de métrica usam `tabular-nums`. Em mobile os títulos descem para 26–28px.

## Forma e movimento

- Espaçamento: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 72 px. Gutter `clamp(16px, 4vw, 48px)`, largura máxima 1240px.
- Raios pequenos: 2 / 4 / 6px. Bordas de 1px; divisores internos tracejados.
- Easing `cubic-bezier(.16, 1, .3, 1)`; durações .18s (cor), .4s (estado), .9s (revelação).
- Respeitar `prefers-reduced-motion`.

## Componentes-chave

- **Botão primário:** fundo `--red`, texto `#fff`, hover `--red-2`. O ghost é neutro: o vermelho fica para a ação principal.
- **Checkpoint:** disponível = vermelho com pulso; concluído = vermelho sólido; bloqueado = `--text-3`.
- **Badge:** desbloqueado = moldura vermelha sólida; bloqueado = tracejada `--text-3`.
- **Foco:** `outline: 2px solid var(--red); outline-offset: 3px`.
