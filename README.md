# Active Vida Leve — Topo + Carrossel V02

Nesta etapa foi reconstruída somente a parte superior da página.

## Alterações
- remoção da animação antiga do topo
- logo horizontal correta da Active Vida Leve
- atalhos: Início, Como funciona, Conteúdos e Benefícios
- botões Entrar e Cadastro
- menu hambúrguer em tablets/celulares
- carrossel com 3 destaques:
  - Alimentação
  - Exercícios
  - Sucos & Receitas
- autoplay a cada 6 segundos
- setas e indicadores
- swipe por toque em celulares e tablets
- pausa ao passar o mouse ou usar teclado
- respeito a `prefers-reduced-motion`
- imagens SVG locais e leves, sem dependência externa

## Arquivos principais
- `index.html`
- `assets/css/global.css`
- `assets/css/index.css`
- `assets/images/logo/active-vida-leve-horizontal.png`
- `assets/images/carousel/alimentacao.svg`
- `assets/images/carousel/exercicios.svg`
- `assets/images/carousel/sucos-receitas.svg`
- `js/index.js`
- `modules/mobile-menu.js`
- `modules/carousel.js`


## V03 — Topbar mobile

- Logo mantida com proporção visual próxima da versão aprovada.
- Em celulares e tablets, os atalhos de navegação ficam ocultos.
- Os botões `Entrar` e `Cadastro` permanecem sempre visíveis ao lado da logo.
- O menu hambúrguer foi removido da visualização mobile.
- Ajustes de largura e tipografia para telas pequenas, incluindo aparelhos com até 380px.


## V04 — Topbar fixa + botões neon

- Topbar fixada no topo durante a rolagem com `position: sticky`.
- Fundo translúcido com blur para manter legibilidade sobre o conteúdo.
- Botão `Entrar` usando o verde vibrante da marca (`#22C55E`).
- Botão `Cadastro` usando o verde escuro da marca (`#0E6B3A`).
- Contorno pulsante em verde neon nos dois botões.
- Efeito reduzido automaticamente quando o dispositivo usa `prefers-reduced-motion`.
