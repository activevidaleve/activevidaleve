# Fechamento editorial e estrutural — Sucos Detox

## Escopo
Revisão final da seção Sucos Detox antes da produção das imagens.

## Resultado
- 20 receitas publicadas e com IDs únicos.
- 20 resumos editoriais próprios.
- 20 modos de preparo próprios, cada um com quatro etapas.
- Perfil de sabor e filtros por sabor adicionados.
- Cada receita possui uma orientação específica de ajuste ao paladar e uma variação simples.
- O termo “detox” permanece apenas como nome popular da seção e não é usado como promessa de limpeza do organismo.
- Cada receita possui espaço separado para foto dos ingredientes e foto do produto pronto.
- Alt text, legenda e brief de produção de imagem foram adicionados para os dois tipos de mídia.
- A ordenação personalizada do motor é preservada antes dos filtros manuais.

## Filtros disponíveis
- Todos
- Refrescantes
- Cítricos
- Frutados
- Verdes
- Com gengibre

## Campos de mídia preparados
- `midia.imagem_ingredientes_url`
- `midia.imagem_ingredientes_alt`
- `midia.legenda_ingredientes`
- `midia.brief_imagem_ingredientes`
- `midia.imagem_pronto_url`
- `midia.imagem_pronto_alt`
- `midia.legenda_pronto`
- `midia.brief_imagem_pronto`

## Validação
Executar:

```bash
node testes/validar-sucos-detox.mjs
```

Resultado esperado: `VALIDAÇÃO SUCOS DETOX — APROVADA`.
