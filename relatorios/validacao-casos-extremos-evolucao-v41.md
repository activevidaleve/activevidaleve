# Active Vida Leve — Terceira rodada de validação

## Escopo

Esta rodada valida casos extremos e a evolução da experiência ao longo do tempo. O objetivo foi verificar se o motor continua coerente quando a conta acumula meses de uso, altera preferências, muda de comportamento, conclui quase toda a biblioteca ou recebe novos conteúdos.

A validação foi executada sobre os 80 conteúdos da biblioteca atual e em conjunto com todas as baterias anteriores.

## Problemas encontrados e corrigidos

### 1. Biblioteca 100% concluída reaparecia como novidade

Quando todos os 80 conteúdos estavam marcados como concluídos, um fallback da home voltava a usar a lista geral para preencher recomendações. Isso podia fazer um conteúdo concluído aparecer novamente como se fosse novo.

Correção:
- conteúdos concluídos não voltam para as prateleiras de novidade;
- com 79 concluídos, aparece somente o único conteúdo ainda novo;
- com 80 concluídos, as recomendações de novidade ficam vazias;
- o portal mostra um estado específico de biblioteca explorada, mantendo acesso a concluídos e preferências.

### 2. Roteiro semanal persistido podia ficar desatualizado após mudança de perfil

O roteiro semanal era salvo por semana, mas não registrava quais preferências do usuário originaram aquela seleção. Uma alteração importante no perfil durante a semana podia manter um roteiro antigo.

Correção:
- cada roteiro recebe `assinatura_perfil`;
- a assinatura usa somente campos relevantes para personalização;
- altura, peso, data de nascimento e campos neutros não alteram a assinatura;
- se o perfil muda, o roteiro antigo deixa de ser reutilizado e uma nova seleção é calculada;
- a persistência do roteiro passou para `versao: 2`.

### 3. Cenários temporais eram difíceis de testar de forma determinística

`montarExperienciaHome` sempre dependia da data atual do ambiente. Isso dificultava testar viradas de semana e simulações de meses de uso.

Correção:
- a função aceita uma data opcional para testes;
- em produção, continua usando `new Date()` normalmente;
- foi validada a virada de domingo para segunda e a estabilidade dentro da mesma semana.

### 4. Prateleiras vazias poderiam permanecer visualmente abertas no fim da biblioteca

Ao restarem poucos conteúdos, algumas seções podiam continuar visíveis sem cards.

Correção:
- prateleiras sem itens são ocultadas;
- quando toda a biblioteca foi concluída, a home troca as vitrines de novidade por um estado próprio de biblioteca explorada.

## Validação longitudinal

Foram simuladas 120 contas durante 26 semanas consecutivas.

Cada conta:
- recebeu uma experiência semanal;
- explorou e concluiu conteúdos gradualmente;
- acumulou histórico, favoritos e buscas;
- passou pelos estágios de uso do portal;
- continuou recebendo novidades sem reintroduzir conteúdos concluídos.

Resultados:
- média de 63,14 conteúdos únicos apresentados por conta ao longo das 26 semanas;
- mínimo de 58;
- máximo de 66;
- 0 conteúdos concluídos reaparecendo como novidade;
- 0 regressões de estágio;
- 100% das contas chegaram ao estágio recorrente com o uso acumulado da simulação.

## Esgotamento progressivo da biblioteca

Foram testados cenários com 0, 20, 40, 60, 75, 79 e 80 conteúdos concluídos.

| Concluídos | Novidades exibidas no núcleo | Concluídos reaparecendo | Itens da semana | Biblioteca esgotada |
| ---: | ---: | ---: | ---: | --- |
| 0 | 23 | 0 | 4 | não |
| 20 | 19 | 0 | 4 | não |
| 40 | 14 | 0 | 4 | não |
| 60 | 10 | 0 | 4 | não |
| 75 | 5 | 0 | 4 | não |
| 79 | 1 | 0 | 1 | não |
| 80 | 0 | 0 | 0 | sim |

O motor agora prefere mostrar menos conteúdo a reapresentar um concluído como novidade.

## Mudança de comportamento

Foram feitas 180 comparações entre:
- experiência neutra;
- uma microinteração isolada;
- comportamento persistente em um tema;
- mudança persistente para outro tema.

Resultados:
- uma única busca preservou 98,52% da composição média da home;
- uma mudança comportamental persistente reduziu a sobreposição média para 45,96%;
- em 100% dos cenários de mudança clara de exercícios para sucos, a prioridade das seções também se inverteu.

Isso confirma que o portal não reage exageradamente a um clique isolado, mas se adapta quando o comportamento se torna consistente.

## Mudança de perfil após histórico antigo

Foram simuladas 150 contas com histórico forte de academia e halteres, seguidas por uma atualização para:
- iniciante;
- casa;
- até 15 minutos;
- nenhum equipamento.

Resultado:
- em 100% dos casos, o exercício principal respeitou o perfil atual.

O histórico antigo não vence uma preferência atual incompatível.

## Crescimento da biblioteca

Foi acrescentado um conteúdo sintético novo, altamente compatível com um perfil de controle.

Em 120 contas:
- o novo conteúdo apareceu no top 10 em 100% dos casos.

O motor consegue absorver novidades sem exigir alteração da lógica de personalização.

## Casos incompletos e atípicos

Foram testados 8 perfis com combinações como:
- perfil completamente vazio;
- listas vazias;
- valores desconhecidos;
- tipos inesperados em campos antigos;
- restrições em texto livre;
- combinações pouco usuais de atividade, duração e alimentação.

Resultado:
- 8 de 8 montaram uma experiência válida sem quebra estrutural.

## Calendário semanal

Foi validado que:
- domingo 04/10/2026 pertence a `2026-W40`;
- segunda 05/10/2026 inicia `2026-W41`;
- terça 06/10/2026 permanece em `2026-W41`;
- sem novos sinais, o roteiro permanece idêntico dentro da mesma semana.

## Regressões

Após as correções, foram executadas novamente todas as baterias anteriores:
- validação de personalização;
- diversidade da experiência;
- diferenciação da experiência;
- reauditoria da segunda rodada;
- casos extremos e evolução.

Todas foram aprovadas.

## Conclusão

A terceira rodada está aprovada para a biblioteca atual de 80 conteúdos.

O comportamento observado é o desejado:
- pequenas interações provocam pequenas mudanças;
- hábitos consistentes provocam mudanças maiores;
- o perfil atual vence sinais antigos incompatíveis;
- conteúdos concluídos dão espaço a novidades;
- a experiência continua válida quando a biblioteca está quase ou totalmente explorada;
- uma mudança real no perfil força a renovação do roteiro semanal;
- novos conteúdos conseguem entrar naturalmente no sistema.
