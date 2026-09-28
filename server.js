import express from 'express';
import crypto from 'node:crypto';
import pg from 'pg';

const app = express();
app.set('trust proxy', 1); // Railway fica atrás de proxy
app.use(express.json());
app.use(express.static('public'));

const MODEL = process.env.MODEL || 'gemini-3.8-flash';
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error('ERRO: variável GEMINI_API_KEY não definida. Gere uma chave gratuita em https://aistudio.google.com/apikey e adicione-a nas Variables do serviço do app no Railway.');
  process.exit(1);
}

// AJUSTE quando o edital da AOCP sair (matérias, quantidades e assuntos).
// Distribuição inicial é uma estimativa: total de 60 questões.
const PROVA = [
  { materia: 'Língua Portuguesa', qtd: 15, assuntos: ['interpretação de texto', 'gramática', 'concordância e regência', 'pontuação', 'coesão e coerência'] },
  { materia: 'Raciocínio Lógico', qtd: 10, assuntos: ['proposições e conectivos', 'tabela-verdade', 'porcentagem', 'proporcionalidade', 'sequências'] },
  { materia: 'Informática', qtd: 5, assuntos: ['Windows', 'Word e Excel', 'internet e e-mail', 'segurança da informação'] },
  { materia: 'Direito Constitucional', qtd: 10, assuntos: ['direitos e garantias fundamentais', 'segurança pública (art. 144)', 'administração pública (art. 37)'] },
  { materia: 'Direitos Humanos', qtd: 10, assuntos: ['DUDH', 'Pacto de San José', 'uso da força e armas de fogo', 'tortura e abuso de autoridade'] },
  { materia: 'História de Pernambuco', qtd: 5, assuntos: ['período colonial', 'invasão holandesa', 'Revolução de 1817', 'Confederação do Equador', 'Praieira'] },
  { materia: 'Atualidades', qtd: 5, assuntos: ['segurança pública', 'meio ambiente', 'política e economia brasileira'] },
];

const SYSTEM = `Você é elaborador de questões da banca AOCP para o concurso de Soldado da PM-PE (nível médio).
Responda SOMENTE com um array JSON, sem texto extra e sem crases.`;

const sessoes = new Map();

// Postgres do Railway: a variável DATABASE_URL é preenchida ao adicionar o plugin
// (no serviço do app, referencie como DATABASE_URL=${{Postgres.DATABASE_URL}}).
if (!process.env.DATABASE_URL) {
  console.error('ERRO: variável DATABASE_URL não definida. No Railway, adicione um Postgres ao projeto e, nas Variables do serviço do app, defina DATABASE_URL=${{<nome-do-serviço-postgres>.DATABASE_URL}}.');
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(`CREATE TABLE IF NOT EXISTS usuarios(id SERIAL PRIMARY KEY, telefone TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tokens(token TEXT PRIMARY KEY, usuario INTEGER NOT NULL, criado BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS resultados(id SERIAL PRIMARY KEY, usuario INTEGER NOT NULL, data BIGINT NOT NULL, acertos INTEGER NOT NULL, total INTEGER NOT NULL, detalhe TEXT)`);
} catch (e) {
  console.error('ERRO ao conectar no Postgres. Confira se DATABASE_URL aponta para o serviço certo e se o Postgres está no mesmo projeto do Railway.');
  console.error(e.message);
  process.exit(1);
}
pool.on('error', (e) => console.error('Erro no pool do Postgres:', e.message));

const hashSenha = (senha, salt) => crypto.scryptSync(senha, salt, 64).toString('hex');
const soDigitos = (t) => String(t || '').replace(/\D/g, '');
const erroInterno = (res, e) => { console.error(e); res.status(500).json({ erro: 'Erro interno. Tente de novo.' }); };

// Limite de tentativas: 5 falhas por IP+telefone a cada 15 minutos.
const falhas = new Map();
const JANELA = 15 * 60 * 1000;
const chave = (req) => `${req.ip}:${soDigitos(req.body.telefone)}`;
const bloqueado = (k) => { const f = falhas.get(k); return f && f.n >= 5 && Date.now() - f.t < JANELA; };
const falhou = (k) => { const f = falhas.get(k); falhas.set(k, { n: f && Date.now() - f.t < JANELA ? f.n + 1 : 1, t: Date.now() }); };

async function abrirSessao(res, uid) {
  const token = crypto.randomBytes(32).toString('hex');
  await pool.query('INSERT INTO tokens VALUES($1,$2,$3)', [token, uid, Date.now()]);
  res.setHeader('Set-Cookie', `t=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
}

async function auth(req, res, next) {
  try {
    const m = /(?:^|; )t=([a-f0-9]+)/.exec(req.headers.cookie || '');
    const r = m && (await pool.query('SELECT usuario FROM tokens WHERE token=$1 AND criado>$2', [m[1], Date.now() - 30 * 864e5]));
    if (!r || !r.rows[0]) return res.status(401).json({ erro: 'Faça login para continuar.' });
    req.uid = r.rows[0].usuario;
    req.token = m[1];
    next();
  } catch (e) { erroInterno(res, e); }
}

app.post('/api/cadastro', async (req, res) => {
  const tel = soDigitos(req.body.telefone), senha = String(req.body.senha || '');
  if (tel.length < 10 || tel.length > 11) return res.status(400).json({ erro: 'Informe o telefone com DDD.' });
  if (senha.length < 6) return res.status(400).json({ erro: 'A senha precisa ter ao menos 6 caracteres.' });
  const salt = crypto.randomBytes(16).toString('hex');
  try {
    const r = await pool.query('INSERT INTO usuarios(telefone,salt,hash) VALUES($1,$2,$3) RETURNING id', [tel, salt, hashSenha(senha, salt)]);
    await abrirSessao(res, r.rows[0].id);
    res.json({ ok: true });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ erro: 'Esse telefone já tem cadastro. Use Entrar.' });
    erroInterno(res, e);
  }
});

app.post('/api/login', async (req, res) => {
  const k = chave(req);
  if (bloqueado(k)) return res.status(429).json({ erro: 'Muitas tentativas. Aguarde 15 minutos.' });
  try {
    const { rows: [u] } = await pool.query('SELECT * FROM usuarios WHERE telefone=$1', [soDigitos(req.body.telefone)]);
    const ok = u && crypto.timingSafeEqual(Buffer.from(hashSenha(String(req.body.senha || ''), u.salt), 'hex'), Buffer.from(u.hash, 'hex'));
    if (!ok) { falhou(k); return res.status(401).json({ erro: 'Telefone ou senha incorretos.' }); }
    falhas.delete(k);
    await abrirSessao(res, u.id);
    res.json({ ok: true });
  } catch (e) { erroInterno(res, e); }
});

app.post('/api/sair', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM tokens WHERE token=$1', [req.token]);
    res.setHeader('Set-Cookie', 't=; Path=/; Max-Age=0');
    res.json({ ok: true });
  } catch (e) { erroInterno(res, e); }
});

app.get('/api/historico', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT data, acertos, total FROM resultados WHERE usuario=$1 ORDER BY data DESC LIMIT 50', [req.uid]);
    res.json(r.rows.map((x) => ({ ...x, data: Number(x.data) })));
  } catch (e) { erroInterno(res, e); }
});

const valida = (q) =>
  q && typeof q.enunciado === 'string' && Array.isArray(q.alternativas) &&
  q.alternativas.length === 5 && q.alternativas.every((a) => typeof a === 'string') &&
  Number.isInteger(q.correta) && q.correta >= 0 && q.correta <= 4 && typeof q.explicacao === 'string';

const embaralha = (q) => {
  const idx = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);
  return { ...q, alternativas: idx.map((i) => q.alternativas[i]), correta: idx.indexOf(q.correta) };
};

async function gerar({ materia, qtd, assuntos }) {
  const prompt = `Crie ${qtd} questões inéditas de "${materia}" no estilo AOCP, com 5 alternativas cada.
Assuntos possíveis (varie entre eles): ${assuntos.join('; ')}.
Regras: exatamente uma alternativa correta; sem "todas as anteriores"; distratores plausíveis; conteúdo factual e correto.
Formato: [{"enunciado":"...","alternativas":["...","...","...","...","..."],"correta":0,"explicacao":"1-2 frases"}]
"correta" é o índice (0 a 4) da alternativa certa.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

  for (let tentativa = 0; tentativa < 5; tentativa++) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8000 },
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        // 429 (cota) e 503 (sobrecarga) valem tentar de novo, com o tempo que a própria API sugerir.
        if (r.status === 429 || r.status === 503) {
          const m = /retry in ([\d.]+)s/i.exec(d?.error?.message || '');
          const espera = m ? Math.ceil(parseFloat(m[1]) * 1000) + 500 : 3000 * (tentativa + 1);
          console.error(`[${materia}] ${r.status}, tentando de novo em ${espera}ms (tentativa ${tentativa + 1}/5)`);
          await dormir(espera);
          continue;
        }
        console.error(`[${materia}] API respondeu ${r.status}:`, JSON.stringify(d).slice(0, 500));
        return [];
      }
      const cand = d.candidates?.[0];
      const txt = (cand?.content?.parts || []).map((p) => p.text || '').join('').replace(/```json|```/g, '').trim();
      if (!txt) {
        console.error(`[${materia}] Resposta vazia. finishReason:`, cand?.finishReason, '| corpo:', JSON.stringify(d).slice(0, 300));
        return [];
      }
      let qs;
      try {
        qs = JSON.parse(txt).filter(valida).slice(0, qtd);
      } catch (e) {
        console.error(`[${materia}] JSON inválido na resposta:`, e.message, '| início do texto:', txt.slice(0, 300));
        return [];
      }
      if (qs.length) return qs.map((q) => ({ ...embaralha(q), materia }));
      console.error(`[${materia}] Nenhuma questão válida no lote.`);
      return [];
    } catch (e) {
      console.error(`[${materia}] Falha na chamada:`, e.message);
      return [];
    }
  }
  console.error(`[${materia}] Desistiu após 5 tentativas.`);
  return [];
}

// Cota gratuita do Gemini é baixa (poucas req/min): gera uma matéria por vez, com espaçamento.
app.post('/api/simulado', auth, async (req, res) => {
  const todas = [];
  for (const materia of PROVA) {
    todas.push(...(await gerar(materia)));
    await new Promise((r) => setTimeout(r, 13000));
  }
  const qs = todas.map((q, i) => ({ ...q, id: i }));
  if (!qs.length) return res.status(502).json({ erro: 'Não foi possível gerar as questões. Tente de novo.' });
  const id = crypto.randomUUID();
  sessoes.set(id, { uid: req.uid, qs });
  setTimeout(() => sessoes.delete(id), 4 * 60 * 60 * 1000);
  // O gabarito NÃO vai para o front agora.
  res.json({ id, questoes: qs.map(({ id, materia, enunciado, alternativas }) => ({ id, materia, enunciado, alternativas })) });
});

app.post('/api/gabarito', auth, async (req, res) => {
  const sessao = sessoes.get(req.body.id);
  if (!sessao || sessao.uid !== req.uid) return res.status(404).json({ erro: 'Sessão expirada.' });
  const qs = sessao.qs;
  const resp = req.body.respostas || {};
  const itens = qs.map((q) => ({ ...q, marcada: resp[q.id] ?? null, acertou: resp[q.id] === q.correta }));
  const porMateria = {};
  itens.forEach((q) => {
    porMateria[q.materia] ??= { acertos: 0, total: 0 };
    porMateria[q.materia].total++;
    if (q.acertou) porMateria[q.materia].acertos++;
  });
  const acertos = itens.filter((q) => q.acertou).length;
  try {
    await pool.query('INSERT INTO resultados(usuario,data,acertos,total,detalhe) VALUES($1,$2,$3,$4,$5)', [req.uid, Date.now(), acertos, itens.length, JSON.stringify(porMateria)]);
  } catch (e) { console.error(e); }
  sessoes.delete(req.body.id);
  res.json({ acertos, total: itens.length, porMateria, itens });
});

app.listen(process.env.PORT || 3000, () => console.log('Simulado no ar'));