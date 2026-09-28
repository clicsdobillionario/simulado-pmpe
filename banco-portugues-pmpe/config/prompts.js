export const SYSTEM_PROMPT = `Você é elaborador de questões da banca AOCP para o concurso de Soldado da PM-PE (nível médio).
Responda SOMENTE com um array JSON, sem texto extra e sem crases.`;

export const REGRAS_GERAIS = `
REGRAS OBRIGATÓRIAS:
- Exatamente 5 alternativas (A, B, C, D, E)
- Apenas UMA alternativa correta
- NÃO usar "Todas as anteriores", "Nenhuma das anteriores", "Todas estão corretas"
- Distratores plausíveis (erros comuns de candidatos)
- Conteúdo factual e correto, nivel médio
- Estilo AOCP: enunciados claros, alternativas bem construídas
- Explicação: 1-2 frases, didática, citando a regra`;

export const PROMPTS_POR_TOPICO = {
  compreensao: (qtd) => `Crie ${qtd} questões inéditas de "Compreensão e interpretação de textos" no estilo AOCP.
Para cada questão: crie um texto base (50-120 palavras) variando entre narrativo, dissertativo, expositivo, instrucional.
Tipos de questão: ideia principal, inferência, vocabulário em contexto, função da linguagem, coesão, interpretação de dados.
${REGRAS_GERAIS}
Formato: [{"enunciado":"Texto: ...\\n\\nQuestão: ...","alternativas":["...","...","...","...","..."],"correta":0,"explicacao":"..."}]`,

  tipologias: (qtd) => `Crie ${qtd} questões inéditas de "Tipologias e gêneros textuais" no estilo AOCP.
Foco: narrativo, descritivo, dissertativo, expositivo, injuntivo; gêneros: notícia, artigo de opinião, carta, e-mail, memorando, ofício, relatório, resenha, crônica, conto.
${REGRAS_GERAIS}
Formato: [{"enunciado":"...","alternativas":["...","...","...","...","..."],"correta":0,"explicacao":"..."}]`,

  ortografia: (qtd) => `Crie ${qtd} questões inéditas de "Ortografia oficial" no estilo AOCP.
Foco: uso das letras (ss/ç, x/ch, g/j, h, m/n), dígrafos, encontro vocálico/hiato, prefixos, sufixos, hifenização (nova ortografia).
${REGRAS_GERAIS}
Formato: [{"enunciado":"...","alternativas":["...","...","...","...","..."],"correta":0,"explicacao":"..."}]`,

  acentuacao: (qtd) => `Crie ${qtd} questões inéditas de "Acentuação gráfica" no estilo AOCP.
Foco: regras gerais (oxítonas, paroxítonas, proparoxítonas), acento diferencial, crase, hífens, monotongação, ditongos crescentes/decrescentes.
${REGRAS_GERAIS}
Formato: [{"enunciado":"...","alternativas":["...","...","...","...","..."],"correta":0,"explicacao":"..."}]`,

  classes: (qtd) => `Crie ${qtd} questões inéditas de "Emprego das classes de palavras" no estilo AOCP.
Foco: substantivo, adjetivo, artigo, pronome, verbo, advérbio, preposição, conjunção, interjeição, numeral. Emprego correto, flexão, classificação.
${REGRAS_GERAIS}
Formato: [{"enunciado":"...","alternativas":["...","...","...","...","..."],"correta":0,"explicacao":"..."}]`,

  crase: (qtd) => `Crie ${qtd} questões inéditas de "Emprego do sinal indicativo de crase" no estilo AOCP.
Foco: regras obrigatórias (antes de palavra feminina), facultativas, proibidas; locuções cristalizadas; pronomes demonstrativos; nomes próprios; advérbios femininos.
${REGRAS_GERAIS}
Formato: [{"enunciado":"...","alternativas":["...","...","...","...","..."],"correta":0,"explicacao":"..."}]`,

  sintaxe: (qtd) => `Crie ${qtd} questões inéditas de "Sintaxe da oração e do período" no estilo AOCP.
Foco: termos essenciais (sujeito, predicado, objeto direto/indireto, complemento nominal, adjunto adnominal/adverbial, aposto, vocativo); período composto (coordenação, subordinação); concordância e regência na sintaxe.
${REGRAS_GERAIS}
Formato: [{"enunciado":"...","alternativas":["...","...","...","...","..."],"correta":0,"explicacao":"..."}]`,

  coesao: (qtd) => `Crie ${qtd} questões inéditas de "Mecanismos de coesão textual" no estilo AOCP.
Foco: referenciação (pronomes, advérbios, elipse), conectivos, repetição lexical, substituição lexical, paralelismo, sequenciação temporal/lógica.
${REGRAS_GERAIS}
Formato: [{"enunciado":"...","alternativas":["...","...","...","...","..."],"correta":0,"explicacao":"..."}]`,

  pontuacao: (qtd) => `Crie ${qtd} questões inéditas de "Pontuação" no estilo AOCP.
Foco: vírgula (enumeração, vocativo, aposto, orações subordinadas/adverbiais, conectivos), ponto e vírgula, dois-pontos, ponto final, reticências, travessão, aspas, parênteses.
${REGRAS_GERAIS}
Formato: [{"enunciado":"...","alternativas":["...","...","...","...","..."],"correta":0,"explicacao":"..."}]`,

  concordancia: (qtd) => `Crie ${qtd} questões inéditas de "Concordância nominal e verbal" no estilo AOCP.
Foco nominal: adjetivo, pronome, numeral, artigo com núcleo. Foco verbal: sujeito simples, composto, oculto, indeterminado, coletivo, "o que", "que", orações. Casos especiais: "há", "faz", "é", verbos defectivos.
${REGRAS_GERAIS}
Formato: [{"enunciado":"...","alternativas":["...","...","...","...","..."],"correta":0,"explicacao":"..."}]`,

  regencia: (qtd) => `Crie ${qtd} questões inéditas de "Regência nominal e verbal" no estilo AOCP.
Foco verbal: transitividade, verbos com preposição, regência de "haver", "fazer", "ter". Foco nominal: substantivos/adjetivos com preposição. Casos de atração, syllepse.
${REGRAS_GERAIS}
Formato: [{"enunciado":"...","alternativas":["...","...","...","...","..."],"correta":0,"explicacao":"..."}]`,

  colocacao: (qtd) => `Crie ${qtd} questões inéditas de "Colocação pronominal" no estilo AOCP.
Foco: próclise (início, advérbios negativos, pronomes indefinidos, etc.), ênclise (fim, verbo no imperativo afirmativo, infinitivo), mesóclise (futuro/condicional). Hífen, apóstrofo. Verbos auxiliares.
${REGRAS_GERAIS}
Formato: [{"enunciado":"...","alternativas":["...","...","...","...","..."],"correta":0,"explicacao":"..."}]`,

  significacao: (qtd) => `Crie ${qtd} questões inéditas de "Significação das palavras" no estilo AOCP.
Foco: sinonímia, antonímia, polissemia, homonímia, paronímia, denotação/conotação, sentido próprio/figurado, neologismos, empréstimos linguísticos.
${REGRAS_GERAIS}
Formato: [{"enunciado":"...","alternativas":["...","...","...","...","..."],"correta":0,"explicacao":"..."}]`,

  variacao: (qtd) => `Crie ${qtd} questões inéditas de "Variação linguística" no estilo AOCP.
Foco: variação diastrática (culto/popular), diatópica (regional), diafásica (formal/informal), diacrônica (temporal). Preconceito linguístico, norma padrão vs. variantes.
${REGRAS_GERAIS}
Formato: [{"enunciado":"...","alternativas":["...","...","...","...","..."],"correta":0,"explicacao":"..."}]`,

  redacao: (qtd) => `Crie ${qtd} questões inéditas de "Redação oficial — regras + modelo" no estilo AOCP.
Base: Manual de Redação da Presidência da República (2018).
Foco: princípios (clareza, concisão, impessoalidade, padronização), estrutura dos expedientes (ofício, memorando, aviso, portaria, decreto, ato), linguagem oficial, vocabulário técnico.
Inclua 1 questão com modelo de ofício/memorando completo para análise.
${REGRAS_GERAIS}
Formato: [{"enunciado":"...","alternativas":["...","...","...","...","..."],"correta":0,"explicacao":"..."}]`
};

export function getPrompt(topicoId, qtd) {
  const promptFn = PROMPTS_POR_TOPICO[topicoId];
  if (!promptFn) {
    return `Crie ${qtd} questões inéditas no estilo AOCP para concurso PM-PE.
${REGRAS_GERAIS}
Formato: [{"enunciado":"...","alternativas":["...","...","...","...","..."],"correta":0,"explicacao":"..."}]`;
  }
  return promptFn(qtd);
}

export const TOPICOS_COM_PROMPT = Object.keys(PROMPTS_POR_TOPICO);