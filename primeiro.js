
// ==UserScript==
// @name         1
// @namespace    https://tampermonkey.net/
// @version      1.3.0
// @description  Lista operadores por status, permite pausar e salva no localStorage
// @match        https://app.tallos.com.br/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 🔒 LISTA DE AGENTES PERMITIDOS
    const AGENTES_PERMITIDOS = [
        'Igor Schneider', 'Ayla Nicole', 'Felipe Sombra', 'Melissa Bezerra',
        'Luiziane Ferreira', 'Daniel Lima', 'Marcelo Santos', 'João Pedro',
        'Aline Simplicio', 'David Elias', 'Marcus Luan', 'Tifane Sombra',
        'Caio Maciel', 'Ana Beatriz', 'Marcelo Augusto', 'Uelisson Torres',
        'Cayo Mendes', 'Pedro Santos', 'Kaio Leão', 'William Rodrigues',
        'André Lucas', 'Luís Davi', 'Bruno Amancio', 'Lucas Sombra',
        'Léo Silva', 'Aline Santos', 'Gilmário Lima'
    ];

    let intervalo = null;
    let rodando = false;

    function corStatus(svg) {
        const color = getComputedStyle(svg).color;
        if (color.includes('40, 167, 69')) return 'online';
        if (color.includes('220, 53, 69')) return 'offline';
        if (color.includes('255, 193, 7')) return 'ocupado';
        return 'desconhecido';
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
        const ocupado = [];

        document.querySelectorAll('svg.fa-circle').forEach(svg => {
            const nome = pegarNome(svg);
            if (!nome) return;
            if (!AGENTES_PERMITIDOS.includes(nome)) return;

            const status = corStatus(svg);
            if (status === 'online') online.push(nome);
            if (status === 'offline') offline.push(nome);
            if (status === 'ocupado') ocupado.push(nome);
        });

        // ordena online alfabeticamente
        online.sort((a, b) => a.localeCompare(b, 'pt-BR'));

        // 🔐 salva em memória global (opcional)
        window.statusOperadoresSetor = { online, offline, ocupado };

        // 💾 salva no localStorage (COMUNICAÇÃO ENTRE ABAS)
        localStorage.setItem(
            'RD_STATUS_OPERADORES',
            JSON.stringify({
                online,
                offline,
                ocupado,
                atualizadoEm: Date.now()
            })
        );

        console.clear();
        console.log('🟢 ONLINE:', online);
        console.log('🔴 OFFLINE:', offline);
        console.log('🟡 OCUPADO:', ocupado);
        console.log('💾 Salvo no localStorage');
    }

    // ▶️ START
    function iniciar() {
        if (rodando) return;
        rodando = true;
        intervalo = setInterval(listarTodos, 1000);
        botao.textContent = '⏸ PARAR';
        botao.style.background = '#dc3545';
    }

    // ⏸ STOP
    function parar() {
        rodando = false;
        clearInterval(intervalo);
        botao.textContent = '▶ INICIAR';
        botao.style.background = '#28a745';
    }

    // 🔘 BOTÃO NA TELA
    const botao = document.createElement('button');
    botao.textContent = '▶ INICIAR';
    botao.style.position = 'fixed';
    botao.style.bottom = '20px';
    botao.style.right = '20px';
    botao.style.zIndex = '99999';
    botao.style.padding = '10px 14px';
    botao.style.fontSize = '14px';
    botao.style.fontWeight = 'bold';
    botao.style.border = 'none';
    botao.style.borderRadius = '6px';
    botao.style.cursor = 'pointer';
    botao.style.background = '#28a745';
    botao.style.color = '#fff';
    botao.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';

    botao.addEventListener('click', () => {
        rodando ? parar() : iniciar();
    });

    document.body.appendChild(botao);
})();
