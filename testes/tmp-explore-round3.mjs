import fs from 'node:fs';
import { montarExperienciaHome, determinarEstagioUsuario } from '../js/experiencia.js';
const cat=JSON.parse(fs.readFileSync(new URL('../dados/conteudos-exemplo.json',import.meta.url),'utf8')).conteudos;
const id=x=>x?.id||x?.conteudo_id;
const ids=a=>(a||[]).filter(Boolean).map(id);
const core=e=>[id(e.hoje.exercicio),id(e.hoje.alimentacao),id(e.hoje.descoberta),...ids(e.secoes.personalized),...ids(e.secoes.exercise),...ids(e.secoes.recipe),...ids(e.secoes.juice),...ids(e.secoes.food)].filter(Boolean);
const jac=(a,b)=>{let A=new Set(a),B=new Set(b),i=[...A].filter(x=>B.has(x)).length,u=new Set([...A,...B]).size;return u?i/u:1};
const p={objetivos:['bem_estar','rotina_organizada'],nivel_exercicio:'iniciante',dias_exercicio:'3_4',duracao_treino:'15_30',local_exercicio:'casa',equipamentos:['nenhum'],perfil_alimentar:'variada',interesses_alimentares:['receitas_rapidas','sucos'],tempo_preparo:'ate_15',nivel_atividade:'algumas_vezes_semana'};
const base=montarExperienciaHome({usuarioId:'shift',profileData:p,catalogo:cat});
const ex=cat.filter(x=>x.tipo==='exercicio').slice(0,10);
const su=cat.filter(x=>x.categoria==='suco_detox').slice(0,10);
const behA={favoritos:ex.slice(0,4).map(x=>({conteudo_id:x.id})),historico:ex.slice(0,10).map(x=>({conteudo_id:x.id})),progresso:ex.slice(0,4).map((x,i)=>({conteudo_id:x.id,status:i<2?'em_andamento':'concluido',progresso:i<2?50:100})),buscas:[{termo:'exercicio casa mobilidade',contagem:5}]};
const a=montarExperienciaHome({usuarioId:'shift',profileData:p,catalogo:cat,...behA});
const behB={...behA,favoritos:[...behA.favoritos,...su.slice(0,6).map(x=>({conteudo_id:x.id}))],historico:[...su.slice(0,10).map(x=>({conteudo_id:x.id})),...behA.historico],buscas:[{termo:'suco frutas hortela',contagem:5},{termo:'exercicio casa mobilidade',contagem:1}]};
const b=montarExperienciaHome({usuarioId:'shift',profileData:p,catalogo:cat,...behB});
const micro=montarExperienciaHome({usuarioId:'shift',profileData:p,catalogo:cat,buscas:[{termo:'suco',contagem:1}]});
console.log('orders base/a/b',base.sectionOrder,a.sectionOrder,b.sectionOrder);
console.log('jac base micro',jac(core(base),core(micro)),'a->b',jac(core(a),core(b)));
console.log('top today', [id(base.hoje.descoberta),id(a.hoje.descoberta),id(b.hoje.descoberta)]);
for (const n of [0,1,3,5,10,20,40,60,75,79,80]){
 const prog=cat.slice(0,n).map(x=>({conteudo_id:x.id,status:'concluido',progresso:100}));
 const e=montarExperienciaHome({usuarioId:'exh'+n,profileData:p,catalogo:cat,progresso:prog});
 const c=core(e); const concluded=new Set(prog.map(id));
 console.log('done',n,'corelen',c.length,'concludedShown',c.filter(x=>concluded.has(x)).length,'week',e.semana.itens.length,'stage',e.estagio.id);
}
for(const h of [0,1,3,6,10,20]){
 const hist=cat.slice(0,h).map(x=>({conteudo_id:x.id}));
 const fav=cat.slice(0,Math.floor(h/4)).map(x=>({conteudo_id:x.id}));
 const prog=cat.slice(0,Math.floor(h/3)).map((x,i)=>({conteudo_id:x.id,status:i%2?'em_andamento':'concluido',progresso:i%2?50:100}));
 console.log(h,determine(hist,fav,prog));
}
function determine(h,f,p){return determinarEstagioUsuario({historico:h,favoritos:f,progresso:p,buscas:[]});}
