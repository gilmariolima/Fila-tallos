// ==UserScript==
// @name         RD Conversas - Auto Transferência (Setor de Vendas + UI)
// @namespace    https://tampermonkey.net/
// @version      2.0.0
// @description  Atualiza fila e transfere clientes para operadores online (A–Z) com painel visual
// @match        https://app.tallos.com.br/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let rodando = false;
    let emTransferencia = false;
    let loop = null;
    let indiceOnline = 0;

    /* ==========================
       UI VISUAL NA TELA
    ========================== */
    const ui = (() => {
        const box = document.createElement('div');
        box.innerHTML = `
            <div id="ui-status">⏸ Parado</div>
            <hr>
            <div><b>👤 Cliente:</b> <span id="ui-cliente">—</span></div>
            <div><b>🎯 Atendente:</b> <span id="ui-atendente">—</span></div>
            <div><b>📦 Etapa:</b> <span id="ui-etapa">—</span></div>
            <hr>
            <div><b>🟢 Onlines (A–Z)</b></div>
            <ul id="ui-onlines"></ul>
        `;

        Object.assign(box.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '260px',
            background: '#111',
            color: '#fff',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '13px',
            zIndex: 99999,
            boxShadow: '0 4px 12px rgba(0,0,0,.5)'
        });

        box.querySelectorAll('b').forEach(b => b.style.color = '#0dcaf0');
        box.querySelectorAll('hr').forEach(hr => hr.style.opacity = .2);
        document.body.appendChild(box);

        function pulse(el, color) {
            el.style.color = color;
            el.style.transform = 'scale(1.05)';
            setTimeout(() => {
                el.style.transform = 'scale(1)';
                el.style.color = '#fff';
            }, 300);
        }

        return {
            status(t) { const e = box.querySelector('#ui-status'); e.textContent = t; pulse(e, '#ffc107'); },
            cliente(t) { const e = box.querySelector('#ui-cliente'); e.textContent = t; pulse(e, '#0d6efd'); },
            atendente(t) { const e = box.querySelector('#ui-atendente'); e.textContent = t; pulse(e, '#20c997'); },
            etapa(t) { const e = box.querySelector('#ui-etapa'); e.textContent = t; pulse(e, '#fd7e14'); },
            onlines(lista) {
                const ul = box.querySelector('#ui-onlines');
                ul.innerHTML = '';
                lista.forEach(n => {
                    const li = document.createElement('li');
                    li.textContent = n;
                    ul.appendChild(li);
                });
            }
        };
    })();

    /* ==========================
       BOTÃO START / STOP
    ========================== */
    const botao = document.createElement('button');
    botao.textContent = '▶ INICIAR';
    Object.assign(botao.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 99999,
        padding: '10px 14px',
        fontSize: '14px',
        fontWeight: 'bold',
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer',
        background: '#28a745',
        color: '#fff',
        boxShadow: '0 2px 6px rgba(0,0,0,.3)'
    });

    botao.onclick = () => rodando ? parar() : iniciar();
    document.body.appendChild(botao);

    function iniciar() {
        if (rodando) return;
        rodando = true;
        botao.textContent = '⏸ PARAR';
        botao.style.background = '#dc3545';
        ui.status('▶ Rodando');
        loop = setInterval(loopPrincipal, 6500);
    }

    function parar() {
        rodando = false;
        clearInterval(loop);
        botao.textContent = '▶ INICIAR';
        botao.style.background = '#28a745';
        ui.status('⏸ Parado');
    }

    /* ==========================
       HELPERS
    ========================== */
    function click(el) {
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }

    /* ==========================
       ONLINES (LOCALSTORAGE)
    ========================== */
    function obterOnlinesOrdenados() {
        const raw = localStorage.getItem('RD_STATUS_OPERADORES');
        if (!raw) return [];

        try {
            const data = JSON.parse(raw);
            if (Date.now() - data.atualizadoEm > 15000) return [];

            const lista = [...new Set(data.online)].sort((a, b) =>
                a.localeCompare(b, 'pt-BR')
            );

            ui.onlines(lista);
            return lista;
        } catch {
            return [];
        }
    }

    function proximoOnline() {
        const lista = obterOnlinesOrdenados();
        if (!lista.length) return null;

        if (indiceOnline >= lista.length) indiceOnline = 0;
        const nome = lista[indiceOnline++];
        ui.atendente(nome);
        return nome;
    }

    /* ==========================
       PASSOS NA UI
    ========================== */
    function atualizarFila() {
        const btn = document.querySelector('.custom-queue-wait-icon');
        if (!btn) return false;
        ui.etapa('Atualizando fila');
        click(btn);
        return true;
    }

    function clicarUltimoCliente() {
        const lista = document.querySelectorAll('.customer-item');
        if (!lista.length) return false;

        const ultimo = lista[lista.length - 1];
        ultimo.scrollIntoView({ behavior: 'smooth', block: 'center' });
        click(ultimo);

        const nome =
            ultimo.querySelector('strong, p, span')?.innerText?.trim() ||
            ultimo.innerText.split('\n')[0].trim();

        ui.cliente(nome);
        ui.etapa('Cliente selecionado');
        return true;
    }

    function clicarTransferir() {
        const btn = document.querySelector(
            'button[data-cy="cy-chat-center-header-transfer-attendance"]'
        );
        if (!btn) return false;

        emTransferencia = true;
        ui.etapa('Clicando em Transferir');
        click(btn);
        return true;
    }

    function selecionarSetorVendas() {
        const select = document.querySelector(
            'select[data-cy="cy-confirm-transfer-to-department"]'
        );
        if (!select) return false;

        const opcao = [...select.options].find(o =>
            o.textContent.toUpperCase().includes('SETOR DE VENDAS')
        );
        if (!opcao) return false;

        select.value = opcao.value;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));

        ui.etapa('Setor de Vendas selecionado');
        return true;
    }

    function clicarSelecionar() {
        const btn = document.querySelector(
            'button[data-cy="cy-attendance-actions-btn-confirm-to-transfer-department"]'
        );
        if (!btn) return false;

        ui.etapa('Confirmando setor');
        click(btn);
        return true;
    }

    function selecionarAtendenteOnline() {
        const nome = proximoOnline();
        if (!nome) return false;

        const select = document.querySelector(
            'select[data-cy="cy-confirm-transfer-to-department"]'
        );
        if (!select) return false;

        const opcao = [...select.options].find(o =>
            o.textContent.trim() === nome
        );
        if (!opcao) return false;

        select.value = opcao.value;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));

        ui.etapa('Atendente selecionado');
        return true;
    }

    function clicarConfirmar() {
        const btn = document.querySelector(
            'button[data-cy="cy-attendance-actions-btn-confirm-to-transfer-department"]'
        );
        if (!btn) return false;

        ui.etapa('Transferência confirmada');
        click(btn);

        setTimeout(() => {
            emTransferencia = false;
            ui.etapa('Aguardando próximo cliente');
        }, 2000);

        return true;
    }

    /* ==========================
       LOOP PRINCIPAL
    ========================== */
    function loopPrincipal() {
        if (!rodando || emTransferencia) return;

        atualizarFila();

        setTimeout(() => {
            if (!clicarUltimoCliente()) return;

            setTimeout(() => {
                if (!clicarTransferir()) return;

                setTimeout(() => {
                    if (!selecionarSetorVendas()) return;

                    setTimeout(() => {
                        if (!clicarSelecionar()) return;

                        setTimeout(() => {
                            if (!selecionarAtendenteOnline()) return;

                            setTimeout(() => {
                                clicarConfirmar();
                            }, 900);

                        }, 1000);
                    }, 900);
                }, 900);
            }, 900);
        }, 800);
    }

})();
