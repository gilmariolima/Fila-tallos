// ==UserScript==
// @name         Auto Transferência (DOM Safe)
// @namespace    https://tampermonkey.net/
// @version      4.0
// @description  Transferência automática robusta sem dependência de tempo
// @match        https://app.tallos.com.br/*
// @grant        none
// ==/UserScript==

(function () {
'use strict';

let rodando = false;
let emTransferencia = false;

let indiceOnline = 0;
let ultimoAtendente = null;

const STORAGE_CONTADOR = 'RD_CONTADOR_ATENDENTES';

const LISTA_FIXA_ATENDENTES = [
'Aline Santos','Aline Simplicio','Ana Beatriz','André Lucas','Bruno Amancio',
'Caio Maciel','Cayo Mendes','Daniel Lima','Felipe Sombra',
'Gilmário Lima','Gleison Castro','Igor Schneider','João Pedro','Kaio Leão',
'Lucas Sombra','Luiziane Ferreira','Marcelo Augusto',
'Marcelo Santos','Marcus Luan','Melissa Bezerra','Nayara Oliveira','Pedro Santos',
'Tifane Sombra','Uelisson Torres','William Rodrigues'
];

function normalizarTexto(txt){
return String(txt || '')
.normalize('NFD')
.replace(/[\u0300-\u036f]/g,'')
.trim()
.toLowerCase();
}

function esperarElemento(seletor, timeout=15000){
return new Promise((resolve,reject)=>{

const inicio = Date.now();

const intervalo = setInterval(()=>{

const el = document.querySelector(seletor);

if(el){
clearInterval(intervalo);
resolve(el);
}

if(Date.now()-inicio > timeout){
clearInterval(intervalo);
reject("Elemento não encontrado: "+seletor);
}

},120);

});
}

function esperarHabilitado(el,timeout=10000){
return new Promise((resolve,reject)=>{

const inicio = Date.now();

const intervalo = setInterval(()=>{

if(!el.disabled && !el.getAttribute('aria-disabled')){
clearInterval(intervalo);
resolve(el);
}

if(Date.now()-inicio > timeout){
clearInterval(intervalo);
reject("Elemento nunca habilitou");
}

},120);

});
}

async function clicarSeguro(seletor){

const el = await esperarElemento(seletor);
await esperarHabilitado(el);

el.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
el.dispatchEvent(new MouseEvent('click',{bubbles:true}));

return el;
}

async function esperarOpcoes(select){

return new Promise(resolve=>{

const intervalo = setInterval(()=>{

if(select.options && select.options.length > 1){
clearInterval(intervalo);
resolve();
}

},100);

});

}

function getContadores(){
try{
return JSON.parse(localStorage.getItem(STORAGE_CONTADOR) || '{}');
}catch{
return {};
}
}

function salvarContadores(obj){
localStorage.setItem(STORAGE_CONTADOR,JSON.stringify(obj));
}

function incrementarContador(nome){

const contadores = getContadores();
contadores[nome] = (contadores[nome] || 0) + 1;

salvarContadores(contadores);
}

function obterOnlinesDoStorage(){

try{

const raw = localStorage.getItem('RD_STATUS_OPERADORES');

if(!raw) return [];

const parsed = JSON.parse(raw);
const online = parsed?.online || [];

return online.map(x=>{
if(typeof x === 'string') return x;
return x.nome || x.name || x.label || '';
}).filter(Boolean);

}catch{

return [];

}

}

function selecionarAtendente(select){

const onlines = obterOnlinesDoStorage().map(normalizarTexto);
const setOnline = new Set(onlines);

for(let i=0;i<LISTA_FIXA_ATENDENTES.length;i++){

const idx = (indiceOnline + i) % LISTA_FIXA_ATENDENTES.length;

const nome = LISTA_FIXA_ATENDENTES[idx];
const nomeNorm = normalizarTexto(nome);

if(!setOnline.has(nomeNorm)) continue;

const opcao = [...select.options].find(o =>
normalizarTexto(o.textContent) === nomeNorm
);

if(!opcao) continue;

select.value = opcao.value;
select.dispatchEvent(new Event('change',{bubbles:true}));

indiceOnline = (idx+1) % LISTA_FIXA_ATENDENTES.length;
ultimoAtendente = nome;

return true;

}

return false;

}

async function transferirCliente(){

if(emTransferencia) return;

emTransferencia = true;

const clientes = document.querySelectorAll('.customer-item');

if(!clientes.length){
emTransferencia = false;
return;
}

const ultimo = clientes[clientes.length-1];
ultimo.click();

await clicarSeguro('button[data-cy="cy-chat-center-header-transfer-attendance"]');

const selectSetor = await esperarElemento('select[data-cy="cy-confirm-transfer-to-department"]');

await esperarOpcoes(selectSetor);

const opcao = [...selectSetor.options].find(o =>
normalizarTexto(o.textContent).includes('setor de vendas')
);

if(!opcao){
emTransferencia=false;
return;
}

selectSetor.value = opcao.value;
selectSetor.dispatchEvent(new Event('change',{bubbles:true}));

await clicarSeguro('button[data-cy="cy-attendance-actions-btn-confirm-to-transfer-department"]');

const selectAtendente = await esperarElemento('select[data-cy="cy-confirm-transfer-to-department"]');

await esperarOpcoes(selectAtendente);

const ok = selecionarAtendente(selectAtendente);

if(!ok){
emTransferencia=false;
return;
}

await clicarSeguro('button[data-cy="cy-attendance-actions-btn-confirm-to-transfer-department"]');

if(ultimoAtendente){
incrementarContador(ultimoAtendente);
}

emTransferencia=false;

}

async function loopPrincipal(){

while(rodando){

try{

await transferirCliente();

}catch(e){

console.error("Erro transferência",e);

}

await new Promise(r=>setTimeout(r,300));

}

}

const botao = document.createElement('button');

botao.textContent='▶ INICIAR';

Object.assign(botao.style,{
position:'fixed',
bottom:'20px',
right:'20px',
padding:'10px 14px',
borderRadius:'8px',
border:'none',
background:'#28a745',
color:'#fff',
fontWeight:'bold',
cursor:'pointer',
zIndex:99999
});

botao.onclick = ()=>{

if(!rodando){

rodando=true;

botao.textContent='⏸ PARAR';
botao.style.background='#dc3545';

loopPrincipal();

}else{

rodando=false;

botao.textContent='▶ INICIAR';
botao.style.background='#28a745';

}

};

document.body.appendChild(botao);

})();
