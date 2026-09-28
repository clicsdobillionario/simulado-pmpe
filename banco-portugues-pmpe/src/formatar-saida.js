import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

const QUESTOES_FILE = path.join(DATA_DIR, 'questoes.json');
const TXT_FILE = path.join(DATA_DIR, 'questoes.txt');
const GABARITO_FILE = path.join(DATA_DIR, 'gabarito.json');
const TOPICOS_MAP_FILE = path.join(DATA_DIR, 'topicos-map.json');

function carregarQuestoes() {
  if (!fs.existsSync(QUESTOES_FILE)) {
    console.error('Arquivo questoes.json não encontrado. Rode "npm run gerar" primeiro.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(QUESTOES_FILE, 'utf-8'));
}

function letra(idx) {
  return String.fromCharCode(65 + idx);
}

function formatarQuestoesTxt(questoes) {
  const linhas = [];
  const dataGeracao = new Date().toLocaleString('pt-BR');
  
  linhas.push('='.repeat(60));
  linhas.push('BANCO DE QUESTÕES - LÍNGUA PORTUGUESA (AOCP/PM-PE)');
  linhas.push(`Total: ${questoes.length} questões | Gerado em: ${dataGeracao}`);
  linhas.push('='.repeat(60));
  linhas.push('');

  for (const q of questoes) {
    linhas.push(`QUESTÃO ${q.id} - ${q.topico}`);
    linhas.push(q.enunciado);
    linhas.push('');
    q.alternativas.forEach((alt, i) => {
      linhas.push(`${letra(i)}) ${alt}`);
    });
    linhas.push('');
    linhas.push('---');
    linhas.push('');
  }

  linhas.push('='.repeat(60));
  linhas.push('GABARITO');
  linhas.push('='.repeat(60));
  for (const q of questoes) {
    linhas.push(`${String(q.id).padStart(4, ' ')}.  ${letra(q.correta)}`);
  }
  linhas.push('');
  linhas.push('='.repeat(60));
  linhas.push('EXPLICAÇÕES');
  linhas.push('='.repeat(60));
  for (const q of questoes) {
    linhas.push(`${String(q.id).padStart(4, ' ')}. ${q.explicacao}`);
  }

  return linhas.join('\n');
}

function gerarGabaritoJson(questoes) {
  const gabarito = {};
  for (const q of questoes) {
    gabarito[String(q.id)] = q.correta;
  }
  return gabarito;
}

function gerarTopicosMap(questoes) {
  const map = {};
  for (const q of questoes) {
    map[String(q.id)] = q.topico;
  }
  return map;
}

function main() {
  console.log('Carregando questões...');
  const questoes = carregarQuestoes();
  console.log(`${questoes.length} questões carregadas.`);

  console.log('Gerando arquivo TXT...');
  const txt = formatarQuestoesTxt(questoes);
  fs.writeFileSync(TXT_FILE, txt, 'utf-8');
  console.log(`✅ ${TXT_FILE} (${(txt.length / 1024).toFixed(1)} KB)`);

  console.log('Gerando gabarito JSON...');
  const gabarito = gerarGabaritoJson(questoes);
  fs.writeFileSync(GABARITO_FILE, JSON.stringify(gabarito, null, 2), 'utf-8');
  console.log(`✅ ${GABARITO_FILE}`);

  console.log('Gerando mapa de tópicos...');
  const topicosMap = gerarTopicosMap(questoes);
  fs.writeFileSync(TOPICOS_MAP_FILE, JSON.stringify(topicosMap, null, 2), 'utf-8');
  console.log(`✅ ${TOPICOS_MAP_FILE}`);

  console.log('\n=== FORMATADOS CONCLUÍDOS ===');
}

main();