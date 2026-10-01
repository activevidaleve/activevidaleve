# Reauditoria minuciosa da segunda rodada — v40

## Objetivo

Esta verificação foi feita depois da segunda rodada de diferenciação para auditar não só os resultados, mas também a metodologia e possíveis efeitos colaterais do próprio motor.

A pergunta central continua sendo:

> A experiência é realmente pessoal por causa do cadastro e do comportamento, ou parte da diferença vem apenas de variação artificial?

Além de reexecutar as suítes anteriores, a v40 adiciona uma auditoria independente com novos testes de estabilidade temporal, influência de campos do cadastro, coerência semântica entre contas parecidas, mudança de perfil, ordem física do catálogo e robustez de entrada.

## Suítes reexecutadas

As três suítes existentes foram executadas novamente sobre o motor final da v40:

1. `testes/validar-personalizacao.mjs`
   - 7 cenários representativos;
   - 288 combinações de exercícios;
   - 84 combinações alimentares;
   - 372 combinações matriciais;
   - nenhum exercício principal excedeu a duração informada;
   - nenhum preparo principal excedeu o tempo disponível;
   - bloqueios e restrições permaneceram válidos.

2. `testes/validar-diversidade-experiencia.mjs`
   - 1.500 contas sintéticas;
   - 99,73% de assinaturas principais distintas;
   - perfis distantes: Jaccard médio de 31,22%;
   - mesmo cadastro sem comportamento: Jaccard médio de 73,70% na experiência ampla;
   - mesmo cadastro com comportamentos opostos: 44,32%;
   - foco comportamental chegou ao topo temático em 95%–100% dos cenários;
   - mudança de apenas duração preservou 87,65% da home e alterou significativamente a área de exercícios;
   - renovação semanal média permaneceu equilibrada.

3. `testes/validar-diferenciacao-experiencia.mjs`
   - 2.304 perfis sistemáticos;
   - 2.002 assinaturas de topo únicas (86,89%);
   - 2.304 experiências completas únicas (100%);
   - 80 de 80 conteúdos apareceram nas vitrines sintéticas;
   - perfis próximos: Jaccard médio de 76,95%;
   - perfis distantes: 7,52%;
   - isolamento primário entre exercício e alimentação: 100%;
   - nenhum conteúdo bloqueado voltou por influência comportamental;
   - nenhum conteúdo concluído vazou para vitrines de novidade.

## Novos problemas encontrados

### 1. A home mudava demais apenas porque o dia mudou

Na v39, o desempate individual utilizava:

`UID + data do dia`

Isso significava que uma pessoa podia abrir a plataforma em dois dias consecutivos, sem alterar cadastro nem comportamento, e receber outra composição apenas por ter virado a data.

Na reauditoria comparativa da v39:

- 500 contas foram avaliadas em dois dias consecutivos;
- estabilidade exata do núcleo da home: **0%**.

Isso não combinava com o objetivo do produto. A plataforma deve parecer pessoal e consistente, não aleatória.

### Correção

O desempate principal agora usa somente o UID como variação secundária e estável.

A renovação baseada em tempo fica concentrada no **roteiro semanal**, que já foi criado especificamente para esse propósito.

Resultado final da v40:

- 500/500 contas mantiveram o núcleo da home exatamente igual de um dia para o outro sem novas interações;
- 500/500 mantiveram o mesmo roteiro dentro da mesma semana;
- em 91,8% das contas o roteiro mudou ao passar para a semana seguinte.

Assim, a página deixa de se reorganizar artificialmente todos os dias, mas ainda existe renovação planejada.

## 2. Dois campos relevantes do cadastro não influenciavam o motor

A auditoria encontrou que:

- `nivel_atividade`;
- `dias_exercicio`;

eram salvos e exibidos no perfil, mas não afetavam de fato a ordem das recomendações porque nenhum conteúdo utilizava esses campos como metadado relevante.

Na v39, alterando apenas esses campos:

- efeito de `nivel_atividade` na experiência de exercícios: **0%**;
- efeito de `dias_exercicio`: **0%**.

### Correção

A v40 passou a usar esses dois dados como **sinais secundários de rotina**, nunca como prescrição de intensidade ou volume.

Exemplos da lógica:

- uma rotina pouco ativa pode dar um pequeno reforço a mobilidade, pausas ativas e movimento confortável;
- uma rotina muito frequente pode dar um reforço leve a mobilidade e alongamento como variedade;
- a quantidade de dias informada ajuda a ordenar formatos gerais, sem recomendar mais exercício do que a pessoa pediu.

Eles não substituem nível, duração, local ou equipamentos, que continuam mais importantes.

Resultado em 350 perfis:

- mudar apenas `nivel_atividade` alterou a prateleira de exercícios em **90,0%** dos casos;
- mudar apenas `dias_exercicio` alterou a prateleira em **78,57%**;
- a recomendação alimentar principal permaneceu igual em **100%** dos casos;
- a composição alimentar completa permaneceu exatamente igual em 97,43% e 96,86% respectivamente; pequenas diferenças restantes vêm do mecanismo global de evitar cards repetidos entre prateleiras, não de afinidade alimentar.

## Coerência entre duas pessoas com o mesmo cadastro

A reauditoria separou três níveis de comparação. Em 1.000 pares com o mesmo cadastro e UIDs diferentes:

- sobreposição dos IDs exatos do topo: **57,67%**;
- sobreposição de categorias: **80,48%**;
- sobreposição dos grandes tipos de conteúdo: **98,18%**.

Isso é um resultado importante: duas pessoas com o mesmo cadastro podem receber cards específicos diferentes, mas continuam dentro de uma estrutura temática muito parecida.

Portanto, a individualização por conta está funcionando principalmente como desempate entre alternativas semanticamente compatíveis, e não como embaralhamento sem relação com o perfil.

## Perfil atual contra histórico antigo

Foi criado um cenário em que a pessoa tinha um histórico forte de academia/halteres e depois seu perfil atual dizia:

- iniciante;
- casa;
- até 15 minutos;
- nenhum equipamento.

Em 180 simulações:

- o exercício principal atual venceu o histórico incompatível em **100%** dos casos.

Também foi simulado histórico alimentar incompatível com um perfil vegano atualizado:

- conteúdos bloqueados pelo perfil atual permaneceram fora das vitrines em **100%** dos casos.

O comportamento pode refinar a experiência, mas não pode sobrepor incompatibilidades estruturais do perfil atual.

## Ordem física do catálogo

Foram reordenados os 80 documentos do catálogo em 200 cenários.

Resultado:

- experiência idêntica em **100%** dos casos.

A recomendação depende de pontuação e regras, não da posição do conteúdo dentro do JSON.

## Dados corporais e idade

A reauditoria confirmou deliberadamente que:

- altura;
- peso;
- data de nascimento;

não mudam o ranking automático de conteúdos.

Em 200 pares de teste, a experiência permaneceu idêntica em 100% dos casos.

Esses dados não serão usados para produzir metas automáticas de corpo, restrição alimentar ou intensidade de exercício. Idade poderá servir a salvaguardas do produto, mas não a metas corporais automáticas.

## Robustez de dados incompletos

Foram testados perfis:

- vazios;
- com listas vazias;
- com valores desconhecidos;
- com campos em formato textual alternativo;
- com perfil alimentar `outra`;
- com poucos dados disponíveis.

Todos os 5 cenários produziram uma home válida sem erro estrutural.

## Métricas da auditoria independente

Arquivo bruto:

`relatorios/metricas-reauditoria-v40.json`

Suíte:

`testes/validar-reauditoria-segunda-rodada.mjs`

Resumo:

- 500 comparações de estabilidade diária;
- 1.000 comparações de mesmo cadastro com UIDs diferentes;
- 350 testes de influência de `nivel_atividade` e `dias_exercicio`;
- 200 testes de neutralidade de altura/peso/data de nascimento;
- 200 testes de invariância à ordem do catálogo;
- 180 cenários de histórico antigo incompatível;
- 5 cenários de entrada incompleta;
- mais todas as suítes anteriores reexecutadas.

## Conclusão

A segunda rodada continua aprovada depois de uma auditoria independente mais rigorosa.

A reauditoria, porém, não foi apenas confirmatória: ela encontrou dois problemas reais que as suítes anteriores não capturavam:

1. variação diária excessiva sem mudança do usuário;
2. dois campos do cadastro que não influenciavam a experiência.

Ambos foram corrigidos na v40.

O comportamento final esperado fica mais próximo da intenção do Active Vida Leve:

- cadastro define a base;
- comportamento refina a base;
- UID apenas desempata opções equivalentes;
- a home não muda sozinha todo dia;
- o roteiro semanal oferece renovação previsível;
- mudanças de rotina influenciam a área correta;
- histórico antigo não vence o perfil atual;
- dados corporais não geram metas automáticas.

A v40 passa a ser a referência para a próxima rodada de testes de casos extremos e evolução de longo prazo.
