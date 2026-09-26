# Active Vida Leve — Baseline V9

## Estrutura atual
- `index.html`: página inicial do portal.
- `assets/css/global.css`: variáveis, reset e componentes globais.
- `assets/css/index.css`: estilos específicos do index e seus breakpoints.
- `js/index.js`: inicialização dos módulos utilizados no index.
- `modules/carousel.js`: carrossel principal.
- `modules/feedback-carousel.js`: carrossel demonstrativo de feedbacks.
- `assets/images/`: somente imagens utilizadas pela página atual.

## Revisão técnica desta baseline
- removidos assets antigos e arquivos sem referência no HTML, CSS ou JavaScript;
- removido o módulo de menu mobile que não era carregado nem utilizado;
- removidas classes, variáveis e seletores sem uso;
- corrigida a estrutura semântica para manter o rodapé fora de `<main>`;
- normalizados espaçamentos, linhas em branco e formatação dos arquivos alterados;
- mantido o comportamento visual e responsivo aprovado do index;
- reforçadas pequenas validações defensivas nos carrosséis.

## Próximas páginas
Os links para `login.html` e `cadastro.html` são intencionais e permanecem preparados para a próxima etapa do projeto.
