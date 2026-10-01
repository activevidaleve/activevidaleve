# Validação sistemática de diferenciação da experiência — v39

## Objetivo

Esta rodada foi desenhada para responder de forma quantitativa à pergunta central do Active Vida Leve:

> O portal realmente parece montado para cada pessoa, sem virar uma experiência aleatória ou incoerente?

A validação não mede apenas se o conteúdo “combina” com o cadastro. Ela mede também:

- quanto duas contas diferentes divergem;
- quanto perfis próximos permanecem coerentes;
- quanto perfis distantes se separam;
- quanto o comportamento altera a experiência ao longo do uso;
- se uma interação isolada muda demais a home;
- se histórico consistente muda o suficiente;
- se mudanças de exercício interferem indevidamente em alimentação e vice-versa;
- se conteúdos concluídos ou bloqueados reaparecem por causa do comportamento;
- se a biblioteca inteira consegue chegar às vitrines do portal.

## Escopo executado

A suíte `testes/validar-diferenciacao-experiencia.mjs` executou:

- **2.304 perfis sintéticos sistemáticos**;
- **2.304 pares com o mesmo cadastro e UIDs diferentes**;
- 4 focos comportamentais (`exercise`, `recipe`, `juice`, `food`);
- para cada foco: microinteração e histórico forte;
- **320 pares de perfis próximos**;
- **320 pares de perfis distantes**;
- **256 testes de isolamento entre domínios**;
- 128 repetições de estabilidade absoluta;
- cenário hostil em que o usuário interage deliberadamente com itens incompatíveis/bloqueados;
- verificação de duplicação nas vitrines para todos os 2.304 perfis neutros;
- verificação de seleção semanal com quatro itens únicos para todos os 2.304 perfis.

No total, a suíte monta e compara aproximadamente **11.969 experiências completas de home**, além das verificações internas de segurança.

A biblioteca usada possui **80 conteúdos**.

## Matriz de perfis

Os 2.304 perfis cobrem combinações sistemáticas de:

- 3 níveis de exercício;
- 4 durações;
- 4 locais;
- 4 configurações de equipamento;
- 3 perfis alimentares;
- 4 tempos de preparo;
- 4 arquétipos rotativos de objetivos e interesses.

Isso evita depender apenas de alguns perfis escolhidos manualmente.

## Resultado 1 — experiência completa individualizada

Das 2.304 contas sintéticas:

- **2.304 de 2.304** tiveram uma assinatura completa diferente;
- taxa de assinaturas completas únicas: **100%**.

A assinatura completa considera:

- “Para você hoje”;
- seleção personalizada;
- prateleiras de Exercícios, Receitas, Sucos e Alimentação;
- seleção semanal;
- ordem temática;
- estágio do usuário;
- contexto da home.

O topo mais curto, composto por 7 conteúdos principais, teve:

- **2.018 assinaturas únicas**;
- **87,59%** de combinações distintas.

Conclusão: contas diferentes não dependem apenas de textos diferentes; a própria composição do portal muda.

## Resultado 2 — mesmo perfil, contas diferentes

Foram comparados todos os **2.304 perfis** usando dois UIDs diferentes para cada cadastro.

Resultado no topo principal:

- Jaccard médio: **50,81%**;
- mediana: **55,56%**;
- percentil 90: **75%**;
- apenas **27 de 2.304 pares** ficaram totalmente iguais no topo.

Isso significa que aproximadamente **98,83%** dos pares com o mesmo cadastro receberam ao menos uma diferença no topo da experiência.

A individualização é controlada: o perfil continua sendo dominante e a conta só escolhe entre alternativas de afinidade semelhante.

## Resultado 3 — perfis próximos continuam reconhecíveis

Em 320 pares onde foi alterado apenas um aspecto próximo do cadastro:

- Jaccard médio: **77,15%**;
- percentil 90: **100%**.

Ou seja: uma pequena mudança não reconstrói o portal inteiro.

## Resultado 4 — perfis distantes realmente se separam

Em 320 pares alterando simultaneamente várias dimensões relevantes:

- Jaccard médio: **7,47%**;
- percentil 90: **16,67%**.

A diferença entre perfis próximos e distantes é muito ampla, indicando que a personalização está respondendo aos dados do cadastro e não apenas embaralhando cards.

## Resultado 5 — microinteração não deve dominar a conta

Foram simuladas interações pequenas, como um favorito, uma abertura e uma busca relacionada.

Sobreposição média com a home anterior:

- Exercícios: **70,30%**;
- Receitas: **69,37%**;
- Sucos: **79,15%**;
- Alimentação/marmitas: **69,21%**.

Isso é intencional: uma única ação influencia a experiência, mas não redefine a identidade da conta.

## Resultado 6 — comportamento forte precisa mudar a experiência

Com histórico consistente, favoritos, progresso e buscas repetidas no mesmo tema, a sobreposição com a home original caiu para:

- Exercícios: **56,52%**;
- Receitas: **12,90%**;
- Sucos: **28,53%**;
- Alimentação/marmitas: **21,99%**.

Em **100%** dos cenários, o tema comportamental ficou em posição igual ou melhor entre as prateleiras temáticas.

Em **100%** dos cenários, a presença do tema no topo foi mantida ou aumentada.

Conclusão: o comportamento muda a experiência de forma gradual e acumulativa, não por um único clique.

## Resultado 7 — isolamento entre áreas

Foi alterado somente o perfil de exercício, mantendo alimentação igual.

- recomendação alimentar principal permaneceu estável em **100%** dos 256 testes.

Foi alterado somente o perfil alimentar, mantendo exercício igual.

- recomendação de exercício principal permaneceu estável em **100%** dos 256 testes.

Esse teste é importante porque evita uma personalização “caótica”, na qual mudar a duração do treino faria as receitas mudarem sem motivo.

## Resultado 8 — cobertura da biblioteca

Nos 2.304 perfis sintéticos:

- **80 de 80 conteúdos** apareceram em alguma vitrine de home;
- cobertura: **100% da biblioteca**.

No destaque principal de exercício apareceram **18 exercícios diferentes**.

No destaque alimentar apareceram **34 conteúdos diferentes**.

No destaque de descoberta apareceram **33 conteúdos diferentes**.

A concentração do item mais frequente ficou em:

- exercício: **13,72%**;
- alimentação: **25,00%**;
- descoberta: **15,10%**.

A alimentação ainda possui alguns conteúdos naturalmente fortes para determinados arquétipos, mas não existe mais o cenário anterior em que apenas seis opções dominavam praticamente toda a amostra.

## Resultado 9 — estabilidade

Com o mesmo:

- UID;
- perfil;
- comportamento;
- biblioteca;
- dia;

a experiência foi **100% estável**.

Isso significa que atualizar a página não causa um embaralhamento aleatório.

## Resultado 10 — segurança contra comportamento incompatível

Foi criado um perfil com:

- alimentação vegana;
- lactose/leite a evitar;
- doença celíaca/trigo a evitar;
- flexões e saltos marcados para evitar.

Em seguida, a simulação criou favoritos, histórico e progresso justamente em conteúdos bloqueados para esse perfil.

Resultado:

- nenhum conteúdo bloqueado voltou para as vitrines principais;
- comportamento não supera restrições ou incompatibilidades estruturadas.

Além disso, os quatro cenários comportamentais executaram **27.648 verificações de segurança** sem reintroduzir conteúdo bloqueado.

## Resultado 11 — conteúdos concluídos

Nos quatro focos comportamentais:

- vazamento de conteúdo concluído para vitrines de novidade: **0**.

Conteúdo concluído deixa espaço para novos conteúdos enquanto houver alternativas disponíveis.

## Problemas encontrados nesta rodada e correções

### 1. Uma interação pequena estava influenciando demais temas inteiros

O sinal comportamental agregado era forte mesmo com evidência mínima.

**Correção:** foi criado um fator de `confianca` comportamental. Tendências amplas de tipo, categoria, tags, objetivos e buscas ganham peso conforme o histórico aumenta. Favoritos e progresso ainda têm efeito direto no item específico.

Resultado: microinterações preservam cerca de 69–79% do topo, enquanto histórico forte produz mudanças muito maiores.

### 2. Individualização podia contaminar áreas sem relação

Uma abordagem intermediária de desempate usava a assinatura completa do perfil. Isso faria uma alteração de exercício mudar também o desempate de alimentação.

**Correção final:** a pequena variação de conta usa somente UID + dia. O perfil entra exclusivamente pela pontuação semântica.

Resultado: isolamento entre exercício e alimentação ficou em **100%** nos testes direcionados.

### 3. O destaque alimentar estava concentrado demais

Antes da correção, apenas **6 conteúdos** conseguiam ocupar o destaque alimentar em toda a matriz sistemática.

**Correção:** o slot “Para você hoje” passou a escolher entre conteúdos de afinidade equivalente, mantendo uma janela de relevância e priorizando o interesse principal do cadastro quando aplicável.

Resultado final: **34 conteúdos diferentes** chegaram ao destaque alimentar.

### 4. A descoberta também repetia poucas opções

O slot de descoberta era determinado pelo primeiro candidato disponível de uma categoria/tipo diferente.

**Correção:** a descoberta passou a selecionar entre alternativas equivalentes, mantendo diversidade de categoria e afinidade.

Resultado final: **33 conteúdos diferentes** chegaram ao destaque de descoberta.

## Critérios de aprovação automatizados

A suíte agora falha automaticamente se, entre outros casos:

- menos de 85% das assinaturas de topo forem distintas;
- menos de 97% das experiências completas forem distintas;
- perfis próximos divergirem demais;
- perfis distantes permanecerem parecidos demais;
- uma microinteração modificar excessivamente a home;
- histórico forte deixar de produzir adaptação;
- exercício alterar indevidamente alimentação;
- alimentação alterar indevidamente exercício;
- conteúdo concluído reaparecer como novidade;
- conteúdo bloqueado aparecer por influência comportamental;
- alguma prateleira repetir cards;
- a seleção semanal repetir itens;
- parte da biblioteca nunca chegar às vitrines sintéticas.

## Arquivos

- suíte sistemática: `testes/validar-diferenciacao-experiencia.mjs`;
- métricas brutas: `relatorios/metricas-diferenciacao-v39.json`;
- este relatório: `relatorios/validacao-diferenciacao-experiencia-v39.md`.

## Conclusão

A segunda rodada sistemática confirma a propriedade que queremos para o Active Vida Leve:

- **perfil parecido → experiência reconhecivelmente parecida**;
- **perfil diferente → experiência muito diferente**;
- **comportamento pequeno → ajuste pequeno**;
- **comportamento consistente → ajuste forte**;
- **mesma entrada → experiência estável**;
- **cada conta → composição própria sem perder coerência**.

O motor pode seguir para a próxima etapa mantendo as duas suítes de v39 como regressão permanente.
