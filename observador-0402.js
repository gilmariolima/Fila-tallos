// ==UserScript==
// @name         OBSERVADOR
// @namespace    https://tampermonkey.net/
// @version      1.8.0
// @description  Lista operadores: verde = online, qualquer outra cor = offline (modal flutuante + contador)
// @match        https://app.tallos.com.br/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const AGENTES_PERMITIDOS = [
        'Igor Schneider','Felipe Sombra', 'Melissa Bezerra',
        'Luiziane Ferreira', 'Daniel Lima', 'Marcelo Santos', 'João Pedro',
        'Aline Simplicio', 'David Elias', 'Marcus Luan', 'Tifane Sombra',
        'Caio Maciel', 'Ana Beatriz', 'Marcelo Augusto', 'Uelisson Torres',
        'Cayo Mendes', 'Pedro Santos', 'Kaio Leão', 'William Rodrigues',
        'André Lucas', 'Luís Davi', 'Bruno Amancio', 'Lucas Sombra',
        'Léo Silva', 'Aline Santos', 'Gilmário Lima', 'Alexandre Oliveira'
    ];

    let intervalo = null;
    let rodando = false;

    // ===== MODAL =====
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div id="drag-handle"
             style="font-weight:bold;margin-bottom:8px;cursor:move;
                    display:flex;justify-content:space-between;align-items:center;">
           <span>Observador</span>
           <span id="contador-online"
                 style="background:#28a745;color:#fff;
                        padding:2px 8px;border-radius:12px;font-size:12px;">
              0
           </span>
        </div>

        <div>
            <b style="color:#28a745">🟢 Online</b>
            <ul id="ui-online"></ul>
        </div>

        <div>
            <b style="color:#dc3545">🔴 Offline</b>
            <ul id="ui-offline"></ul>
        </div>
    `;

    Object.assign(modal.style, {
        position: 'fixed',
        top: '20px',
        left: '20px',
        width: '260px',
        maxHeight: '80vh',
        overflowY: 'auto',
        background: '#111',
        color: '#fff',
        padding: '12px',
        borderRadius: '10px',
        fontSize: '13px',
        zIndex: 99999,
        boxShadow: '0 10px 30px rgba(0,0,0,.5)'
    });

    document.body.appendChild(modal);

    // ===== DRAG =====
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    modal.addEventListener('mousedown', (e) => {
        dragging = true;
        offsetX = e.clientX - modal.getBoundingClientRect().left;
        offsetY = e.clientY - modal.getBoundingClientRect().top;
        modal.style.opacity = '0.85';
    });

    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        modal.style.left = (e.clientX - offsetX) + 'px';
        modal.style.top = (e.clientY - offsetY) + 'px';
        modal.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
        dragging = false;
        modal.style.opacity = '1';
    });

    function renderLista(id, lista) {
        const ul = modal.querySelector(id);
        ul.innerHTML = '';
        lista.forEach(nome => {
            const li = document.createElement('li');
            li.textContent = nome;
            ul.appendChild(li);
        });
    }

    // 🔥 REGRA SIMPLES
    function corStatus(svg) {
        const color = getComputedStyle(svg).color;
        if (color.includes('40, 167, 69')) return 'online'; // verde
        return 'offline';
    }

    function pegarNome(svg) {
        let card = svg.parentElement;
        while (card && !card.querySelector('p')) {
            card = card.parentElement;
        }
        return card?.querySelector('p')?.innerText?.trim() || null;
    }

    function listarTodos() {
        if (!rodando) return;

        const online = [];
        const offline = [];

        document.querySelectorAll('svg.fa-circle').forEach(svg => {
            const nome = pegarNome(svg);
            if (!nome) return;
            if (!AGENTES_PERMITIDOS.includes(nome)) return;

            const status = corStatus(svg);
            if (status === 'online') online.push(nome);
            else offline.push(nome);
        });

        online.sort((a,b)=>a.localeCompare(b,'pt-BR'));
        offline.sort((a,b)=>a.localeCompare(b,'pt-BR'));

        window.statusOperadoresSetor = { online, offline };

        localStorage.setItem(
            'RD_STATUS_OPERADORES',
            JSON.stringify({
                online,
                offline,
                atualizadoEm: Date.now()
            })
        );

        renderLista('#ui-online', online);
        renderLista('#ui-offline', offline);

        // 🔢 CONTADOR
        modal.querySelector('#contador-online').textContent = online.length;
    }

    function iniciar() {
        if (rodando) return;
        rodando = true;
        intervalo = setInterval(listarTodos, 1000);
        botao.textContent = '⏸ PARAR';
        botao.style.background = '#dc3545';
    }

    function parar() {
        rodando = false;
        clearInterval(intervalo);
        botao.textContent = '▶ INICIAR';
        botao.style.background = '#28a745';
    }

    // ===== BOTÃO =====
    const botao = document.createElement('button');
    botao.textContent = '▶ INICIAR';
    Object.assign(botao.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '99999',
        padding: '10px 14px',
        fontSize: '14px',
        fontWeight: 'bold',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        background: '#28a745',
        color: '#fff',
        boxShadow: '0 2px 6px rgba(0,0,0,.3)'
    });

    botao.addEventListener('click', () => {
        rodando ? parar() : iniciar();
    });

    document.body.appendChild(botao);
})();
