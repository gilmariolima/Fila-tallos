// ==UserScript==
// @name        Auto Transferência
// @namespace   https://tampermonkey.net/
// @version     2.2.4
// @description Auto transferência com lista fixa de atendentes
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

    const LISTA_FIXA_ATENDENTES = [
        'Aline Santos','Aline Simplicio','Ana Beatriz','André Lucas','Bruno Amancio',
        'Caio Maciel','Cayo Mendes','Daniel Lima','David Elias','Felipe Sombra',
        'Gilmário Lima','Igor Schneider','João Pedro','Kaio Leão',
        'Léo Silva','Lucas Sombra','Luís Davi','Luiziane Ferreira','Marcelo Augusto',
        'Marcelo Santos','Marcus Luan','Melissa Bezerra','Pedro Santos',
        'Tifane Sombra','Uelisson Torres','William Rodrigues'
    ];
    const ui = (() => {
        const box = document.createElement('div');
        box.innerHTML = `
            <div id="ui-status">⏸ Parado</div><hr>
            <div><b>👤 Cliente:</b> <span id="ui-cliente">—</span></div>
            <div><b>🔴 Último a receber:</b><br><span id="ui-ultimo">—</span></div>
            <div><b>📦 Etapa:</b> <span id="ui-etapa">—</span></div>
            <hr><div><b>📋 Lista fixa (A–Z)</b></div>
            <ul id="ui-onlines"></ul>
        `;
        Object.assign(box.style,{
            position:'fixed',top:'20px',right:'20px',width:'300px',
            background:'#111',color:'#fff',padding:'12px',
            borderRadius:'8px',fontSize:'13px',zIndex:99999
        });
        document.body.appendChild(box);
        // ===== DRAG DO MODAL =====
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;
        
        // cursor visual
        box.style.cursor = 'move';
        
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
            box.style.right = 'auto'; // remove fixação
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            box.style.opacity = '1';
        });


        return {
            status:t=>box.querySelector('#ui-status').textContent=t,
            cliente:t=>box.querySelector('#ui-cliente').textContent=t,
            etapa:t=>box.querySelector('#ui-etapa').textContent=t,
            ultimo:t=>box.querySelector('#ui-ultimo').textContent=t||'—',
            lista(){
                const ul=box.querySelector('#ui-onlines');
                ul.innerHTML='';
                LISTA_FIXA_ATENDENTES.forEach(n=>{
                    const li=document.createElement('li');
                    li.textContent=n;
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

        return true;
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

    // 🔥 AGORA SOMENTE SETOR DE VENDAS
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

            if (ultimoAtendente && nome === ultimoAtendente) continue;
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
