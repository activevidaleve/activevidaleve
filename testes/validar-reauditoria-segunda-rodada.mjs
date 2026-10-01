import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { montarExperienciaHome } from '../js/experiencia.js';
import { avaliarConteudo, normalizarPerfil } from '../js/personalizacao.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const catalogo = JSON.parse(fs.readFileSync(path.join(root, 'dados', 'conteudos-exemplo.json'), 'utf8')).conteudos;
const byId = new Map(catalogo.map((x) => [x.id, x]));
const id = (item) => String(item?.id || item?.conteudo_id || '');
const ids = (items = []) => items.filter(Boolean).map(id);
const avg = (v) => v.length ? v.reduce((a,b)=>a+b,0)/v.length : 0;
const pct = (n,d) => d ? n/d : 0;
const jaccard = (a,b) => {
  const A = new Set(a), B = new Set(b);
  if (!A.size && !B.size) return 1;
  let inter = 0; for (const x of A) if (B.has(x)) inter += 1;
  return inter / new Set([...A,...B]).size;
};
const core = (e) => ids([
  e.hoje.exercicio, e.hoje.alimentacao, e.hoje.descoberta,
  ...e.secoes.personalized, ...e.secoes.exercise, ...e.secoes.recipe,
  ...e.secoes.juice, ...e.secoes.food
]);
const top = (e) => ids([e.hoje.exercicio,e.hoje.alimentacao,e.hoje.descoberta,...e.secoes.personalized]);
const exerciseShelf = (e) => ids([e.hoje.exercicio,...e.secoes.exercise]);
const foodCore = (e) => ids([e.hoje.alimentacao,...e.secoes.recipe,...e.secoes.juice,...e.secoes.food]);
const categorySignature = (list) => list.map((contentId) => {
  const item = byId.get(contentId); return item ? `${item.tipo}:${item.categoria}` : '';
}).filter(Boolean);
const typeSignature = (list) => list.map((contentId) => {
  const item = byId.get(contentId); return item ? (item.categoria === 'suco_detox' ? 'suco_detox' : item.tipo) : '';
}).filter(Boolean);

let state = 0x5EEDBEEF;
const rnd = () => {
  state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
  return (state >>> 0) / 4294967296;
};
const pick = (arr) => arr[Math.floor(rnd()*arr.length)];
const sample = (arr,n) => {
  const out=[...arr];
  for(let i=out.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
  return out.slice(0,n);
};

const objetivos=['movimentar_mais','melhorar_condicionamento','constancia_exercicios','organizar_alimentacao','receitas_praticas','variar_refeicoes','rotina_organizada','bem_estar'];
const niveis=['iniciante','intermediario','experiente'];
const duracoes=['ate_15','15_30','30_45','mais_45'];
const locais=['casa','academia','ar_livre','variado'];
const equipamentos=[['nenhum'],['halteres'],['elasticos'],['colchonete'],['academia'],['halteres','academia']];
const perfis=['variada','vegetariana','vegana'];
const interesses=['cafe_manha','almoco','jantar','lanches','sucos','receitas_rapidas','marmitas'];
const preparos=['ate_15','15_30','30_60','mais_60'];
const atividades=['pouco_ativo','algumas_vezes_semana','ativo_frequente','muito_ativo'];
const dias=['1_2','3_4','5_mais'];
const gerarPerfil = () => ({
  objetivos: sample(objetivos, 1 + Math.floor(rnd()*3)),
  nivel_exercicio: pick(niveis), duracao_treino: pick(duracoes), local_exercicio: pick(locais),
  equipamentos: pick(equipamentos), perfil_alimentar: pick(perfis),
  interesses_alimentares: sample(interesses,1+Math.floor(rnd()*3)), tempo_preparo: pick(preparos),
  nivel_atividade: pick(atividades), dias_exercicio: pick(dias), altura: 150 + Math.floor(rnd()*45), peso: 45 + Math.floor(rnd()*50)
});

assert.equal(catalogo.length,80,'A reauditoria pressupõe 80 conteúdos.');
assert.equal(new Set(catalogo.map(id)).size,80,'IDs do catálogo precisam ser únicos.');

const perfisTeste = Array.from({length:1000}, gerarPerfil);

// A) Mesma conta + mesma entrada não pode mudar apenas porque virou o dia.
const RealDate = globalThis.Date;
const fixarData = (iso) => {
  const fixed = new RealDate(iso);
  globalThis.Date = class extends RealDate {
    constructor(...args){ super(...(args.length ? args : [fixed.getTime()])); }
    static now(){ return fixed.getTime(); }
  };
};
let diaEstavel=0, roteiroMesmaSemanaEstavel=0, semanaMudou=0;
for(let i=0;i<500;i++){
  const perfil=perfisTeste[i]; const uid=`dia_${i}`;
  fixarData('2026-10-01T12:00:00-03:00'); const d1=montarExperienciaHome({usuarioId:uid,profileData:perfil,catalogo});
  fixarData('2026-10-02T12:00:00-03:00'); const d2=montarExperienciaHome({usuarioId:uid,profileData:perfil,catalogo});
  fixarData('2026-10-08T12:00:00-03:00'); const d8=montarExperienciaHome({usuarioId:uid,profileData:perfil,catalogo});
  if (JSON.stringify(core(d1))===JSON.stringify(core(d2))) diaEstavel += 1;
  if (d1.semana.id === d2.semana.id && JSON.stringify(d1.semana.ids)===JSON.stringify(d2.semana.ids)) roteiroMesmaSemanaEstavel += 1;
  if (d1.semana.id !== d8.semana.id && JSON.stringify(d1.semana.ids)!==JSON.stringify(d8.semana.ids)) semanaMudou += 1;
}
globalThis.Date = RealDate;

// B) Mesmo cadastro / UIDs distintos: IDs podem variar, mas tema e categoria devem permanecer coerentes.
const uidId=[],uidCat=[],uidType=[];
for(let i=0;i<1000;i++){
  const perfil=perfisTeste[i];
  const a=montarExperienciaHome({usuarioId:`uidA_${i}`,profileData:perfil,catalogo});
  const b=montarExperienciaHome({usuarioId:`uidB_${i}`,profileData:perfil,catalogo});
  const A=top(a),B=top(b);
  uidId.push(jaccard(A,B)); uidCat.push(jaccard(categorySignature(A),categorySignature(B))); uidType.push(jaccard(typeSignature(A),typeSignature(B)));
}

// C) Campos do cadastro: nivel_atividade e dias_exercicio precisam ter efeito real, porém só em exercício.
let atividadeMudou=0,diasMudou=0,atividadeFoodEstavel=0,diasFoodEstavel=0,atividadeFoodPrincipalEstavel=0,diasFoodPrincipalEstavel=0;
for(let i=0;i<350;i++){
  const base={...perfisTeste[i], nivel_atividade:'pouco_ativo', dias_exercicio:'1_2'};
  const low=montarExperienciaHome({usuarioId:`campo_${i}`,profileData:base,catalogo});
  const high=montarExperienciaHome({usuarioId:`campo_${i}`,profileData:{...base,nivel_atividade:'muito_ativo'},catalogo});
  const many=montarExperienciaHome({usuarioId:`campo_${i}`,profileData:{...base,dias_exercicio:'5_mais'},catalogo});
  if (JSON.stringify(exerciseShelf(low))!==JSON.stringify(exerciseShelf(high))) atividadeMudou += 1;
  if (JSON.stringify(exerciseShelf(low))!==JSON.stringify(exerciseShelf(many))) diasMudou += 1;
  if (JSON.stringify(foodCore(low))===JSON.stringify(foodCore(high))) atividadeFoodEstavel += 1;
  if (JSON.stringify(foodCore(low))===JSON.stringify(foodCore(many))) diasFoodEstavel += 1;
  if (id(low.hoje.alimentacao)===id(high.hoje.alimentacao)) atividadeFoodPrincipalEstavel += 1;
  if (id(low.hoje.alimentacao)===id(many.hoje.alimentacao)) diasFoodPrincipalEstavel += 1;
}

// D) Altura/peso são dados de perfil, mas não devem dirigir ranking de conteúdo.
let corpoNeutro=0, idadeNeutra=0;
for(let i=0;i<200;i++){
  const p={...perfisTeste[i]};
  const a=montarExperienciaHome({usuarioId:`corpo_${i}`,profileData:{...p,altura:130,peso:35},catalogo});
  const b=montarExperienciaHome({usuarioId:`corpo_${i}`,profileData:{...p,altura:210,peso:140},catalogo});
  const jovem=montarExperienciaHome({usuarioId:`idade_${i}`,profileData:{...p,data_nascimento:'2011-05-10'},catalogo});
  const adulto=montarExperienciaHome({usuarioId:`idade_${i}`,profileData:{...p,data_nascimento:'1990-05-10'},catalogo});
  if (JSON.stringify(core(a))===JSON.stringify(core(b))) corpoNeutro += 1;
  if (JSON.stringify(core(jovem))===JSON.stringify(core(adulto))) idadeNeutra += 1;
}

// E) Catálogo em outra ordem não pode mudar a experiência.
let ordemCatalogoEstavel=0;
for(let i=0;i<200;i++){
  const p=perfisTeste[i];
  const original=montarExperienciaHome({usuarioId:`ordem_${i}`,profileData:p,catalogo});
  const shuffled=[...catalogo];
  for(let k=shuffled.length-1;k>0;k--){const j=(i*37+k*17)% (k+1);[shuffled[k],shuffled[j]]=[shuffled[j],shuffled[k]];}
  const reordenado=montarExperienciaHome({usuarioId:`ordem_${i}`,profileData:p,catalogo:shuffled});
  if(JSON.stringify(core(original))===JSON.stringify(core(reordenado))) ordemCatalogoEstavel += 1;
}

// F) Histórico antigo incompatível não pode vencer o perfil atual.
const gym = catalogo.filter((x)=>x.tipo==='exercicio' && ((x.publico?.equipamentos||[]).includes('academia') || (x.publico?.equipamentos||[]).includes('halteres')));
const animal = catalogo.filter((x)=>x.tipo==='receita' && !(x.publico?.perfis_alimentares||[]).includes('vegana'));
let perfilAtualVenceu=0,veganoProtegido=0;
for(let i=0;i<180;i++){
  const p={...perfisTeste[i],nivel_exercicio:'iniciante',duracao_treino:'ate_15',local_exercicio:'casa',equipamentos:['nenhum'],perfil_alimentar:'vegana',tempo_preparo:'ate_15'};
  const comportamento={
    favoritos:gym.slice(0,4).map(x=>({conteudo_id:x.id})),
    historico:gym.slice(0,10).map(x=>({conteudo_id:x.id})),
    progresso:gym.slice(0,4).map((x,k)=>({conteudo_id:x.id,status:k<2?'em_andamento':'concluido',progresso:k<2?60:100})),
    buscas:[{termo:'academia halteres força',contagem:5}]
  };
  const exp=montarExperienciaHome({usuarioId:`stale_${i}`,profileData:p,catalogo,...comportamento});
  const ex=exp.hoje.exercicio;
  const locaisItem=ex?.publico?.locais||[], eq=ex?.publico?.equipamentos||[];
  if (ex && (locaisItem.includes('casa')||locaisItem.includes('variado')) && eq.includes('nenhum')) perfilAtualVenceu += 1;

  const comportamentoFood={favoritos:animal.slice(0,6).map(x=>({conteudo_id:x.id})),historico:animal.slice(0,10).map(x=>({conteudo_id:x.id})),buscas:[{termo:'frango queijo leite',contagem:5}]};
  const expFood=montarExperienciaHome({usuarioId:`stale_food_${i}`,profileData:p,catalogo,...comportamentoFood});
  const visible=[expFood.hoje.alimentacao,expFood.hoje.descoberta,...expFood.secoes.personalized,...expFood.secoes.recipe,...expFood.secoes.juice,...expFood.secoes.food].filter(Boolean);
  if (visible.every((x)=>!avaliarConteudo(x,p).bloqueado)) veganoProtegido += 1;
}

// G) Dados incompletos/inesperados não podem quebrar a home.
const casosRobustos=[
  {},
  {objetivos:[],interesses_alimentares:[],equipamentos:[]},
  {nivel_exercicio:'desconhecido',duracao_treino:'',local_exercicio:null,equipamentos:'nenhum'},
  {objetivos:'bem_estar;rotina_organizada',interesses_alimentares:'sucos,marmitas',restricoes_alimentares:'',exercicios_evitar:''},
  {nivel_atividade:'pouco_ativo',dias_exercicio:'1_2',perfil_alimentar:'outra',tempo_preparo:'mais_60'}
];
let robustos=0;
for(let i=0;i<casosRobustos.length;i++){
  const exp=montarExperienciaHome({usuarioId:`robusto_${i}`,profileData:casosRobustos[i],catalogo});
  if(exp.hoje.exercicio && exp.hoje.alimentacao && exp.secoes.personalized.length===4) robustos += 1;
}

// H) Taxonomia: valores principais do cadastro são reconhecidos.
const perfilNormalizado = normalizarPerfil({nivel_atividade:'algumas_vezes_semana',dias_exercicio:'3_4'});
assert.equal(perfilNormalizado.nivel_atividade,'algumas_vezes_semana');
assert.equal(perfilNormalizado.dias_exercicio,'3_4');

const metricas={
  versao:'v40', conteudos:catalogo.length,
  estabilidade_diaria:{amostras:500,core_identico:pct(diaEstavel,500),roteiro_mesma_semana_identico:pct(roteiroMesmaSemanaEstavel,500),roteiro_renovou_semana_seguinte:pct(semanaMudou,500)},
  mesmo_cadastro_uids_diferentes:{amostras:1000,jaccard_ids:avg(uidId),jaccard_categorias:avg(uidCat),jaccard_tipos:avg(uidType)},
  campos_cadastro:{amostras:350,nivel_atividade_alterou_exercicios:pct(atividadeMudou,350),dias_exercicio_alterou_exercicios:pct(diasMudou,350),alimentacao_estavel_ao_mudar_nivel_atividade:pct(atividadeFoodEstavel,350),alimentacao_estavel_ao_mudar_dias:pct(diasFoodEstavel,350),alimentacao_principal_estavel_nivel_atividade:pct(atividadeFoodPrincipalEstavel,350),alimentacao_principal_estavel_dias:pct(diasFoodPrincipalEstavel,350)},
  dados_corporais_neutros:{amostras:200,altura_peso_nao_alteram_ranking:pct(corpoNeutro,200),data_nascimento_nao_altera_ranking:pct(idadeNeutra,200)},
  invariancia_ordem_catalogo:{amostras:200,taxa:pct(ordemCatalogoEstavel,200)},
  perfil_atual_vs_historico_antigo:{amostras:180,exercicio_atual_vence_historico_academia:pct(perfilAtualVenceu,180),perfil_vegano_permanece_protegido:pct(veganoProtegido,180)},
  robustez_entrada:{casos:casosRobustos.length,aprovados:robustos}
};

// Critérios independentes da segunda verificação.
assert.equal(metricas.estabilidade_diaria.core_identico,1,'A experiência principal não pode mudar só porque virou o dia.');
assert.equal(metricas.estabilidade_diaria.roteiro_mesma_semana_identico,1,'O roteiro não pode mudar dentro da mesma semana sem alteração de dados.');
assert.ok(metricas.estabilidade_diaria.roteiro_renovou_semana_seguinte>=0.90,'O roteiro semanal deveria renovar na semana seguinte para a maioria das contas.');
assert.ok(metricas.mesmo_cadastro_uids_diferentes.jaccard_ids>=0.40 && metricas.mesmo_cadastro_uids_diferentes.jaccard_ids<=0.70,'Variação por UID está fraca demais ou forte demais.');
assert.ok(metricas.mesmo_cadastro_uids_diferentes.jaccard_categorias>=0.75,'Contas com o mesmo cadastro perderam coerência semântica.');
assert.ok(metricas.mesmo_cadastro_uids_diferentes.jaccard_tipos>=0.95,'Contas equivalentes deveriam manter a composição temática geral.');
assert.ok(metricas.campos_cadastro.nivel_atividade_alterou_exercicios>=0.45,'nivel_atividade ainda quase não influencia a experiência de exercícios.');
assert.ok(metricas.campos_cadastro.dias_exercicio_alterou_exercicios>=0.35,'dias_exercicio ainda quase não influencia a experiência de exercícios.');
assert.ok(metricas.campos_cadastro.alimentacao_estavel_ao_mudar_nivel_atividade>=0.95,'nivel_atividade está vazando demais para a composição alimentar.');
assert.ok(metricas.campos_cadastro.alimentacao_estavel_ao_mudar_dias>=0.95,'dias_exercicio está vazando demais para a composição alimentar.');
assert.equal(metricas.campos_cadastro.alimentacao_principal_estavel_nivel_atividade,1,'nivel_atividade não deve trocar a recomendação alimentar principal.');
assert.equal(metricas.campos_cadastro.alimentacao_principal_estavel_dias,1,'dias_exercicio não deve trocar a recomendação alimentar principal.');
assert.equal(metricas.dados_corporais_neutros.altura_peso_nao_alteram_ranking,1,'Altura/peso não devem dirigir o ranking automático.');
assert.equal(metricas.dados_corporais_neutros.data_nascimento_nao_altera_ranking,1,'Data de nascimento não deve dirigir automaticamente conteúdo corporal, dieta ou intensidade.');
assert.equal(metricas.invariancia_ordem_catalogo.taxa,1,'A ordem física do JSON não pode decidir recomendações.');
assert.ok(metricas.perfil_atual_vs_historico_antigo.exercicio_atual_vence_historico_academia>=0.98,'Histórico antigo incompatível está vencendo o perfil atual de exercício.');
assert.equal(metricas.perfil_atual_vs_historico_antigo.perfil_vegano_permanece_protegido,1,'Histórico antigo não pode reintroduzir conteúdo bloqueado pelo perfil alimentar.');
assert.equal(metricas.robustez_entrada.aprovados,metricas.robustez_entrada.casos,'Entradas incompletas causaram falha estrutural.');

fs.writeFileSync(path.join(root,'relatorios','metricas-reauditoria-v40.json'),JSON.stringify(metricas,null,2));
console.log('REAUDITORIA DA SEGUNDA RODADA — APROVADA');
console.log(JSON.stringify(metricas,null,2));
