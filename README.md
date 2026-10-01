# Active Vida Leve — Baseline V32

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

Conteúdos em andamento são priorizados em “Continue explorando”. Conteúdos concluídos deixam de ocupar as principais posições de descoberta para abrir espaço para opções novas. O algoritmo também usa um desempate estável por usuário e dia, evitando que usuários com perfis iguais recebam necessariamente a mesma sequência de cards, sem embaralhar a página a cada atualização.

As páginas de Alimentação, Exercícios, Receitas, Sucos Detox e Busca usam a mesma camada comportamental para ordenar seus próprios conteúdos. A página individual também adapta a introdução ao perfil e ao estado de progresso daquele usuário.

### Sinais de busca

A subcoleção `usuarios/{uid}/buscas/{buscaId}` registra apenas o termo pesquisado, contagem e data da última ocorrência. Esses dados são usados para melhorar a ordem dos conteúdos para a própria conta. O arquivo `firestore.rules` foi atualizado para permitir que cada usuário leia e grave somente a própria subcoleção `buscas`.

Para testar toda a personalização comportamental, publique as regras atuais do `firestore.rules` no Firebase antes dos testes. Caso as novas regras ainda não estejam publicadas, o portal continua funcionando com personalização baseada no cadastro e nos sinais que estiverem disponíveis.
