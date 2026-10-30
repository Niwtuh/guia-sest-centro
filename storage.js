/* 
=========================================================================
 * storage.js — Camada de persistência local (Web Storage API)
 * -------------------------------------------------------------------------
 * OBJETIVO: Centralizar TODA a leitura e gravação no localStorage do
 * navegador do aluno. Nenhum outro arquivo deve chamar localStorage
 * diretamente — sempre passar por este módulo.
 *
 * VANTAGEM: se um dia for preciso trocar localStorage por IndexedDB ou
 * por uma API remota, basta alterar este arquivo; o resto do app continua
 * funcionando igual.
========================================================================= */

/**
 * Lê um valor guardado no localStorage e devolve como objeto.
 * @param {string} chave Nome da chave (ex.: "sest_componentes")
 * @returns {*} Objeto/array guardado, ou null se não existir.
 */
function carregarDados(chave) {
  try {
    const bruto = localStorage.getItem(chave);
    if (!bruto) return null; // chave não existe ainda (primeiro uso)
    return JSON.parse(bruto); // converte texto JSON em objeto JS
  } catch (erro) {
    // Se o JSON estiver corrompido, evita que o app quebre inteiro
    console.warn("storage.carregarDados: falha ao ler", chave, erro);
    return null;
  }
}

/**
 * Salva um valor (objeto, array, string) no localStorage em formato JSON.
 * @param {string} chave Nome da chave
 * @param {*} valor Qualquer estrutura serializável (não usar funções)
 */
function salvarDados(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch (erro) {
    // Erro mais comum: quota cheia (5~10 MB por domínio)
    console.error("storage.salvarDados: não foi possível salvar", chave, erro);
    return false;
  }
}

/**
 * Remove uma chave do localStorage.
 * Útil para botões de "limpar dados" em telas de configuração.
 */
function removerDados(chave) {
  localStorage.removeItem(chave);
}

/**
 * Verifica rapidamente se uma chave já existe (sem ler o conteúdo).
 */
function existe(chave) {
  return localStorage.getItem(chave) !== null;
}

// ────────────────────────────────────────────────────────────────────────
// CHAVES PADRÃO DO APLICATIVO — centralizadas para evitar erros de digitação
// ────────────────────────────────────────────────────────────────────────
const CHAVES = {
  COMPONENTES: "sest_componentes", // matérias cadastradas pelo aluno
  FEEDBACKS: "sest_feedbacks",       // avaliações anônimas locais
  DENUNCIAS: "sest_denuncias",       // denúncias salvas localmente (rascunho)
  PREFERENCIAS: "sest_preferencias"  // tema, última aba aberta etc.
};
