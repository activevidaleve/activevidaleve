# Validação de diversidade da experiência — v39

## Objetivo

Esta suíte complementar usa perfis pseudoaleatórios e cenários de comportamento para verificar diversidade, coerência, evolução de estágio e renovação semanal.

Ela complementa a matriz sistemática de `validar-diferenciacao-experiencia.mjs`.

## Escopo reexecutado na versão final

- 1.500 contas sintéticas;
- 3.759 pares de perfis distantes;
- 180 pares com o mesmo cadastro e UIDs diferentes;
- 220 pares com o mesmo cadastro e comportamentos opostos;
- 560 cenários direcionais de foco comportamental;
- 220 pares alterando apenas a duração do exercício;
- 80 sequências de evolução de estágio;
- cenários com 5, 20, 40, 60 e 75 conteúdos concluídos;
- 120 comparações entre semanas consecutivas.

A biblioteca possui 80 conteúdos.

## Resultados finais

### Diversidade global

Entre 1.500 contas sintéticas, **99,80%** produziram uma assinatura principal distinta.

### Perfis distantes

Em 3.759 pares:

- Jaccard médio: **31,16%**;
- P90: **43,75%**.

### Mesmo cadastro, contas diferentes

Em 180 pares:

- Jaccard médio da experiência principal: **73,12%**;
- Jaccard médio da seleção semanal: **44,83%**.

O cadastro continua dominante, com variação controlada entre contas.

### Mesmo cadastro, comportamentos opostos

Em 220 pares:

- Jaccard médio: **44,44%**;
- ordem das seções mudou em **100%** dos pares.

### Direcionalidade comportamental

Quando o histórico se concentra em um tema, a prateleira correspondente chegou ao topo temático em:

- Exercícios: **95,00%**;
- Alimentação: **95,00%**;
- Receitas: **99,29%**;
- Sucos Detox: **100,00%**.

### Mudança de um único campo

Alterando somente a duração disponível:

- Jaccard médio da home: **87,29%**;
- Jaccard médio da área de exercícios: **48,50%**.

A alteração fica concentrada principalmente na área relacionada.

### Renovação semanal

Comparando semanas consecutivas em 120 contas:

- Jaccard médio: **45,42%**.

A seleção mantém parte da coerência e renova mais da metade da composição em média.

## Verificações adicionais aprovadas

- progressão `primeiros_passos → descobrindo → em_ritmo → recorrente`;
- conteúdos concluídos não voltam como novidade enquanto houver alternativas;
- seleção semanal é estável dentro da mesma semana;
- a semana seguinte renova parte do roteiro;
- conteúdos bloqueados não aparecem nas áreas principais.

## Execução

```bash
node testes/validar-diversidade-experiencia.mjs
```

A suíte sistemática complementar deve ser executada em seguida:

```bash
node testes/validar-diferenciacao-experiencia.mjs
```
