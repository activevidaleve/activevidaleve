# Active Vida Leve — Baseline V15

## Estrutura atual
- `index.html`: página inicial aprovada do portal.
- `cadastro.html`: onboarding de cadastro em 5 etapas + resumo do perfil.
- `assets/css/global.css`: variáveis, reset e componentes globais.
- `assets/css/index.css`: estilos específicos do index e seus breakpoints.
- `assets/css/cadastro.css`: estilos exclusivos do cadastro, autenticação e responsividade.
- `js/index.js`: inicialização dos módulos utilizados no index.
- `js/cadastro.js`: navegação, validações, Google Sign-In, criação de conta e gravação do perfil.
- `js/firebase.js`: inicialização do Firebase Web SDK.
- `modules/carousel.js`: carrossel principal do index.
- `modules/feedback-carousel.js`: carrossel demonstrativo de feedbacks.
- `assets/images/`: imagens atualmente utilizadas pelas páginas.

## Cadastro conectado ao Firebase
O fluxo agora suporta:
- cadastro por e-mail e senha via Firebase Authentication;
- autenticação com Google via Firebase Authentication;
- gravação atômica no Cloud Firestore das coleções `usuarios` e `perfis`;
- `status_pagamento: pendente` e `status_acesso: inativo` no cadastro inicial;
- captura opcional de `?ref=CODIGO` como `referencia_informada`, ainda não validada para comissão;
- mensagens de erro em português para os casos principais;
- pagamento ainda não conectado.

## Estrutura Firestore atual
### `usuarios/{uid}`
- `nome`
- `sobrenome`
- `email`
- `data_nascimento`
- `provedor_cadastro`
- `status_pagamento`
- `status_acesso`
- `referencia_informada`
- `origem_cadastro`
- `criado_em`
- `atualizado_em`

### `perfis/{uid}`
- `altura`
- `peso`
- `nivel_atividade`
- `objetivos`
- `nivel_exercicio`
- `dias_exercicio`
- `duracao_treino`
- `local_exercicio`
- `equipamentos`
- `exercicios_evitar`
- `perfil_alimentar`
- `interesses_alimentares`
- `tempo_preparo`
- `alimentos_evitar`
- `restricoes_alimentares`
- `onboarding_concluido`
- `versao_onboarding`
- `atualizado_em`

## Arquitetura prevista para pagamento e indicações
Coleções reservadas para a próxima fase:
- `pagamentos`
- `assinaturas`
- `indicacoes`
- `comissoes`
- `conteudos`

Estados sensíveis como `status_pagamento`, `status_acesso` e futuros estados de comissão deverão ser controlados pelo backend/webhook, nunca pelo navegador do usuário.

## Próximos passos
1. Autorizar o domínio de produção no Firebase Authentication.
2. Testar cadastro por e-mail/senha e Google.
3. Conferir `usuarios` e `perfis` no Firestore.
4. Criar página de login.
5. Integrar checkout e webhook do meio de pagamento.
6. Implementar validação do sistema de indicações e comissões no backend.

## Fluxo de pagamento em desenvolvimento

Enquanto o meio de pagamento real não estiver definido, o projeto usa `pagamento.html` apenas para simulação. A página grava no documento `perfis/{uid}` campos separados de teste (`pagamento_teste_status`, `acesso_teste`, `pagamento_teste_metodo`, `pagamento_teste_valor` e `ambiente_pagamento`).

Os campos reais `status_pagamento` e `status_acesso` em `usuarios/{uid}` continuam protegidos e não são modificados pelo navegador. Quando o pagamento real for integrado, a liberação deverá ocorrer por backend/webhook.

`portal.html` aceita temporariamente `acesso_teste: true` com `pagamento_teste_status: "aprovado"` para permitir a construção das áreas internas. Também já aceita o futuro fluxo real quando `status_pagamento: "pago"` e `status_acesso: "ativo"` forem definidos pelo backend.
