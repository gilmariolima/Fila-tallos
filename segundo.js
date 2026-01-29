// ==UserScript==
// @name         RD Conversas - Auto Transferência Setor de Vendas (Online A–Z)
// @namespace    https://tampermonkey.net/
// @version      1.3.0
// @description  Atualiza fila e transfere clientes para operadores online do Setor de Vendas em ordem alfabética
// @match        https://app.tallos.com.br/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let rodando = false;
    let emTransferencia = false;
    let loop = null;
    let indiceOnline = 0; // 🔁 round-robin entre onlines

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
        console.log('▶ Loop iniciado');
        loop = setInterval(loopPrincipal, 6000);
    }

    function parar() {
        rodando = false;
        clearInterval(loop);
        botao.textContent = '▶ INICIAR';
        botao.style.background = '#28a745';
        console.log('⏹ Loop parado');
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

            const lista = Array.isArray(data.online)
                ? [...new Set(data.online)].sort((a, b) =>
                    a.localeCompare(b, 'pt-BR')
                )
                : [];

            console.log('🟢 ONLINE (A–Z):', lista);
            return lista;
        } catch {
            return [];
        }
    }

    function proximoOnline() {
        const lista = obterOnlinesOrdenados();
        if (!lista.length) return null;

        if (indiceOnline >= lista.length) indiceOnline = 0;

        const nome = lista[indiceOnline];
        indiceOnline++;

        console.log('🎯 Próximo atendente:', nome);
        return nome;
    }

    /* ==========================
       PASSOS NA UI
    ========================== */
    function atualizarFila() {
        const btn = document.querySelector('.custom-queue-wait-icon');
        if (!btn) return false;
        click(btn);
        console.log('🔄 Fila atualizada');
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

        console.log('👤 Cliente selecionado:', nome);
        return true;
    }

    function clicarTransferir() {
        const btn = document.querySelector(
            'button[data-cy="cy-chat-center-header-transfer-attendance"]'
        );
        if (!btn) return false;

        emTransferencia = true;
        click(btn);
        console.log('🔁 Transferir clicado');
        return true;
    }

    function selecionarSetorDeVendas() {
        const select = document.querySelector(
            'select[data-cy="cy-confirm-transfer-to-department"]'
        );
        if (!select) return false;

        const opcao = [...select.options].find(o =>
            o.textContent.toUpperCase().includes('SETOR DE VENDAS')
        );
        if (!opcao) {
            console.log('❌ Opção SETOR DE VENDAS não encontrada');
            return false;
        }

        select.value = opcao.value;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));

        console.log('📂 Setor de Vendas selecionado');
        return true;
    }

    function clicarSelecionar() {
        const btn = document.querySelector(
            'button[data-cy="cy-attendance-actions-btn-confirm-to-transfer-department"]'
        );
        if (!btn) return false;

        click(btn);
        console.log('🟢 Selecionar clicado');
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
        if (!opcao) {
            console.log('❌ Atendente não encontrado no select:', nome);
            return false;
        }

        select.value = opcao.value;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));

        console.log('👨‍💼 Atendente selecionado:', nome);
        return true;
    }

    function clicarConfirmar() {
        const btn = document.querySelector(
            'button[data-cy="cy-attendance-actions-btn-confirm-to-transfer-department"]'
        );
        if (!btn) return false;

        click(btn);
        console.log('✅ Transferência confirmada');

        setTimeout(() => {
            emTransferencia = false;
            console.log('🔓 Pronto para próximo cliente');
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
                    if (!selecionarSetorDeVendas()) return;

                    setTimeout(() => {
                        if (!clicarSelecionar()) return;

                        setTimeout(() => {
                            if (!selecionarAtendenteOnline()) return;

                            setTimeout(() => {
                                clicarConfirmar();
                            }, 1000);

                        }, 1200);
                    }, 1000);
                }, 1200);
            }, 1000);
        }, 800);
    }

})();
