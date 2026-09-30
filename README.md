# Active Vida Leve — Baseline V18

## Estrutura atual
- `index.html`: página inicial pública.
- `cadastro.html`: onboarding em 5 etapas + resumo do perfil.
- `login.html`: entrada por e-mail/senha ou Google + recuperação de senha.
- `pagamento.html`: checkout demonstrativo para liberar acesso de desenvolvimento.
- `portal.html`: base autenticada do portal interno.
- `assets/css/global.css`: variáveis e componentes globais.
- `assets/css/index.css`: estilos do index.
- `assets/css/cadastro.css`: estilos do cadastro.
- `assets/css/login.css`: estilos da página de login.
- `assets/css/pagamento.css`: estilos do pagamento demonstrativo.
- `assets/css/portal.css`: estilos da base do portal.
- `js/firebase.js`: inicialização do Firebase Web SDK.
- `js/cadastro.js`: onboarding, Authentication e gravação no Firestore.
- `js/login.js`: login, Google, persistência de sessão e recuperação de senha.
- `js/pagamento.js`: simulação de estados de pagamento.
- `js/portal.js`: validação de acesso e carregamento do perfil.

## Firebase
### Authentication
- E-mail/senha habilitado.
- Google habilitado.
- Login redireciona automaticamente:
  - para `portal.html` quando há acesso real ou acesso de teste aprovado;
  - para `pagamento.html` quando a conta existe mas ainda não tem acesso;
  - para `cadastro.html` quando não há documento em `usuarios/{uid}`.
- Recuperação de senha por e-mail disponível.

### Firestore
#### `usuarios/{uid}`
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

#### `perfis/{uid}`
- dados do onboarding;
- campos temporários de pagamento/acesso de teste enquanto não há provedor real.

## Pagamento em desenvolvimento
`pagamento.html` é somente uma simulação para permitir a construção do portal antes da escolha do provedor de pagamento e do domínio final.

O navegador grava apenas campos de teste dentro de `perfis/{uid}`:
- `pagamento_teste_status`
- `pagamento_teste_metodo`
- `pagamento_teste_valor`
- `pagamento_teste_moeda`
- `acesso_teste`
- `ambiente_pagamento`

Os campos reais permanecem protegidos:
- `status_pagamento`
- `status_acesso`

Quando houver provedor real, confirmação, liberação de acesso e comissões deverão ser processadas pelo backend/webhook.

## Estrutura prevista
- `pagamentos`
- `assinaturas`
- `indicacoes`
- `comissoes`
- `conteudos`

## Próxima fase
Construção das áreas internas do portal:
1. dashboard personalizada;
2. Alimentação;
3. Exercícios;
4. Sucos & Receitas;
5. Minha Rotina;
6. sistema de indicação/perfil do usuário.

## Portal interno — versão atual

A versão atual inclui dashboard personalizado e as páginas `alimentacao.html`, `exercicios.html`, `receitas.html` e `rotina.html`. Todas validam autenticação e acesso antes de exibir conteúdo.

## Área de Alimentação — versão atual

A área `alimentacao.html` foi evoluída para uma primeira versão funcional com:
- personalização a partir de `perfil_alimentar`, `tempo_preparo` e `interesses_alimentares` do Firestore;
- filtros por categoria;
- ordenação dos cards de acordo com os interesses do cadastro;
- resumo das preferências e restrições informadas;
- conteúdos educativos gerais, sem metas automáticas de peso, contagem de calorias ou dietas restritivas;
- validação de autenticação e acesso antes de exibir a página.
## Área de exercícios — versão atual

A área `exercicios.html` agora usa `js/exercicios.js` e `assets/css/exercicios.css` para:
- personalizar conteúdos por nível, duração, local e equipamentos do perfil;
- ordenar cards compatíveis com o cadastro;
- filtrar mobilidade, força geral, cardio leve, alongamento e pausas ativas;
- mostrar um resumo do perfil de movimento salvo no Firestore;
- manter orientações educativas, sem metas de aparência, calorias ou incentivo a excesso de treino.

## Sucos & Receitas — versão atual

A área `receitas.html` agora inclui filtros por momento do dia, priorização por perfil alimentar, tempo disponível e interesses do onboarding, além de receitas editoriais expansíveis e avisos para restrições/alergias.
