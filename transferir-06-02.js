// ==UserScript==
// @name        Auto Transferência
// @namespace   https://tampermonkey.net/
// @version     2.6.0
// @description Auto transferência com contador, reset e repetir último atendente
// @match       https://app.tallos.com.br/*
// @grant       none
// ==/UserScript==

(function () {
    'use strict';

    let rodando = false;
    let emTransferencia = false;
    let loop = null;

    let indiceOnline = 0;
    let ultimoAtendente = null;
    let repetirUltimo = false; // 👈 CONTROLE DE REPETIÇÃO

    const STORAGE_CONTADOR = 'RD_CONTADOR_ATENDENTES';

    const LISTA_FIXA_ATENDENTES = [
        'Aline Santos','Aline Simplicio','Ana Beatriz','André Lucas','Bruno Amancio',
        'Caio Maciel','Cayo Mendes','Daniel Lima','David Elias','Felipe Sombra',
        'Gilmário Lima','Igor Schneider','João Pedro','Kaio Leão',
        'Léo Silva','Lucas Sombra','Luís Davi','Luiziane Ferreira','Marcelo Augusto',
        'Marcelo Santos','Marcus Luan','Melissa Bezerra','Pedro Santos',
        'Tifane Sombra','Uelisson Torres','William Rodrigues'
    ];

    // ===== CONTADOR =====
    function getContadores() {
        return JSON.parse(localStorage.getItem(STORAGE_CONTADOR) || '{}');
    }

    function salvarContadores(obj) {
        localStorage.setItem(STORAGE_CONTADOR, JSON.stringify(obj));
    }

    function incrementarContador(nome) {
        const contadores = getContadores();
        contadores[nome] = (contadores[nome] || 0) + 1;
        salvarContadores(contadores);
        ui.lista();
    }

    function resetarContadores() {
        if (!confirm('Deseja zerar TODOS os contadores?')) return;
        salvarContadores({});
        ui.lista();
    }

    function dataAtual() {
        return new Date().toLocaleDateString('pt-BR');
    }

    // ===== REPETIR ÚLTIMO =====
    function voltarUltimoAtendente() {
        if (!ultimoAtendente) {
            alert('Nenhum atendente para repetir');
            return;
        }

        const idx = LISTA_FIXA_ATENDENTES.indexOf(ultimoAtendente);
        if (idx === -1) return;

        indiceOnline = idx;
        repetirUltimo = true;
        ui.etapa(`⏪ ${ultimoAtendente} receberá novamente`);
    }

    const ui = (() => {
        const box = document.createElement('div');
        box.innerHTML = `
            <div id="ui-status">⏸ Parado</div>
            <div style="font-size:12px;color:#aaa;margin-bottom:6px;">
                📅 <span id="ui-data"></span>
            </div>
            <hr>
            <div><b>👤 Cliente:</b> <span id="ui-cliente">—</span></div>
            <div><b>🔴 Último a receber:</b><br><span id="ui-ultimo">—</span></div>
            <div><b>📦 Etapa:</b> <span id="ui-etapa">—</span></div>

            <button id="btn-reset" style="
                width:100%;
                margin:8px 0;
                padding:6px;
                background:#fff;
                border:none;
                border-radius:4px;
                font-weight:bold;
                cursor:pointer;
            ">🔄 Resetar contadores</button>

            <button id="btn-voltar" style="
                width:100%;
                margin:6px 0;
                padding:6px;
                background:#ffc107;
                border:none;
                border-radius:4px;
                font-weight:bold;
                cursor:pointer;
            ">⏪ Repetir último atendente</button>

            <hr>
            <div><b>📋 Lista fixa (A–Z)</b></div>
            <ul id="ui-onlines"></ul>
        `;

        Object.assign(box.style,{
            position:'fixed',top:'20px',right:'20px',width:'320px',
            background:'#111',color:'#fff',padding:'12px',
            borderRadius:'8px',fontSize:'13px',zIndex:99999,
            cursor:'move'
        });

        document.body.appendChild(box);

        // ===== DRAG =====
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        box.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - box.getBoundingClientRect().left;
            offsetY = e.clientY - box.getBoundingClientRect().top;
            box.style.opacity = '0.85';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            box.style.left = (e.clientX - offsetX) + 'px';
            box.style.top  = (e.clientY - offsetY) + 'px';
            box.style.right = 'auto';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            box.style.opacity = '1';
        });

        box.querySelector('#btn-reset').onclick = resetarContadores;
        box.querySelector('#btn-voltar').onclick = voltarUltimoAtendente;
        box.querySelector('#ui-data').textContent = dataAtual();

        return {
            status:t=>box.querySelector('#ui-status').textContent=t,
            cliente:t=>box.querySelector('#ui-cliente').textContent=t,
            etapa:t=>box.querySelector('#ui-etapa').textContent=t,
            ultimo:t=>box.querySelector('#ui-ultimo').textContent=t||'—',
            lista(){
                const ul = box.querySelector('#ui-onlines');
                const contadores = getContadores();
                ul.innerHTML = '';

                LISTA_FIXA_ATENDENTES.forEach(n=>{
                    const li = document.createElement('li');
                    const total = contadores[n] || 0;
                    li.textContent = `${n} (${total})`;

                    if (n === ultimoAtendente) {
                        li.style.color = '#dc3545';
                        li.style.fontWeight = 'bold';
                    }

                    ul.appendChild(li);
                });
            }
        };
    })();
    ui.lista();

    function click(el){
        el.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
        el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
        el.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    }

    function atualizarFila() {
        const btnFila = [...document.querySelectorAll('button')]
            .find(b => b.innerText && b.innerText.includes('Fila de Espera'));

        if (btnFila) click(btnFila);

        setTimeout(() => {
            const btnAtualizar = document.querySelector('.custom-queue-wait-icon');
            if (!btnAtualizar) return;
            click(btnAtualizar);
            ui.etapa('Atualizando fila');
        }, 500);
    }

    const botao=document.createElement('button');
    botao.textContent='▶ INICIAR';
    Object.assign(botao.style,{
        position:'fixed',bottom:'20px',right:'20px',
        padding:'10px 14px',borderRadius:'6px',
        border:'none',background:'#28a745',
        color:'#fff',fontWeight:'bold',cursor:'pointer',zIndex:99999
    });
    botao.onclick=()=>rodando?parar():iniciar();
    document.body.appendChild(botao);

    function iniciar(){
        rodando=true;
        botao.textContent='⏸ PARAR';
        botao.style.background='#dc3545';
        ui.status('▶ Rodando');
        atualizarFila();
        loop=setInterval(loopPrincipal,6500);
    }

    function parar(){
        rodando=false;
        clearInterval(loop);
        botao.textContent='▶ INICIAR';
        botao.style.background='#28a745';
        ui.status('⏸ Parado');
    }

    function clicarUltimoCliente(){
        const lista=document.querySelectorAll('.customer-item');
        if(!lista.length) return false;
        const ultimo=lista[lista.length-1];
        click(ultimo);
        ui.cliente(ultimo.innerText.split('\n')[0].trim());
        return true;
    }

    function clicarTransferir(){
        const btn=document.querySelector('button[data-cy="cy-chat-center-header-transfer-attendance"]');
        if(!btn) return false;
        emTransferencia=true;
        ui.etapa('Transferindo');
        click(btn);
        return true;
    }

    function selecionarSetorVendas(){
        const select=document.querySelector('select[data-cy="cy-confirm-transfer-to-department"]');
        if(!select) return false;

        const opcao=[...select.options].find(o =>
            o.textContent.toUpperCase().includes('SETOR DE VENDAS')
        );
        if(!opcao) return false;

        select.value=opcao.value;
        select.dispatchEvent(new Event('change',{bubbles:true}));
        return true;
    }

    function clicarSelecionar(){
        const btn=document.querySelector('button[data-cy="cy-attendance-actions-btn-confirm-to-transfer-department"]');
        if(!btn) return false;
        click(btn);
        return true;
    }

    function selecionarAtendenteOnline() {
        const raw = localStorage.getItem('RD_STATUS_OPERADORES');
        if (!raw) return false;

        const onlines = JSON.parse(raw).online || [];

        for (let i = 0; i < LISTA_FIXA_ATENDENTES.length; i++) {
            const idx = (indiceOnline + i) % LISTA_FIXA_ATENDENTES.length;
            const nome = LISTA_FIXA_ATENDENTES[idx];

            if (!repetirUltimo && ultimoAtendente && nome === ultimoAtendente) continue;
            if (!onlines.includes(nome)) continue;

            const select = document.querySelector(
                'select[data-cy="cy-confirm-transfer-to-department"]'
            );
            if (!select) return false;

            const opcao = [...select.options].find(o =>
                o.textContent.trim() === nome
            );
            if (!opcao) continue;

            select.value = opcao.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));

            indiceOnline = (idx + 1) % LISTA_FIXA_ATENDENTES.length;
            ultimoAtendente = nome;
            ui.ultimo(nome);
            return true;
        }
        return false;
    }

    function clicarConfirmar(){
        const btn=document.querySelector('button[data-cy="cy-attendance-actions-btn-confirm-to-transfer-department"]');
        if(!btn) return false;
        click(btn);

        if (ultimoAtendente) incrementarContador(ultimoAtendente);

        repetirUltimo = false; // 👈 volta ao normal

        setTimeout(()=>{
            emTransferencia=false;
            atualizarFila();
            ui.etapa('Aguardando próximo cliente');
        },2000);
        return true;
    }

    function loopPrincipal(){
        if(!rodando||emTransferencia) return;

        const clientes=document.querySelectorAll('.customer-item');
        if(!clientes.length){
            atualizarFila();
            return;
        }

        if(!clicarUltimoCliente()) return;

        setTimeout(()=>{
            if(!clicarTransferir()) return;
            setTimeout(()=>{
                if(!selecionarSetorVendas()) return;
                setTimeout(()=>{
                    if(!clicarSelecionar()) return;
                    setTimeout(()=>{
                        if(!selecionarAtendenteOnline()) return;
                        setTimeout(clicarConfirmar,900);
                    },1000);
                },900);
            },900);
        },800);
    }

})();
