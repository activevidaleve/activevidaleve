# Active Vida Leve — Baseline V38

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

## Minha Rotina — versão atual

`rotina.html` agora permite visualizar e editar o perfil salvo em `perfis/{uid}` no Firestore. A página mantém autenticação e validação de acesso, limita a seleção a até 3 objetivos e atualiza os campos de movimento e alimentação sem permitir alteração dos estados de pagamento/acesso.

## Conteúdos dinâmicos — versão atual

As áreas `alimentacao.html`, `exercicios.html` e `receitas.html` carregam documentos publicados da coleção `conteudos` do Firestore. Enquanto não houver documentos publicados para determinado tipo, o projeto usa `dados/conteudos-exemplo.json` como fallback de desenvolvimento.

### Esquema de conteúdo v3
Campos comuns:
- `tipo`: `alimentacao`, `exercicio` ou `receita`;
- `categoria` e, quando necessário, `categorias`;
- `titulo`, `resumo`, `texto_apoio`, `icone`;
- `ordem`, `destaque`, `publicado`, `tags`;
- `publico`: regras de relevância para personalização.

Exemplo do bloco `publico`:
```json
{
  "objetivos": ["movimentar_mais"],
  "interesses": ["receitas_rapidas"],
  "niveis": ["iniciante"],
  "duracoes": ["ate_15"],
  "locais": ["casa"],
  "equipamentos": ["nenhum"],
  "perfis_alimentares": ["variada", "vegetariana"],
  "tempo_preparo": ["ate_15"]
}
```

O módulo `js/conteudos.js` normaliza o esquema v3 e ainda entende campos antigos para permitir migração gradual do Firestore.

## Motor de personalização — versão atual

O módulo `js/personalizacao.js` centraliza a lógica que antes estava espalhada pelas páginas. Ele compara cada conteúdo com o perfil do usuário e ordena por relevância sem expor pontuações na interface.

Critérios usados quando existem dados suficientes:
- objetivos do usuário;
- interesses alimentares;
- nível de experiência;
- duração disponível;
- local de exercício;
- equipamentos disponíveis;
- preferência alimentar;
- tempo disponível para preparo;
- nível de atividade, quando o conteúdo informar esse público;
- destaque editorial como desempate leve.

O motor também normaliza aliases legados do projeto, como `varia`/`variado`, `equipamentos_academia`/`academia`, `condicionamento`/`melhorar_condicionamento` e `variedade_refeicoes`/`variar_refeicoes`.

Conteúdos claramente incompatíveis com preferência alimentar estruturada ou com uma restrição estruturada detectável não recebem recomendação e são enviados para o fim da ordenação. Eles não são automaticamente apagados do catálogo. Restrições escritas em texto livre continuam exigindo conferência do usuário; o sistema não substitui orientação profissional nem leitura de ingredientes/rótulos.

O `portal.html` também usa o mesmo motor para escolher a sugestão de movimento e de alimentação/receita exibidas em “Para você hoje”.

## Catálogo local

`dados/conteudos-exemplo.json` está no esquema v3 e contém 60 conteúdos detalhados de desenvolvimento: 20 de Alimentação, 20 de Exercícios e 20 de Receitas. O arquivo cobre os principais objetivos, interesses, níveis, durações, locais, equipamentos, perfis alimentares e tempos de preparo usados no cadastro. Ele serve para testar a personalização antes de migrarmos a biblioteca definitiva para o Firestore.

## Segurança atual de conteúdos

Usuários autenticados podem ler apenas documentos de `conteudos` com `publicado == true`. Escrita pelo navegador continua desabilitada nas regras de referência. O painel administrativo foi retirado desta baseline porque a prioridade atual é terminar o produto e a biblioteca antes de construir a administração.

## Conteúdo individual e navegação — versão atual

- `conteudo.html?id=<id>` renderiza páginas individuais de alimentação, exercícios e receitas.
- `js/conteudo.js` valida autenticação/acesso, carrega conteúdo do Firestore ou fallback local e personaliza a explicação/relacionados.
- Cards das três áreas e recomendações do portal apontam para a página individual.
- O catálogo local passou a aceitar `introducao`, `secoes`, `sequencia` e `observacoes`, além dos campos já existentes.
- Conteúdos relacionados usam o mesmo motor central de personalização.

## Biblioteca ampliada — versão atual

A biblioteca local foi ampliada para 60 conteúdos completos e equilibrados entre as três áreas do portal. Os novos itens incluem organização de refeições e compras, preparo antecipado, marmitas modulares, variedade alimentar, mobilidade, força com diferentes equipamentos, caminhada, bicicleta, dança leve, pausas ativas e receitas para diferentes momentos do dia.

Todos os itens mantêm o bloco `publico` para o motor de personalização e páginas individuais com introdução, seções, observações e, quando aplicável, sequência de exercícios ou ingredientes/preparo. O conteúdo evita metas automáticas de peso, contagem de calorias, dietas restritivas e incentivo a excesso de exercício.
## Busca, favoritos e histórico

- `buscar.html` pesquisa os conteúdos publicados e permite filtrar por tipo e favoritos.
- Favoritos ficam em `usuarios/{uid}/favoritos/{conteudoId}`.
- Histórico fica em `usuarios/{uid}/historico/{conteudoId}` e é atualizado quando uma página de conteúdo é aberta.
- `portal.html` mostra atalhos para favoritos e conteúdos vistos recentemente.
- É necessário publicar o arquivo `firestore.rules` desta versão para habilitar leitura/gravação dessas subcoleções pelo próprio usuário.


## Home personalizada — active_v30

A home do portal passou a usar o motor central de personalização também nas prateleiras de conteúdo. Agora ela inclui:
- seleção equilibrada de Alimentação, Exercícios e Receitas com maior afinidade ao perfil;
- seção "Continue explorando" alimentada pelo histórico do usuário;
- prateleira de exercícios priorizada por nível, tempo, local, equipamentos e objetivos;
- prateleira de receitas priorizada por perfil alimentar, interesses e tempo de preparo;
- prateleira de alimentação priorizada por objetivos e interesses;
- favoritos e histórico mantidos na mesma home;
- atalho de favoritos em `buscar.html?favoritos=1`.

A personalização apenas organiza a biblioteca e não substitui orientação profissional nem cria metas automáticas de peso ou restrição alimentar.

## Experiência de consumo — active_v31

A biblioteca pessoal agora inclui progresso e conclusão por conteúdo:
- `usuarios/{uid}/progresso/{conteudoId}` guarda `progresso`, `status`, `iniciado_em`, `atualizado_em` e `concluido_em`;
- `conteudo.html` acompanha a leitura em marcos discretos e permite marcar/desmarcar um conteúdo como concluído;
- o portal usa o progresso para montar "Continue explorando" e reduz a prioridade de conteúdos já concluídos nas novas recomendações;
- favoritos aparecem como controles visuais nos cards do portal, Alimentação, Exercícios, Receitas e Busca;
- `buscar.html?concluidos=1` abre diretamente os conteúdos concluídos;
- a home exibe também uma área de conteúdos finalizados;
- cards e páginas aceitam `imagem_url` e `imagem_alt` no esquema de conteúdo; quando não há imagem, continuam usando capas visuais leves por tipo/categoria.

É necessário publicar o `firestore.rules` desta versão para liberar a subcoleção `progresso`. Favoritos e histórico continuam em suas subcoleções existentes.

## Conteúdo enriquecido — active_v32

A experiência de leitura e consumo foi aprofundada sem alterar as regras de acesso do Firestore:
- todos os 60 conteúdos passam a ter `experiencia.tempo`, `experiencia.dificuldade` e `experiencia.formato`;
- receitas recebem `rendimento` e `ingredientes_lista` estruturados em item, quantidade e observação;
- exercícios recebem `etapas` estruturadas com título, descrição e duração aproximada, mantendo pausas e orientação para interromper em caso de desconforto;
- cards de Portal, Busca, Alimentação, Exercícios e Receitas exibem tempo/dificuldade e contexto rápido;
- `conteudo.html` mostra um resumo de tempo/nível/formato, ingredientes em grade e etapas visuais de exercícios;
- o bloco `midia` prepara cada conteúdo para imagens reais com `imagem_url`, `imagem_alt`, `foco`, `proporcao_card` e `proporcao_detalhe`;
- `js/conteudos.js` continua compatível com `imagem_url`/`imagem_alt` antigos e com os campos legados do catálogo.

Não houve mudança nas regras do Firestore nesta versão.


## active_v33 — rodada editorial e Sucos Detox

- revisão editorial dos 60 conteúdos já existentes, reduzindo textos genéricos e corrigindo coerência de duração nos exercícios;
- nova área `sucos.html` com 20 receitas de Sucos Detox;
- o termo “detox” é tratado como nome popular da seção, sem alegações de eliminação de toxinas;
- cada suco reserva mídia separada para ingredientes e produto pronto (`imagem_ingredientes_url` e `imagem_pronto_url`);
- atalho Sucos Detox adicionado à navegação e nova prateleira na home do portal;
- total da biblioteca local: 80 conteúdos.

## active_v34 — Motor de Experiência Personalizada

A personalização deixou de ser apenas uma ordenação por perfil e ganhou uma camada de experiência individual em `js/experiencia.js`.

A nova camada usa, quando disponíveis:
- dados do cadastro e perfil;
- favoritos;
- histórico de conteúdos abertos;
- progresso e conteúdos concluídos;
- termos pesquisados no portal;
- novidade do conteúdo e diversidade entre categorias.

O portal classifica o momento de uso em quatro estágios internos (`primeiros_passos`, `descobrindo`, `em_ritmo` e `recorrente`). Esses estágios não criam metas de saúde; servem apenas para decidir como organizar a navegação e os textos da interface.

A home agora pode mudar por usuário em:
- texto de abertura e identificação do momento da experiência;
- ordem das seções;
- conteúdos mostrados em “Para você hoje”;
- prateleiras que aparecem primeiro;
- motivos exibidos nos cards;
- equilíbrio entre continuidade, afinidade e descoberta;
- redução de repetições do mesmo conteúdo entre seções.

Conteúdos em andamento são priorizados em “Continue explorando”. Conteúdos concluídos deixam de ocupar as principais posições de descoberta para abrir espaço para opções novas. O algoritmo usa um desempate estável por usuário, evitando que perfis iguais recebam necessariamente a mesma sequência de cards sem reorganizar a home apenas porque virou o dia. A renovação temporal fica concentrada no roteiro semanal.

As páginas de Alimentação, Exercícios, Receitas, Sucos Detox e Busca usam a mesma camada comportamental para ordenar seus próprios conteúdos. A página individual também adapta a introdução ao perfil e ao estado de progresso daquele usuário.

### Sinais de busca

A subcoleção `usuarios/{uid}/buscas/{buscaId}` registra apenas o termo pesquisado, contagem e data da última ocorrência. Esses dados são usados para melhorar a ordem dos conteúdos para a própria conta. O arquivo `firestore.rules` foi atualizado para permitir que cada usuário leia e grave somente a própria subcoleção `buscas`.

Para testar toda a personalização comportamental, publique as regras atuais do `firestore.rules` no Firebase antes dos testes. Caso as novas regras ainda não estejam publicadas, o portal continua funcionando com personalização baseada no cadastro e nos sinais que estiverem disponíveis.

## active_v35 — seleção semanal personalizada

- adiciona uma seleção semanal estável com até 4 conteúdos escolhidos pelo perfil e comportamento;
- a seleção combina movimento, alimentação, receitas e Sucos Detox, ordenados pela prioridade individual;
- o roteiro permanece disponível durante a semana e pode ser persistido em `usuarios/{uid}/roteiros/{semana}`;
- a home passa a variar também a saudação e o contexto da seleção;
- conteúdos concluídos antes da criação de uma nova semana perdem prioridade;
- não é uma agenda obrigatória: a interface deixa claro que são sugestões flexíveis para explorar no próprio ritmo.

## Experiência personalizada por conteúdo — v36

A página `conteudo.html` passou a adaptar a apresentação do mesmo conteúdo para cada conta.

A personalização considera:
- dados do onboarding;
- objetivos, interesses, duração, local e equipamentos;
- preferência alimentar e tempo de preparo;
- favoritos, histórico, progresso e buscas;
- estágio de uso da conta.

A base editorial do conteúdo permanece estável, mas mudam:
- a introdução contextual;
- o bloco "Sua versão deste conteúdo";
- os destaques e explicações;
- títulos de preparo/sequência quando aplicável;
- conteúdos relacionados;
- mensagens de continuidade, favorito e conclusão.

Essa camada usa `js/experiencia.js` e não cria novas coleções no Firestore. As regras da v35 permanecem compatíveis.


## Validação do motor de personalização — v37

A versão 37 inclui uma rodada automatizada de validação do motor de personalização.

- suíte: `testes/validar-personalizacao.mjs`;
- relatório: `relatorios/validacao-personalizacao-v37.md`;
- 7 perfis/comportamentos simulados;
- 80 conteúdos avaliados;
- prioridade refinada por especificidade de nível, duração, local e equipamento;
- diversidade reforçada no bloco “Para você hoje”.

Executar localmente:

```bash
node --experimental-default-type=module testes/validar-personalizacao.mjs
```

## Revalidação minuciosa do motor — v38

A primeira validação foi refeita com uma matriz ampliada e correções de regressão.

- 7 cenários representativos preservados;
- 288 combinações de exercício;
- 84 combinações alimentares;
- 372 combinações matriciais no total;
- nível, local, limite de duração, equipamento e perfil alimentar validados;
- reconhecimento ampliado de restrições como `celíaco/celíaca` e de movimentos como `flexão/flexões`;
- roteiro semanal recompõe automaticamente um quarto item quando um ID persistido deixa de ser válido;
- buscas compostas passam a influenciar o comportamento por palavras relacionadas, não apenas por frase literal;
- desempate diário usa a data local;
- selo “Recomendado para você” ficou mais seletivo para não marcar quase toda a biblioteca.

Relatório completo: `relatorios/validacao-personalizacao-v38.md`.

Executar:

```bash
node testes/validar-personalizacao.mjs
```

## Validação de diversidade e diferenciação — v39

A segunda rodada foi ampliada para duas suítes complementares.

### Suíte pseudoaleatória

- `testes/validar-diversidade-experiencia.mjs`;
- 1.500 contas sintéticas;
- perfis distantes, comportamentos opostos, evolução de estágio e renovação semanal;
- relatório: `relatorios/validacao-diversidade-experiencia-v39.md`.

### Suíte sistemática

- `testes/validar-diferenciacao-experiencia.mjs`;
- 2.304 perfis sistemáticos;
- 2.304 comparações de mesmo cadastro com UIDs distintos;
- microinterações vs. comportamento consolidado;
- perfis próximos vs. distantes;
- isolamento entre exercício e alimentação;
- cenário hostil de restrições;
- 100% da biblioteca coberta nas vitrines sintéticas;
- relatório: `relatorios/validacao-diferenciacao-experiencia-v39.md`;
- métricas brutas: `relatorios/metricas-diferenciacao-v39.json`.

Correções principais da rodada:

- confiança comportamental para impedir que um único clique domine a conta;
- na v39, a individualização usava UID/dia; a v40 removeu o dia do desempate principal para eliminar variação diária artificial;
- maior diversidade no destaque alimentar e no slot de descoberta;
- regressões permanentes contra conteúdo bloqueado, concluído e cards duplicados.

Executar:

```bash
node testes/validar-personalizacao.mjs
node testes/validar-diversidade-experiencia.mjs
node testes/validar-diferenciacao-experiencia.mjs
```

## Reauditoria da segunda rodada — v40

A segunda rodada de diferenciação foi auditada novamente com uma suíte independente.

Principais correções:

- removido o dia do desempate principal da home; a mesma conta não muda de composição apenas porque virou a data;
- renovação temporal permanece no roteiro semanal;
- `nivel_atividade` e `dias_exercicio` passaram a influenciar de forma secundária e segura a ordenação de exercícios;
- altura, peso e data de nascimento continuam fora do ranking automático;
- histórico antigo incompatível não supera o perfil atual.

Nova suíte:

```bash
node testes/validar-reauditoria-segunda-rodada.mjs
```

Relatório: `relatorios/reauditoria-segunda-rodada-v40.md`.
Métricas: `relatorios/metricas-reauditoria-v40.json`.

Para regressão completa da personalização:

```bash
node testes/validar-personalizacao.mjs
node testes/validar-diversidade-experiencia.mjs
node testes/validar-diferenciacao-experiencia.mjs
node testes/validar-reauditoria-segunda-rodada.mjs
```

## Validação de casos extremos — v41

A terceira rodada de validação adiciona testes longitudinais e de borda para o motor de experiência. Foram simuladas 120 contas durante 26 semanas, esgotamento progressivo da biblioteca, mudança abrupta de perfil, mudança persistente de comportamento, entradas incompletas, crescimento da biblioteca e fronteiras semanais.

Correções principais:
- conteúdo concluído não volta a aparecer como novidade quando a biblioteca se esgota;
- a home exibe um estado próprio quando todos os conteúdos atuais foram explorados;
- roteiros semanais agora carregam uma assinatura do perfil e são recalculados quando as preferências relevantes mudam;
- prateleiras vazias são ocultadas;
- o motor aceita data controlada em testes para validar evolução semanal e mensal.

Arquivos de validação:
- `testes/validar-casos-extremos-evolucao.mjs`;
- `relatorios/validacao-casos-extremos-evolucao-v41.md`;
- `relatorios/metricas-casos-extremos-v41.json`.
