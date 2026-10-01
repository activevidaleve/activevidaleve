# Validação do motor de personalização — active_v37

## Objetivo

Validar se o Active Vida Leve realmente produz experiências coerentes para perfis distintos, sem depender apenas de uma reorganização superficial dos mesmos conteúdos.

## Cenários simulados

Foram executados cenários com perfis e comportamentos diferentes:

1. iniciante, em casa, até 15 minutos, sem equipamento;
2. intermediário, academia, treino longo, halteres/equipamentos de academia;
3. perfil vegano, preparo rápido, interesse em sucos e café da manhã;
4. experiente, ao ar livre, 30–45 minutos;
5. usuário recorrente focado em marmitas, com favoritos, histórico, progresso e buscas;
6. usuário recorrente focado em exercícios, com favoritos, conteúdos concluídos/em andamento e buscas;
7. usuário com restrições informadas para lactose e glúten.

A suíte usa os 80 conteúdos atuais da biblioteca.

## Problemas encontrados na primeira rodada

### Conteúdos muito amplos dominavam o ranking

Um exercício que atendia todos os níveis, locais e durações recebia a mesma pontuação de um conteúdo construído especificamente para academia, casa ou determinada duração.

Isso fazia alguns conteúdos genéricos aparecerem demais para perfis diferentes.

### Duração menor recebia o mesmo peso da duração exata

Um usuário que informou mais de 45 minutos podia receber como principal um conteúdo de até 15 minutos porque qualquer duração menor era tratada como compatibilidade completa.

### Conteúdo sem equipamento dominava usuários de academia

Conteúdos que não exigiam equipamento recebiam pontuação completa mesmo quando o usuário informou halteres ou equipamentos de academia.

### Descoberta do dia podia repetir o mesmo tema

O terceiro item de “Para você hoje” podia repetir a categoria dos dois primeiros, diminuindo a sensação de variedade.

## Correções aplicadas

### Especificidade passa a valer

O motor agora diferencia conteúdo muito amplo de conteúdo mais específico. Um conteúdo que combina exatamente com nível, local ou equipamento recebe prioridade maior do que um conteúdo genérico compatível com todos.

### Duração exata recebe prioridade

A duração informada no cadastro passou a ser tratada em níveis:

- duração exata: prioridade máxima;
- uma faixa menor: compatibilidade parcial;
- muito menor: compatibilidade reduzida;
- maior que o tempo informado: penalização.

### Equipamento exato recebe prioridade

Se o usuário informou equipamento disponível, conteúdos que usam esse equipamento recebem mais relevância. Conteúdos sem equipamento continuam possíveis, mas deixam de dominar a seleção apenas por serem universalmente executáveis.

### “Para você hoje” ganhou diversidade

O item de descoberta procura primeiro uma categoria e um tipo diferentes dos itens já escolhidos.

## Resultados depois das correções

Exemplos observados na validação:

- iniciante + casa + até 15 min → “Força geral com apoio de cadeira” como exercício principal;
- intermediário + academia + mais de 45 min → “Sessão geral na academia” como exercício principal;
- experiente + ar livre + 30–45 min → “Caminhada em ritmo confortável” como exercício principal;
- usuário recorrente de marmitas → conteúdos de marmita e organização alimentar passam a dominar a experiência;
- usuário recorrente de exercícios → continuidade e exercícios relacionados passam à frente dos temas alimentares;
- perfil vegano → receitas e bebidas incompatíveis com o perfil alimentar não entram nas áreas recomendadas;
- lactose/glúten → conteúdos estruturados com esses conflitos são bloqueados das áreas principais.

## Regras de regressão automatizadas

A suíte `testes/validar-personalizacao.mjs` verifica:

- biblioteca com 80 conteúdos e IDs únicos;
- estágio correto do usuário;
- estabilidade da experiência para a mesma entrada;
- ausência de repetição entre as prateleiras dinâmicas da home;
- itens únicos na seleção semanal;
- nenhuma recomendação bloqueada nas áreas principais;
- prioridade para local e duração do exercício informado;
- compatibilidade com perfil alimentar;
- funcionamento das restrições estruturadas;
- experiências principais diferentes para perfis muito diferentes.

## Comando de validação

```bash
node --experimental-default-type=module testes/validar-personalizacao.mjs
```

Resultado esperado:

```text
Validação concluída: 7 cenários, 80 conteúdos, sem falhas.
```

## Estado da validação

A lógica do motor foi validada por simulação automatizada e corrigida com base nos conflitos encontrados. A validação visual com contas reais no Firebase continua sendo uma etapa separada e será feita quando retomarmos os testes de cadastro/login e uso do portal publicado.
