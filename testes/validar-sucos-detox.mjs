import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const catalogo = JSON.parse(fs.readFileSync(path.join(root, 'dados/conteudos-exemplo.json'), 'utf8')).conteudos;
const sucos = catalogo.filter((item) => item.categoria === 'suco_detox').sort((a,b)=>a.ordem-b.ordem);
const falhas = [];
const exigir = (condicao, mensagem) => { if (!condicao) falhas.push(mensagem); };

const titulosEsperados = [
  'Abacaxi com Limão e Hortelã',
  'Cenoura com Laranja e Gengibre',
  'Pepino com Maçã Verde e Limão',
  'Beterraba com Cenoura e Maçã',
  'Couve com Abacaxi e Limão',
  'Melancia com Hortelã',
  'Manga com Cúrcuma e Limão',
  'Morango com Banana e Aveia',
  'Laranja com Gengibre e Cenoura',
  'Kiwi com Hortelã e Limão',
  'Mamão com Laranja e Limão',
  'Maçã com Canela e Gengibre',
  'Abacaxi com Pepino e Hortelã',
  'Morango com Laranja e Chia',
  'Espinafre com Abacaxi e Gengibre',
  'Limão com Pepino e Gengibre',
  'Beterraba com Laranja e Gengibre',
  'Abacaxi com Manga e Limão',
  'Melancia com Pepino e Limão',
  'Couve com Maçã e Gengibre'
];

const pngSize = (filename) => {
  const buffer = fs.readFileSync(filename);
  const signature = buffer.subarray(0,8).toString('hex');
  if (signature !== '89504e470d0a1a0a') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};

exigir(sucos.length === 20, `Esperado 20 sucos; encontrados ${sucos.length}.`);
exigir(new Set(sucos.map((item) => item.id)).size === 20, 'IDs de Sucos Detox devem ser únicos.');
exigir(new Set(sucos.map((item) => item.resumo)).size === 20, 'Cada suco deve ter resumo editorial próprio.');
exigir(new Set(sucos.map((item) => JSON.stringify(item.preparo))).size === 20, 'Cada suco deve ter preparo editorial próprio.');
exigir(JSON.stringify(sucos.map(x=>x.titulo)) === JSON.stringify(titulosEsperados), 'Os 20 títulos devem corresponder exatamente ao quadro visual aprovado.');

for (const [index, suco] of sucos.entries()) {
  const numero = index + 1;
  exigir(Boolean(suco.perfil_sabor), `${suco.id}: perfil_sabor ausente.`);
  exigir(Array.isArray(suco.filtros_sabor) && suco.filtros_sabor.length >= 1, `${suco.id}: filtros_sabor insuficientes.`);
  exigir(Array.isArray(suco.ingredientes_lista) && suco.ingredientes_lista.length >= 3, `${suco.id}: ingredientes estruturados ausentes.`);
  exigir(Array.isArray(suco.preparo) && suco.preparo.length === 4, `${suco.id}: preparo deve ter 4 etapas.`);
  exigir(Array.isArray(suco.secoes) && suco.secoes.length === 3, `${suco.id}: deve ter ajuste, variação e nota detox.`);
  exigir(Array.isArray(suco.observacoes) && suco.observacoes.length >= 3, `${suco.id}: observações insuficientes.`);
  exigir(suco.editorial_versao === 'detox_final_v3', `${suco.id}: editorial_versao incorreta.`);
  exigir(Boolean(suco.midia?.imagem_apresentacao_url), `${suco.id}: imagem_apresentacao_url ausente.`);
  exigir(Boolean(suco.midia?.imagem_apresentacao_alt), `${suco.id}: alt da apresentação ausente.`);
  exigir(suco.midia?.imagem_apresentacao_url === `./assets/images/sucos-detox/detox_${numero}.png`, `${suco.id}: imagem não corresponde ao número ${numero}.`);
  const localPath = path.join(root, suco.midia.imagem_apresentacao_url.replace(/^\.\//,''));
  exigir(fs.existsSync(localPath), `${suco.id}: arquivo de imagem não encontrado em ${localPath}.`);
  if (fs.existsSync(localPath)) {
    const size = pngSize(localPath);
    exigir(size?.width === 1374 && size?.height === 1145, `${suco.id}: imagem deve ter 1374x1145; encontrado ${size?.width}x${size?.height}.`);
  }
  exigir(!/emagrec|perder peso|queimar gordura|eliminar toxina|limpar o organismo/i.test(JSON.stringify(suco)), `${suco.id}: linguagem promocional/indevida detectada.`);
}

if (falhas.length) {
  console.error('VALIDAÇÃO SUCOS DETOX — FALHOU');
  falhas.forEach((falha) => console.error('-', falha));
  process.exit(1);
}

console.log('VALIDAÇÃO SUCOS DETOX — APROVADA');
console.log(JSON.stringify({ receitas: sucos.length, imagens: 20, dimensao_padrao: '1374x1145', formato: 'PNG', editorial: 'detox_final_v3' }, null, 2));
