/* 
=========================================================================
 * storage.js — Camada de persistência local (Web Storage API)
========================================================================= */

function carregarDados(chave) {
  try {
    const bruto = localStorage.getItem(chave);
    if (!bruto) return null;
    return JSON.parse(bruto);
  } catch (erro) {
    console.warn("storage.carregarDados: falha ao ler", chave, erro);
    return null;
  }
}

function salvarDados(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch (erro) {
    console.error("storage.salvarDados: não foi possível salvar", chave, erro);
    return false;
  }
}

function removerDados(chave) {
  localStorage.removeItem(chave);
}

function existe(chave) {
  return localStorage.getItem(chave) !== null;
}

const CHAVES = {
  COMPONENTES: "sest_componentes",
  FEEDBACKS: "sest_feedbacks",
  DENUNCIAS: "sest_denuncias",
  PREFERENCIAS: "sest_preferencias"
};
