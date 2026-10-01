# Revalidação minuciosa do motor de personalização — active_v38

## Objetivo

Refazer a primeira validação com mais profundidade antes da próxima rodada de comparação entre dezenas de usuários simulados. Esta etapa verifica coerência do motor atual, segurança básica das restrições, estabilidade, diversidade, persistência semanal e compatibilidade entre cadastro e recomendações.

## Escopo executado

A revalidação usa os 80 conteúdos atuais da biblioteca:

- 20 conteúdos de Alimentação;
- 20 Exercícios;
- 20 Receitas;
- 20 Sucos Detox.

Foram mantidos os 7 cenários representativos da v37 e adicionadas matrizes sistemáticas:

- 288 combinações de exercício: nível × duração × local × equipamento;
- 84 combinações alimentares: perfil alimentar × tempo de preparo × interesse;
- total de 372 combinações matriciais, além dos 7 cenários principais.

## Resultado geral

A suíte `testes/validar-personalizacao.mjs` termina sem falhas.

Resumo atual:

- 80 conteúdos e 80 IDs únicos;
- 100% das combinações de exercício receberam conteúdo principal compatível com o nível informado;
- 100% receberam exercício compatível com o local informado ou marcado como `variado`;
- 100% dos perfis sem equipamento receberam exercício que aceita `nenhum`;
- nenhum exercício principal ultrapassou a faixa de tempo disponível do cadastro;
- duração exata foi priorizada em 81,6% das combinações em que havia opção exata; nos demais casos o motor escolheu uma opção mais curta, nunca uma opção que excedesse o tempo informado;
- nenhum conteúdo alimentar principal ultrapassou o tempo de preparo informado quando o conteúdo possuía essa classificação;
- perfis vegetariano e vegano não receberam itens principais incompatíveis com o perfil alimentar;
- interesses alimentares foram priorizados quando havia conteúdo compatível disponível;
- nenhuma recomendação bloqueada entrou nas áreas principais dos cenários de teste;
- não houve duplicação entre as prateleiras dinâmicas principais da home;
- a seleção semanal permaneceu sem IDs duplicados e com quatro itens.

## Problemas encontrados nesta revalidação e correções

### 1. Variações no texto de movimentos a evitar

Na v37, `flexão` era detectado, mas `flexões` podia não bloquear um conteúdo marcado com `movimentos_tags: ["flexao"]`.

Correção:

- os termos de movimento agora são convertidos para uma chave canônica;
- `flexão` e `flexões` convergem para `flexao`;
- o mesmo princípio foi aplicado a corrida/correr, salto/pulo, agachamento(s), burpee(s), prancha(s) e abdominal(is).

### 2. Restrição a glúten escrita como condição celíaca

Na v37, `glúten` e `trigo` eram reconhecidos, mas `celíaco`, `celíaca` e `doença celíaca` não eram tratados como sinal de conflito com conteúdos marcados com glúten.

Correção:

- as variações `celíaco`, `celíaca` e `doença celíaca` passam a convergir para a restrição canônica `gluten`.

Observação: a detecção continua sendo uma camada conservadora de organização, não uma garantia médica. O usuário ainda deve conferir ingredientes e rótulos quando houver alergias ou restrições.

### 3. Roteiro semanal podia cair de quatro para três itens

Se um roteiro persistido tivesse quatro IDs e um deles deixasse de ser válido para o perfil atual, a v37 podia preservar apenas três itens sem completar a seleção.

Correção:

- o roteiro agora preserva IDs válidos já salvos e completa a seleção até quatro itens;
- os itens adicionais continuam respeitando perfil, comportamento, bloqueios e diversidade.

### 4. Buscas compostas tinham influência comportamental fraca

Uma busca como `almoço rápido` podia não influenciar um conteúdo relacionado a `almoco` + `receitas_rapidas` quando a frase não aparecia literalmente na mesma ordem.

Correção:

- o sinal de busca agora compara também palavras normalizadas;
- variações simples de singular/plural e gênero em termos longos são aproximadas por uma raiz leve;
- o comportamento melhora tanto a influência da busca no motor quanto a busca visível em `buscar.html`.

### 5. Desempate diário usava a data UTC

A v37 gerava a chave diária usando UTC. No Brasil isso poderia mudar a ordem de desempate antes da meia-noite local.

Correção:

- o desempate diário passa a usar ano, mês e dia do horário local do navegador.

### 6. Selo “Recomendado para você” estava amplo demais

Na v37 a regra usava `relevancia >= 45 OU pontuacao >= 30`, o que fazia muitos conteúdos receberem o selo mesmo com compatibilidade apenas moderada.

Exemplos observados antes do ajuste:

- perfil iniciante/casa: 58 de 80 conteúdos marcados;
- perfil academia: 30 de 80;
- perfil vegano focado em sucos/receitas rápidas: 74 de 77 conteúdos não bloqueados.

Correção:

- o selo passa a exigir simultaneamente `relevancia >= 60` e `pontuacao >= 40`.

Após o ajuste nos mesmos perfis:

- iniciante/casa: 14 de 80;
- academia: 7 de 80;
- vegano/sucos/receitas rápidas: 42 de 77.

O ranking completo continua disponível; a mudança deixa apenas o selo visual mais seletivo.

## Interpretação da duração

A validação diferenciou duas coisas:

1. **não exceder o tempo informado** — regra obrigatória para a recomendação principal;
2. **usar exatamente a faixa informada** — preferência, mas não obrigação.

Exemplo: quem informou 30–45 minutos pode receber um conteúdo de 15–30 minutos se ele combinar melhor com objetivo, local e equipamento. O motor não deve, porém, escolher como principal uma opção cujo menor tempo já seja maior que a disponibilidade informada.

Na matriz atual:

- 100% respeitaram o limite;
- 81,6% escolheram a faixa exata quando havia opção exata disponível.

## Estágios do usuário

A suíte também valida transição coerente entre:

- `primeiros_passos`;
- `descobrindo`;
- `em_ritmo`;
- `recorrente`.

Favoritos, histórico, progresso e buscas alteram o estágio sem usar peso corporal, aparência ou metas de emagrecimento.

## Roteiro semanal

Foi validado que:

- possui quatro itens;
- não repete conteúdo;
- preserva os itens válidos já persistidos;
- recompõe itens faltantes quando necessário;
- continua usando somente itens não bloqueados pelo perfil atual.

## Testes de regressão permanentes

A suíte oficial ficou em:

```text
testes/validar-personalizacao.mjs
```

Comando:

```bash
node testes/validar-personalizacao.mjs
```

Resultado atual esperado:

```text
Validação minuciosa concluída sem falhas.
{
  "cenarios_representativos": 7,
  "conteudos": 80,
  "matriz_exercicios": 288,
  "matriz_alimentar": 84,
  "combinacoes_matriciais": 372,
  "taxa_duracao_exata_exercicio": "81.6%",
  "duracao_exercicio_nunca_excedida": true,
  "tempo_preparo_nunca_excedido": true,
  "restricoes_variantes_validadas": true,
  "roteiro_semanal_recomposto": true,
  "busca_composta_influencia_motor": true
}
```

## Limites desta primeira validação

Esta rodada testa coerência individual e regressões do motor. Ela ainda não mede estatisticamente o quanto dezenas de usuários diferentes recebem experiências diferentes entre si. Essa será a próxima rodada planejada: diversidade entre perfis semelhantes e distintos, sobreposição de cards, influência do comportamento e concentração excessiva de determinados conteúdos.
