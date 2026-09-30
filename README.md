# Active Vida Leve — Baseline V13

## Estrutura atual
- `index.html`: página inicial aprovada do portal.
- `cadastro.html`: onboarding de cadastro em 5 etapas + resumo do perfil.
- `assets/css/global.css`: variáveis, reset e componentes globais.
- `assets/css/index.css`: estilos específicos do index e seus breakpoints.
- `assets/css/cadastro.css`: estilos exclusivos do cadastro e responsividade.
- `js/index.js`: inicialização dos módulos utilizados no index.
- `js/cadastro.js`: navegação entre etapas, validações e resumo local do cadastro.
- `modules/carousel.js`: carrossel principal do index.
- `modules/feedback-carousel.js`: carrossel demonstrativo de feedbacks.
- `assets/images/`: imagens atualmente utilizadas pelas páginas.

## Cadastro V1
O fluxo do cadastro está preparado visualmente, mas ainda não envia dados para Firebase nem inicia pagamento.

Etapas:
1. Conta: nome, sobrenome, e-mail, senha e data de nascimento.
2. Perfil: altura, peso opcional e nível de atividade.
3. Objetivos: até 3 objetivos selecionáveis.
4. Exercícios e rotina: experiência, frequência, duração, local e equipamentos.
5. Alimentação: perfil alimentar, interesses, tempo de preparo e restrições opcionais.
6. Resumo local para revisão antes da futura assinatura.

## Padrão previsto para Firebase
As coleções e campos deverão permanecer em português, sem acentos nas chaves técnicas e preferencialmente em `snake_case`.

Exemplos de coleções:
- `usuarios`
- `perfis`
- `conteudos`
- `pagamentos`
- `assinaturas`

Exemplos de campos:
- `data_nascimento`
- `nivel_atividade`
- `nivel_exercicio`
- `dias_exercicio`
- `duracao_treino`
- `local_exercicio`
- `equipamentos`
- `objetivos`
- `preferencias_alimentares`
- `restricoes_alimentares`
- `status_pagamento`
- `status_acesso`

## Próximas integrações
- Firebase Authentication para criação e login da conta.
- Firestore para `usuarios` e `perfis`.
- Página/fluxo de pagamento.
- Webhook/backend para liberar acesso após confirmação real do pagamento.
- Portal interno usando os dados do perfil para ordenar conteúdos.
