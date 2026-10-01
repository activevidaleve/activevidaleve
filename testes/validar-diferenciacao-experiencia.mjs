import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { montarExperienciaHome } from '../js/experiencia.js';
import { personalizarConteudos, avaliarConteudo } from '../js/personalizacao.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const catalogo = JSON.parse(fs.readFileSync(path.join(root, 'dados', 'conteudos-exemplo.json'), 'utf8')).conteudos;

const id = (item) => item?.id || item?.conteudo_id || '';
const ids = (items = []) => items.filter(Boolean).map(id);
const setJaccard = (left = [], right = []) => {
  const a = new Set(left); const b = new Set(right);
  if (!a.size && !b.size) return 1;
  let inter = 0; for (const value of a) if (b.has(value)) inter += 1;
  return inter / new Set([...a, ...b]).size;
};
const average = (values) => values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0;
const percentile = (values, p) => {
  if (!values.length) return 0;
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.min(sorted.length-1, Math.max(0, Math.floor((sorted.length-1)*p)))];
};
const topSignature = (exp) => ids([
  exp.hoje.exercicio, exp.hoje.alimentacao, exp.hoje.descoberta,
  ...exp.secoes.personalized
]);
const shelfSignature = (exp, key) => ids(exp.secoes[key] || []);
const visibleSignature = (exp) => ids([
  exp.hoje.exercicio, exp.hoje.alimentacao, exp.hoje.descoberta,
  ...exp.secoes.personalized,
  ...exp.secoes.exercise,
  ...exp.secoes.recipe,
  ...exp.secoes.juice,
  ...exp.secoes.food
]);
const mainItems = (exp) => [
  exp.hoje.exercicio, exp.hoje.alimentacao, exp.hoje.descoberta,
  ...exp.secoes.personalized,
  ...exp.secoes.exercise,
  ...exp.secoes.recipe,
  ...exp.secoes.juice,
  ...exp.secoes.food,
  ...exp.semana.itens
].filter(Boolean);
const themeOrder = (exp) => exp.sectionOrder.filter((x) => ['exercise','recipe','juice','food'].includes(x));
const themePosition = (exp, key) => themeOrder(exp).indexOf(key);
const countThemeTop = (exp, theme) => topSignature(exp).map(x=>catalogoById.get(x)).filter(Boolean).filter((item)=>{
  if (theme==='exercise') return item.tipo==='exercicio';
  if (theme==='recipe') return item.tipo==='receita' && item.categoria!=='suco_detox';
  if (theme==='juice') return item.categoria==='suco_detox';
  if (theme==='food') return item.tipo==='alimentacao' || item.categoria==='marmitas';
  return false;
}).length;

const catalogoById = new Map(catalogo.map((item)=>[item.id,item]));
const select = (pred, limit=10) => catalogo.filter(pred).slice(0,limit);
const exerciseItems = select((x)=>x.tipo==='exercicio',10);
const recipeItems = select((x)=>x.tipo==='receita' && x.categoria!=='suco_detox',10);
const juiceItems = select((x)=>x.categoria==='suco_detox',10);
const marmitaItems = select((x)=>x.categoria==='marmitas' || (x.publico?.interesses||[]).includes('marmitas'),10);

const makeHeavy = (items, termo) => ({
  favoritos: items.slice(0,4).map((x)=>({conteudo_id:x.id})),
  historico: items.slice(0,9).map((x)=>({conteudo_id:x.id})),
  progresso: items.slice(0,5).map((x,index)=>({conteudo_id:x.id,status:index<2?'em_andamento':'concluido',progresso:index<2?55:100})),
  buscas: [{termo,contagem:5},{termo,contagem:3}]
});
const makeMicro = (items, termo) => ({
  favoritos: items.slice(0,1).map((x)=>({conteudo_id:x.id})),
  historico: items.slice(0,1).map((x)=>({conteudo_id:x.id})),
  progresso: [],
  buscas: [{termo,contagem:1}]
});
const behaviors = {
  exercise: { heavy: makeHeavy(exerciseItems,'força mobilidade exercícios'), micro: makeMicro(exerciseItems,'exercícios') },
  recipe: { heavy: makeHeavy(recipeItems,'receita rápida jantar'), micro: makeMicro(recipeItems,'receita') },
  juice: { heavy: makeHeavy(juiceItems,'sucos frutas'), micro: makeMicro(juiceItems,'sucos') },
  food: { heavy: makeHeavy(marmitaItems,'marmita almoço rápido'), micro: makeMicro(marmitaItems,'marmita') }
};

const levels=['iniciante','intermediario','experiente'];
const durations=['ate_15','15_30','30_45','mais_45'];
const locations=['casa','academia','ar_livre','variado'];
const equipmentSets=[['nenhum'],['halteres'],['academia'],['elasticos']];
const foodProfiles=['variada','vegetariana','vegana'];
const prepTimes=['ate_15','15_30','30_60','mais_60'];
const goalArchetypes=[
  ['movimentar_mais','constancia_exercicios'],
  ['melhorar_condicionamento','bem_estar'],
  ['organizar_alimentacao','receitas_praticas'],
  ['variar_refeicoes','rotina_organizada']
];
const interestArchetypes=[
  ['receitas_rapidas'],
  ['marmitas','almoco'],
  ['sucos','lanches'],
  ['cafe_manha','jantar']
];

const profiles=[]; let seq=0;
for (const nivel_exercicio of levels)
for (const duracao_treino of durations)
for (const local_exercicio of locations)
for (const equipamentos of equipmentSets)
for (const perfil_alimentar of foodProfiles)
for (const tempo_preparo of prepTimes) {
  const archetype = seq % 4; seq += 1;
  profiles.push({
    nivel_exercicio,duracao_treino,local_exercicio,equipamentos,perfil_alimentar,tempo_preparo,
    objetivos: goalArchetypes[archetype],
    interesses_alimentares: interestArchetypes[archetype]
  });
}
assert.equal(profiles.length,2304);

const neutralExperiences=[];
const topSignatureCounts=new Map();
const fullSignatureCounts=new Map();
const todayCounts={exercise:new Map(),food:new Map(),discovery:new Map()};
const visibleCoverage=new Set();
const sectionOrders=new Set();
const addCount=(map,key)=>map.set(key,(map.get(key)||0)+1);

for(let i=0;i<profiles.length;i+=1){
  const profile=profiles[i];
  const personalized=personalizarConteudos(catalogo,profile);
  const exp=montarExperienciaHome({usuarioId:`cohort_${i}`,profileData:profile,catalogo:personalized});
  neutralExperiences.push({profile,personalized,exp});
  const sig=topSignature(exp).join('|');
  topSignatureCounts.set(sig,(topSignatureCounts.get(sig)||0)+1);
  const fullSig=[
    ...visibleSignature(exp),
    ...exp.semana.ids,
    ...themeOrder(exp),
    exp.estagio.id,
    exp.textos.heroEyebrow
  ].join('|');
  fullSignatureCounts.set(fullSig,(fullSignatureCounts.get(fullSig)||0)+1);
  addCount(todayCounts.exercise,id(exp.hoje.exercicio));
  addCount(todayCounts.food,id(exp.hoje.alimentacao));
  addCount(todayCounts.discovery,id(exp.hoje.descoberta));
  const visibleIds=visibleSignature(exp);
  visibleIds.forEach((x)=>visibleCoverage.add(x));
  assert.equal(new Set(visibleIds).size,visibleIds.length,`Experiência neutra ${i}: conteúdo repetido entre vitrines dinâmicas.`);
  assert.equal(exp.semana.ids.length,4,`Experiência neutra ${i}: seleção semanal deve ter quatro itens.`);
  assert.equal(new Set(exp.semana.ids).size,4,`Experiência neutra ${i}: seleção semanal repetiu item.`);
  for(const key of ['personalized','exercise','recipe','juice','food']) assert.equal(exp.secoes[key].length,4,`Experiência neutra ${i}: seção ${key} incompleta.`);
  assert.equal(themeOrder(exp).length,4,`Experiência neutra ${i}: ordem temática incompleta.`);
  assert.equal(new Set(themeOrder(exp)).size,4,`Experiência neutra ${i}: ordem temática duplicada.`);
  sectionOrders.add(themeOrder(exp).join('|'));
  for(const item of mainItems(exp)) assert.equal(avaliarConteudo(item,profile).bloqueado,false,`Conteúdo bloqueado entrou na experiência neutra: ${item.id}`);
}

const concentration=(map)=>{
  const counts=[...map.values()].sort((a,b)=>b-a); const total=counts.reduce((a,b)=>a+b,0);
  return {unique:map.size,top1_share:counts[0]/total,top5_share:counts.slice(0,5).reduce((a,b)=>a+b,0)/total,top10_share:counts.slice(0,10).reduce((a,b)=>a+b,0)/total};
};

// Mesmo perfil, IDs diferentes: individualização controlada.
const uidSimilarities=[]; let uidExact=0; const uidSamples=profiles.length;
for(let s=0;s<uidSamples;s+=1){
  const index=s; const {profile,personalized}=neutralExperiences[index];
  const a=montarExperienciaHome({usuarioId:`uidA_${s}`,profileData:profile,catalogo:personalized});
  const b=montarExperienciaHome({usuarioId:`uidB_${s}`,profileData:profile,catalogo:personalized});
  const j=setJaccard(topSignature(a),topSignature(b)); uidSimilarities.push(j); if(j===1)uidExact+=1;
}

// Comportamento: micro deve mexer menos que histórico forte; histórico forte deve mover o tema-alvo.
const behaviorStats={};
const behaviorSamples=256;
for(const [theme,variants] of Object.entries(behaviors)){
  const key=theme; const microSims=[],heavySims=[]; let heavyExact=0; let microExact=0; let themePositionImprovedOrTop=0; let targetCountImprovedOrEqual=0; let safetyChecks=0; let concludedLeak=0;
  for(let s=0;s<behaviorSamples;s+=1){
    const index=(s*4)%profiles.length; const {profile,personalized}=neutralExperiences[index];
    const base=montarExperienciaHome({usuarioId:`beh_${theme}_${s}`,profileData:profile,catalogo:personalized});
    const micro=montarExperienciaHome({usuarioId:`beh_${theme}_${s}`,profileData:profile,catalogo:personalized,...variants.micro});
    const heavy=montarExperienciaHome({usuarioId:`beh_${theme}_${s}`,profileData:profile,catalogo:personalized,...variants.heavy});
    const jm=setJaccard(topSignature(base),topSignature(micro)); const jh=setJaccard(topSignature(base),topSignature(heavy));
    microSims.push(jm); heavySims.push(jh); if(jm===1)microExact+=1; if(jh===1)heavyExact+=1;
    const posBase=themePosition(base,key), posHeavy=themePosition(heavy,key);
    if(posBase===0 || posHeavy<=posBase) themePositionImprovedOrTop+=1;
    if(countThemeTop(heavy,key)>=countThemeTop(base,key)) targetCountImprovedOrEqual+=1;
    const concludedIds=new Set((variants.heavy.progresso||[]).filter((x)=>x.status==='concluido').map((x)=>x.conteudo_id));
    for(const item of mainItems(heavy)){
      assert.equal(avaliarConteudo(item,profile).bloqueado,false,`Comportamento ${theme} reintroduziu bloqueado: ${item.id}`);
      if(concludedIds.has(item.id)) concludedLeak+=1;
      safetyChecks+=1;
    }
  }
  behaviorStats[theme]={
    micro_avg_jaccard:average(microSims),heavy_avg_jaccard:average(heavySims),
    micro_p10:percentile(microSims,.1),heavy_p90:percentile(heavySims,.9),
    micro_exact:microExact,heavy_exact:heavyExact,
    theme_position_improved_or_already_top:themePositionImprovedOrTop/behaviorSamples,
    target_count_improved_or_equal:targetCountImprovedOrEqual/behaviorSamples,
    concluded_leak:concludedLeak,
    safety_checks:safetyChecks
  };
}

// Perfis próximos vs perfis distantes.
const nearSims=[],farSims=[]; const pairSamples=320;
const next=(arr,value)=>arr[(arr.indexOf(value)+1)%arr.length];
for(let s=0;s<pairSamples;s+=1){
  const index=(s*3)%profiles.length; const p=profiles[index];
  const near={...p,duracao_treino:next(durations,p.duracao_treino)};
  const far={
    ...p,
    nivel_exercicio:levels[(levels.indexOf(p.nivel_exercicio)+2)%levels.length],
    duracao_treino:durations[(durations.indexOf(p.duracao_treino)+2)%durations.length],
    local_exercicio:locations[(locations.indexOf(p.local_exercicio)+2)%locations.length],
    equipamentos: p.equipamentos.includes('nenhum')?['academia']:['nenhum'],
    perfil_alimentar:p.perfil_alimentar==='vegana'?'variada':'vegana',
    tempo_preparo:prepTimes[(prepTimes.indexOf(p.tempo_preparo)+2)%prepTimes.length],
    objetivos:p.objetivos.some(x=>x==='movimentar_mais')?goalArchetypes[2]:goalArchetypes[0],
    interesses_alimentares:p.interesses_alimentares.includes('sucos')?interestArchetypes[1]:interestArchetypes[2]
  };
  const baseP=personalizarConteudos(catalogo,p);
  const a=montarExperienciaHome({usuarioId:`pair_${s}`,profileData:p,catalogo:baseP});
  const b=montarExperienciaHome({usuarioId:`pair_${s}`,profileData:near,catalogo:personalizarConteudos(catalogo,near)});
  const c=montarExperienciaHome({usuarioId:`pair_${s}`,profileData:far,catalogo:personalizarConteudos(catalogo,far)});
  nearSims.push(setJaccard(topSignature(a),topSignature(b)));
  farSims.push(setJaccard(topSignature(a),topSignature(c)));
}

// Isolamento de domínio: mudar treino não deve bagunçar alimentação; mudar alimentação não deve bagunçar exercício.
let foodStable=0,exerciseStable=0; const isolationSamples=256;
for(let s=0;s<isolationSamples;s+=1){
  const index=(s*5)%profiles.length; const p=profiles[index];
  const exerciseChanged={...p,nivel_exercicio:next(levels,p.nivel_exercicio),duracao_treino:next(durations,p.duracao_treino),local_exercicio:next(locations,p.local_exercicio)};
  const foodChanged={...p,perfil_alimentar:p.perfil_alimentar==='vegana'?'vegetariana':'vegana',tempo_preparo:next(prepTimes,p.tempo_preparo),interesses_alimentares:interestArchetypes[(s+1)%4]};
  const base=montarExperienciaHome({usuarioId:`iso_${s}`,profileData:p,catalogo:personalizarConteudos(catalogo,p)});
  const ex=montarExperienciaHome({usuarioId:`iso_${s}`,profileData:exerciseChanged,catalogo:personalizarConteudos(catalogo,exerciseChanged)});
  const food=montarExperienciaHome({usuarioId:`iso_${s}`,profileData:foodChanged,catalogo:personalizarConteudos(catalogo,foodChanged)});
  if(id(base.hoje.alimentacao)===id(ex.hoje.alimentacao)) foodStable+=1;
  if(id(base.hoje.exercicio)===id(food.hoje.exercicio)) exerciseStable+=1;
}

// Comportamento nunca pode superar bloqueios de segurança/perfil.
{
  const perfilRestrito={
    objetivos:['movimentar_mais','organizar_alimentacao'],
    nivel_exercicio:'iniciante',
    duracao_treino:'15_30',
    local_exercicio:'casa',
    equipamentos:['nenhum'],
    perfil_alimentar:'vegana',
    interesses_alimentares:['receitas_rapidas','sucos'],
    tempo_preparo:'ate_15',
    restricoes_alimentares:'intolerância à lactose, doença celíaca, evitar leite e trigo',
    exercicios_evitar:'flexões e saltos'
  };
  const bloqueados=catalogo.filter((item)=>avaliarConteudo(item,perfilRestrito).bloqueado);
  assert.ok(bloqueados.length>=8,'Cenário hostil precisa de conteúdos bloqueados suficientes.');
  const interacoesHostis={
    favoritos:bloqueados.slice(0,8).map((x)=>({conteudo_id:x.id})),
    historico:bloqueados.slice(0,12).map((x)=>({conteudo_id:x.id})),
    progresso:bloqueados.slice(0,6).map((x)=>({conteudo_id:x.id,status:'em_andamento',progresso:80})),
    buscas:[{termo:'leite trigo flexões saltos',contagem:8}]
  };
  const exp=montarExperienciaHome({usuarioId:'restricao_hostil',profileData:perfilRestrito,catalogo:personalizarConteudos(catalogo,perfilRestrito),...interacoesHostis});
  const bloqueadosIds=new Set(bloqueados.map((x)=>x.id));
  const vazamento=mainItems(exp).filter((item)=>bloqueadosIds.has(item.id));
  assert.equal(vazamento.length,0,'Interações com conteúdos bloqueados não podem fazê-los reaparecer nas recomendações.');
}

// Estabilidade absoluta com entrada idêntica.
for(let s=0;s<128;s+=1){
  const index=(s*11)%profiles.length; const {profile,personalized}=neutralExperiences[index];
  const a=montarExperienciaHome({usuarioId:`stable_${s}`,profileData:profile,catalogo:personalized});
  const b=montarExperienciaHome({usuarioId:`stable_${s}`,profileData:profile,catalogo:personalized});
  assert.deepEqual(topSignature(a),topSignature(b),'Mesma conta/entrada precisa ser estável.');
  assert.deepEqual(a.sectionOrder,b.sectionOrder,'Ordem de seções deve ser estável para mesma entrada.');
  assert.deepEqual(a.semana.ids,b.semana.ids,'Seleção semanal deve ser estável para mesma entrada.');
}

const neutralSignatureUnique=topSignatureCounts.size;
const fullSignatureUnique=fullSignatureCounts.size;
const neutralExactCollisionRate=1-(neutralSignatureUnique/profiles.length);
const concExercise=concentration(todayCounts.exercise), concFood=concentration(todayCounts.food), concDiscovery=concentration(todayCounts.discovery);
const nearAvg=average(nearSims),farAvg=average(farSims);

// Critérios quantitativos da rodada 2.
assert.ok(neutralSignatureUnique/profiles.length>=0.85,`Pouca individualização no topo: apenas ${neutralSignatureUnique}/${profiles.length} assinaturas únicas.`);
assert.ok(fullSignatureUnique/profiles.length>=0.97,`Pouca individualização na composição completa: ${fullSignatureUnique}/${profiles.length}.`);
assert.ok(uidExact/uidSamples<=0.05,`Muitas contas distintas ficaram idênticas com o mesmo perfil: ${uidExact}/${uidSamples}.`);
assert.ok(average(uidSimilarities)>=0.35 && average(uidSimilarities)<=0.65,'Individualização por conta está caótica ou fraca demais.');
assert.ok(concExercise.unique>=15,'Poucos exercícios chegam ao destaque principal.');
assert.ok(concFood.unique>=30,`Poucos conteúdos alimentares chegam ao destaque principal (${concFood.unique}).`);
assert.ok(concDiscovery.unique>=25,`Poucas descobertas diferentes chegam ao destaque (${concDiscovery.unique}).`);
assert.ok(concFood.top1_share<=0.30,`Um único conteúdo alimentar domina ${(concFood.top1_share*100).toFixed(1)}% das contas.`);
assert.equal(visibleCoverage.size,catalogo.length,`Nem toda a biblioteca apareceu nas vitrines sintéticas: ${visibleCoverage.size}/${catalogo.length}.`);
assert.ok(nearAvg>=0.65,`Perfis próximos estão divergindo demais (${nearAvg.toFixed(3)}).`);
assert.ok(nearAvg>farAvg+0.35,`Perfis próximos não estão suficientemente mais parecidos que perfis distantes: ${nearAvg.toFixed(3)} vs ${farAvg.toFixed(3)}.`);
assert.ok(farAvg<0.20,`Perfis distantes continuam semelhantes demais (${farAvg.toFixed(3)}).`);
assert.ok(foodStable/isolationSamples>=0.95,'Mudanças apenas de exercício estão alterando demais a recomendação alimentar.');
assert.ok(exerciseStable/isolationSamples>=0.95,'Mudanças apenas alimentares estão alterando demais a recomendação de exercício.');
for(const [theme,stat] of Object.entries(behaviorStats)){
  assert.ok(stat.micro_avg_jaccard>=0.55,`${theme}: uma microinteração está mudando a home de forma excessiva.`);
  assert.ok(stat.heavy_avg_jaccard<0.60,`${theme}: comportamento forte quase não altera experiência.`);
  assert.ok(stat.micro_avg_jaccard>stat.heavy_avg_jaccard,`${theme}: microinteração deveria alterar menos que histórico forte.`);
  assert.ok(stat.theme_position_improved_or_already_top>=0.98,`${theme}: tema comportamental não sobe de prioridade com consistência.`);
  assert.ok(stat.target_count_improved_or_equal>=0.95,`${theme}: tema comportamental não ganha presença suficiente no topo.`);
  assert.equal(stat.concluded_leak,0,`${theme}: conteúdo concluído reapareceu em vitrines de novidade.`);
}

const report={
  versao:'v40',
  conteudos:catalogo.length,
  perfis_sinteticos:profiles.length,
  assinaturas_top_unicas:neutralSignatureUnique,
  taxa_assinaturas_unicas:neutralSignatureUnique/profiles.length,
  assinaturas_completas_unicas:fullSignatureUnique,
  taxa_assinaturas_completas_unicas:fullSignatureUnique/profiles.length,
  taxa_colisao_exata:neutralExactCollisionRate,
  ordens_tematicas_distintas:sectionOrders.size,
  cobertura_home_conteudos:visibleCoverage.size,
  destaque_principal:{exercicio:concExercise,alimentar:concFood,descoberta:concDiscovery},
  mesma_conta_mesma_entrada:'100% estável',
  mesmo_perfil_ids_diferentes:{amostras:uidSamples,jaccard_medio:average(uidSimilarities),p10:percentile(uidSimilarities,.1),p50:percentile(uidSimilarities,.5),p90:percentile(uidSimilarities,.9),experiencias_identicas:uidExact},
  comportamento:behaviorStats,
  perfis_proximos:{amostras:pairSamples,jaccard_medio:nearAvg,p10:percentile(nearSims,.1),p90:percentile(nearSims,.9)},
  perfis_distantes:{amostras:pairSamples,jaccard_medio:farAvg,p10:percentile(farSims,.1),p90:percentile(farSims,.9)},
  isolamento_dominios:{amostras:isolationSamples,alimentacao_estavel_ao_mudar_exercicio:foodStable/isolationSamples,exercicio_estavel_ao_mudar_alimentacao:exerciseStable/isolationSamples},
  validacoes_segurança:'todos os cards principais dos cenários comportamentais e neutros permaneceram não bloqueados'
};

fs.writeFileSync(path.join(root,'relatorios','metricas-diferenciacao-v40.json'),JSON.stringify(report,null,2));
console.log('Validação de diferenciação concluída sem falhas.');
console.log(JSON.stringify(report,null,2));
