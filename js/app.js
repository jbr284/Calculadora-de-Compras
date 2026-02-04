import * as Calc from './modules/calculator.js';
import * as Storage from './modules/storage.js';
import * as UI from './modules/ui.js';

let estadoAtual = {
    modo: null, 
    listaAtiva: { id: null, nome: '', itens: [] },
    totalGeral: 0
};

// --- ELEMENTOS DOM ---
const navBtns = document.querySelectorAll('.nav-btn');
const menuCalc = document.getElementById('calc-menu');
const interfaceGeral = document.getElementById('interface-geral');
const interfaceDetalhada = document.getElementById('interface-detalhada');
const formItem = document.getElementById('form-item');
const btnLimparLista = document.getElementById('btn-limpar-lista');

// --- INICIALIZAÇÃO ---
function init() {
    carregarMinhasListas();
    setupEventListeners();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(console.error);
}

function carregarMinhasListas() {
    const listas = Storage.getListas();
    UI.renderCardsListas(listas, 
        (id) => { Storage.deleteLista(id); carregarMinhasListas(); }, // Delete
        (lista) => { editarLista(lista); }, // Edit
        (lista) => { importarListaParaCalculadora(lista); } // Shop
    );
}

// --- EVENTOS ---
function setupEventListeners() {
    // Navegação Abas Rodapé
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            UI.switchView(btn.dataset.target);
            if (btn.dataset.target === 'view-listas') carregarMinhasListas();
            if (btn.dataset.target === 'view-calculadora') resetCalculadoraView();
        });
    });

    // Menu Calculadora (Botões grandes)
    document.querySelectorAll('.btn-option').forEach(btn => {
        btn.addEventListener('click', () => iniciarModoCalculadora(btn.dataset.mode));
    });

    // [CORREÇÃO] Evento Global para Botão Voltar (Captura btn-back E btn-back-small)
    document.body.addEventListener('click', (e) => {
        // Verifica se o elemento clicado (ou o pai dele) tem a classe de voltar
        if(e.target.classList.contains('btn-back') || e.target.classList.contains('btn-back-small')) {
            resetCalculadoraView();
        }
    });

    // Botões da Lista
    const btnAdd = document.getElementById('btn-add-item');
    if(btnAdd) btnAdd.addEventListener('click', adicionarItemDetalhado);
    
    document.getElementById('btn-salvar-lista').addEventListener('click', salvarListaAtual);

    if (btnLimparLista) {
        btnLimparLista.addEventListener('click', () => {
            if(confirm("Deseja realmente limpar toda a lista?")) {
                estadoAtual.listaAtiva.itens = [];
                atualizarUIListaDetalhada();
            }
        });
    }

    // FAB (Botão Flutuante)
    const fab = document.getElementById('btn-nova-lista-rapida');
    if(fab) fab.addEventListener('click', () => { 
        UI.switchView('view-calculadora'); 
        iniciarModoCalculadora('criar'); 
    });

    // Modal
    document.getElementById('btn-fechar-modal').addEventListener('click', () => {
        document.getElementById('modal-importar').classList.add('hidden');
    });
}

// --- CONTROLLERS ---

function resetCalculadoraView() {
    // Esconde tudo e mostra o menu
    menuCalc.classList.remove('hidden');
    interfaceGeral.classList.add('hidden');
    interfaceDetalhada.classList.add('hidden');
    estadoAtual.modo = null;
}

function iniciarModoCalculadora(modo) {
    menuCalc.classList.add('hidden');
    estadoAtual.modo = modo;

    if (modo === 'geral') {
        interfaceGeral.classList.remove('hidden');
        iniciarCalculadoraGeralLogica();
    } 
    else if (modo === 'criar') {
        configurarInterfaceDetalhada(true);
        estadoAtual.listaAtiva = { id: null, nome: '', itens: [] };
        document.getElementById('nome-lista-ativa').value = '';
        atualizarUIListaDetalhada();
    }
    else if (modo === 'importar') {
        abrirModalImportar();
    }
}

function configurarInterfaceDetalhada(modoEdicaoAtivo) {
    interfaceDetalhada.classList.remove('hidden');
    if(modoEdicaoAtivo) {
        formItem.classList.remove('hidden');
        btnLimparLista.classList.remove('hidden');
    } else {
        formItem.classList.add('hidden');
        btnLimparLista.classList.add('hidden');
    }
}

// --- LÓGICA CALCULADORA GERAL (FITA) ---
function iniciarCalculadoraGeralLogica() {
    UI.renderCalculadoraGeral(); 
    estadoAtual.totalGeral = 0;
    
    const visorTotal = document.getElementById('valor-total-geral');
    const inputCalc = document.getElementById('input-calc-geral');
    const historico = document.getElementById('historico-lista');
    const botoes = document.querySelectorAll('.btn-calc-action');
    const btnLimpar = document.getElementById('btn-limpar-geral');

    setTimeout(() => inputCalc.focus(), 300);

    const adicionarAoHistorico = (opSymbol, valor, novoTotal) => {
        const li = document.createElement('li');
        li.className = 'tape-item';
        li.innerHTML = `
            <span><span class="tape-op">${opSymbol}</span> ${Calc.formatarMoeda(valor)}</span>
            <span>= ${Calc.formatarMoeda(novoTotal)}</span>
        `;
        historico.appendChild(li);
        historico.parentElement.scrollTop = historico.parentElement.scrollHeight;
    };

    botoes.forEach(btn => {
        btn.addEventListener('click', () => {
            const inputVal = parseFloat(inputCalc.value);
            const op = btn.dataset.op;

            if (isNaN(inputVal)) return;

            let opSymbol = '';
            
            // Lógica para primeiro valor
            if (historico.children.length === 0 && estadoAtual.totalGeral === 0) {
                 if(op === 'mult' || op === 'div') {
                     estadoAtual.totalGeral = inputVal;
                     opSymbol = 'Início';
                 }
            }

            if (!opSymbol) {
                switch (op) {
                    case 'soma': estadoAtual.totalGeral += inputVal; opSymbol = '+'; break;
                    case 'subt': estadoAtual.totalGeral -= inputVal; opSymbol = '-'; break;
                    case 'mult': estadoAtual.totalGeral *= inputVal; opSymbol = '×'; break;
                    case 'div': 
                        if(inputVal === 0) return alert("Erro: Divisão por zero");
                        estadoAtual.totalGeral /= inputVal; opSymbol = '÷'; break;
                }
            }

            visorTotal.textContent = Calc.formatarMoeda(estadoAtual.totalGeral);
            adicionarAoHistorico(opSymbol, inputVal, estadoAtual.totalGeral);
            
            inputCalc.value = '';
            inputCalc.focus();
        });
    });

    btnLimpar.addEventListener('click', () => {
        estadoAtual.totalGeral = 0;
        visorTotal.textContent = '0.00';
        historico.innerHTML = '';
        inputCalc.value = '';
        inputCalc.focus();
    });
}

// --- MODO EDITAR ---
function editarLista(lista) {
    UI.switchView('view-calculadora');
    menuCalc.classList.add('hidden');
    estadoAtual.modo = 'criar'; // Usa interface de criação/edição
    configurarInterfaceDetalhada(true); // Mostra formulário e botão limpar

    // Carrega a lista completa, mantendo preços se existirem
    estadoAtual.listaAtiva = JSON.parse(JSON.stringify(lista));
    document.getElementById('nome-lista-ativa').value = lista.nome;
    atualizarUIListaDetalhada();
}

// --- MODO IMPORTAR/COMPRAR ---
function abrirModalImportar() {
    const modal = document.getElementById('modal-importar');
    const container = document.getElementById('lista-importar-container');
    const listas = Storage.getListas();
    
    container.innerHTML = '';
    if (listas.length === 0) container.innerHTML = '<p style="text-align:center">Sem listas salvas.</p>';
    else {
        listas.forEach(lista => {
            const div = document.createElement('div');
            div.className = 'item-importar';
            div.innerHTML = `<strong>${lista.nome}</strong> <small>(${lista.itens.length} itens)</small>`;
            div.addEventListener('click', () => {
                modal.classList.add('hidden');
                importarListaParaCalculadora(lista);
            });
            container.appendChild(div);
        });
    }
    modal.classList.remove('hidden');
}

function importarListaParaCalculadora(lista) {
    UI.switchView('view-calculadora');
    menuCalc.classList.add('hidden');
    estadoAtual.modo = 'importar'; 
    configurarInterfaceDetalhada(false); // Esconde form

    // Carrega a lista mantendo os preços salvos
    estadoAtual.listaAtiva = JSON.parse(JSON.stringify(lista));
    
    document.getElementById('nome-lista-ativa').value = lista.nome;
    atualizarUIListaDetalhada();
}

// --- ADICIONAR ITEM ---
function adicionarItemDetalhado() {
    const els = {
        prod: document.getElementById('produto'),
        marca: document.getElementById('marca'),
        qtd: document.getElementById('quantidade'),
        unC: document.getElementById('unidade-compra'),
        preco: document.getElementById('preco'),
        unP: document.getElementById('unidade-preco')
    };

    const produto = els.prod.value;
    const qtd = parseFloat(els.qtd.value);
    let preco = parseFloat(els.preco.value);

    if (!produto || isNaN(qtd)) return alert("Preencha produto e quantidade.");
    
    let total = 0;
    if (isNaN(preco)) preco = 0;
    
    if (preco > 0) {
        try { total = Calc.calcularTotalItem(qtd, els.unC.value, preco, els.unP.value); } 
        catch(e) { return alert(e.message); }
    }

    estadoAtual.listaAtiva.itens.push({ 
        produto, marca: els.marca.value, quantidade: qtd, unidade: els.unC.value, 
        preco, unidadePreco: els.unP.value, total, confirmado: false 
    });
    
    els.prod.value = ''; els.marca.value = ''; els.qtd.value = ''; els.preco.value = '';
    els.prod.focus();
    atualizarUIListaDetalhada();
}

// --- RENDERIZAÇÃO E ATUALIZAÇÃO ---
function atualizarUIListaDetalhada() {
    const isImport = estadoAtual.modo === 'importar';

    UI.renderItensCalculadora(
        estadoAtual.listaAtiva.itens, 
        (index) => {
            estadoAtual.listaAtiva.itens.splice(index, 1);
            atualizarUIListaDetalhada();
        },
        (index, dados) => {
            const item = estadoAtual.listaAtiva.itens[index];
            
            // Toggle Desfazer
            if (item.confirmado) {
                item.confirmado = false;
                atualizarUIListaDetalhada();
                atualizarTotal();
                return;
            }

            item.marca = dados.marca;
            item.quantidade = dados.quantidade;
            item.unidade = dados.unidade;
            item.preco = dados.preco;
            item.unidadePreco = dados.unidadePreco;

            if (isNaN(item.preco) || item.preco <= 0) return alert("Insira um preço.");

            try {
                item.total = Calc.calcularTotalItem(item.quantidade, item.unidade, item.preco, item.unidadePreco);
                item.confirmado = true;
                atualizarUIListaDetalhada();
            } catch (e) {
                alert(e.message);
            }
        },
        isImport
    );
    atualizarTotal();
}

function atualizarTotal() {
    const total = estadoAtual.listaAtiva.itens.reduce((acc, item) => acc + (item.total || 0), 0);
    const el = document.getElementById('total-detalhado');
    if(el) el.textContent = Calc.formatarMoeda(total);
}

function salvarListaAtual() {
    if (estadoAtual.listaAtiva.itens.length === 0) return alert("Lista vazia.");
    let nome = document.getElementById('nome-lista-ativa').value;
    if (!nome || !nome.trim()) nome = `Lista ${new Date().toLocaleDateString()}`;
    estadoAtual.listaAtiva.nome = nome;
    
    Storage.saveLista(estadoAtual.listaAtiva);
    UI.showMessage("Lista salva!");
}

init();
