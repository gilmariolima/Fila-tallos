// ==UserScript==
// @name         robô de chamar
// @namespace    http://tampermonkey.net/
// @version      2026-04-03
// @description  try to take over the world!
// @author       You
// @match        *://prod-guanabara-frontoffice-smartbus.smarttravelit.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
(function () {
'use strict';
if (!window.location.href.includes('bookingcouponsearch')) return;
const aguardarTabelaEExecutar = (callback) => {
const observer = new MutationObserver(() => {
const tabela = document.querySelector('table');
if (tabela) {
observer.disconnect();
callback();
}
});
observer.observe(document.body, { childList: true, subtree: true });
};

aguardarTabelaEExecutar(() => {
// === SEU SCRIPT AQUI ===

function criarBotaoExecutar() {
const botao = document.createElement('button');
botao.id = 'btn-rogerio';
botao.textContent = ' RESERVAS';
botao.style = `
position: fixed;
bottom: 20px;
right: 350px;
z-index: 9999;
padding: 10px 20px;
background-color: darkgreen;
color: white;
border: none;
border-radius: 5px;
cursor: pointer;
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;
document.body.appendChild(botao);
return botao;
}

function mostrarToast(mensagem) {
const msg = document.createElement('div');
msg.innerText = mensagem;
msg.style = `
position: fixed;
bottom: 60px;
right: 320px;
background: #4CAF50;
color: white;
padding: 10px 20px;
border-radius: 8px;
font-size: 14px;
z-index: 9999;
`;
document.body.appendChild(msg);
setTimeout(() => msg.remove(), 4000);
}

function encontrarTabelaComColunasEsperadas(colunasEsperadas) {
const tabelas = document.querySelectorAll('table');
for (const tabela of tabelas) {
const ths = Array.from(tabela.querySelectorAll('thead th')).map(th => th.textContent.trim().toUpperCase());
const possuiTodas = colunasEsperadas.every(col => ths.includes(col));
if (possuiTodas) return { tabela, ths };
}
return null;
}

function mapearIndicesDasColunas(ths) {
const indices = {};
ths.forEach((nome, i) => {
indices[nome] = i + 1;
});
return indices;
}

const botao = criarBotaoExecutar();

botao.addEventListener('click', () => {
botao.disabled = true;
botao.textContent = 'Processando...';

const STORAGE_RESERVAS = 'reservasChamadas';
const STORAGE_LOCALIZADORES = 'localizadoresChamados';

const resultadoBusca = encontrarTabelaComColunasEsperadas(['LOCALIZADOR', 'PASSAGEIRO', 'STATUS', 'VENDA', 'ORIGEM', 'DESTINO']);
if (!resultadoBusca) {
alert('Tabela com colunas esperadas não encontrada.');
botao.disabled = false;
botao.textContent = 'ABRIR RESERVAS';
return;
}

const { tabela, ths } = resultadoBusca;
const indices = mapearIndicesDasColunas(ths);
const rows = Array.from(tabela.querySelectorAll('tbody tr'));

const dadosChaves = localStorage.getItem(STORAGE_RESERVAS);
const reservasChamadas = new Set(dadosChaves ? JSON.parse(dadosChaves) : []);

const dadosLocalizadores = localStorage.getItem(STORAGE_LOCALIZADORES);
const localizadoresChamadosAntes = new Set(dadosLocalizadores ? JSON.parse(dadosLocalizadores) : []);
const localizadoresJaChamados = new Set();

const getCellText = (row, idx) => row.querySelector(`td:nth-child(${idx})`)?.textContent.trim() || '';
const getLabelText = (row, idx) => row.querySelector(`td:nth-child(${idx}) label`)?.textContent.trim() || '';
const getPassageiroNome = (row) => getLabelText(row, indices['PASSAGEIRO']).split('\n')[0];
const getOrigem = (row) => getLabelText(row, indices['ORIGEM']) + ' ' + getCellText(row, indices['ORIGEM']).split('\n').slice(-1)[0];
const getDestino = (row) => getLabelText(row, indices['DESTINO']) + ' ' + getCellText(row, indices['DESTINO']).split('\n').slice(-1)[0];
const getReservaIcon = (row) => row.querySelector('i.gridRowAction.fa.fa-copy');

const isVendaOnlineOuMobile = (row) => getCellText(row, indices['VENDA']).toUpperCase().includes('INTERNET') || getCellText(row, indices['VENDA']).toUpperCase().includes('MOBILE');
const isStatusNaoEmitidoCancelado = (row) => getCellText(row, indices['STATUS']).toUpperCase().includes('NÃO EMITIDO/CANCELADO');

const destacarNomeRoxoClaro = (row) => {
const nomeEl = row.querySelector(`td:nth-child(${indices['PASSAGEIRO']}) label`);
if (nomeEl) nomeEl.style.color = '#b266ff';
};

const destacarNomeRoxoEscuro = (row) => {
const nomeEl = row.querySelector(`td:nth-child(${indices['PASSAGEIRO']}) label`);
if (nomeEl) nomeEl.style.color = '#4b0082';
};

const destacarLocalizadorVermelho = (row) => {
const locEl = row.querySelector(`td:nth-child(${indices['LOCALIZADOR']})`);
if (locEl) locEl.style.color = 'red';
};

const linhasParaAcionar = [];
const chavesGeradas = new Set();
const novosLocalizadores = new Set();

for (let i = 0; i < rows.length; i++) {
const row = rows[i];
const localizador = getCellText(row, indices['LOCALIZADOR']);
const nome = getPassageiroNome(row);
const origem = getOrigem(row);
const destino = getDestino(row);
const trechoOrdenado = [origem, destino].sort().join('|');
const chave = `${nome}|${trechoOrdenado}`;

if (!isStatusNaoEmitidoCancelado(row)) continue;

if (reservasChamadas.has(chave)) {
destacarNomeRoxoEscuro(row);
continue;
}

if (localizadoresChamadosAntes.has(localizador) || localizadoresJaChamados.has(localizador)) {
destacarNomeRoxoEscuro(row);
destacarLocalizadorVermelho(row);
reservasChamadas.add(chave);
continue;
}

if (isVendaOnlineOuMobile(row)) {
linhasParaAcionar.push(row);
reservasChamadas.add(chave);
chavesGeradas.add(chave);
localizadoresJaChamados.add(localizador);
novosLocalizadores.add(localizador);
destacarNomeRoxoClaro(row);

for (let j = i + 1; j < rows.length; j++) {
const nextRow = rows[j];
const nextLoc = getCellText(nextRow, indices['LOCALIZADOR']);
if (nextLoc !== localizador) break;
const nextNome = getPassageiroNome(nextRow);
const nextOrigem = getOrigem(nextRow);
const nextDestino = getDestino(nextRow);
const nextTrecho = [nextOrigem, nextDestino].sort().join('|');
const nextChave = `${nextNome}|${nextTrecho}`;
reservasChamadas.add(nextChave);
}
}
}

localStorage.setItem(STORAGE_RESERVAS, JSON.stringify([...reservasChamadas]));
localStorage.setItem(STORAGE_LOCALIZADORES, JSON.stringify([...new Set([...localizadoresChamadosAntes, ...novosLocalizadores])]));

function clicarComCtrl(icon) {
const ctrlClick = new MouseEvent('click', {
bubbles: true,
cancelable: true,
view: window,
ctrlKey: true
});
icon.dispatchEvent(ctrlClick);
}

function executarComDelay(lista, delay = 800, index = 0) {
if (index >= lista.length) {
botao.disabled = false;
botao.textContent = 'ABRIR RESERVAS';
mostrarToast(` ${lista.length} passageiros acionados.`);
return;
}
const row = lista[index];
const icon = getReservaIcon(row);
if (icon) clicarComCtrl(icon);
setTimeout(() => executarComDelay(lista, delay, index + 1), delay);
}

executarComDelay(linhasParaAcionar, 100);

console.table([...chavesGeradas].map(c => ({ Chave: c })));
});
});
})();

    // Your code here...
})();
