import * as Calc from './modules/calculator.js';
import * as Storage from './modules/storage.js';
import * as UI from './modules/ui.js';

// --- ESTADO DA APLICAÇÃO ---
let estadoAtual = {
    modo: null, // 'geral', 'criar', 'importar'
    listaAtiva: {
        id: null,
        nome: '',
        itens: []
    },
    totalGeralSimples: 0
};

// --- ELEMENTOS DOM ---
const navBtns = document.querySelectorAll('.nav-btn');
const menuCalc = document.getElementById('calc-menu');
const interfaceGeral = document.getElementById('interface-geral');
const interfaceDetalhada = document.getElementById('interface-detalhada');

// --- INICIALIZAÇÃO ---
function init() {
    carregarMinhasListas();
    setupEventListeners();
}

function carregarMinhasListas() {
    const listas = Storage.getListas();
    UI.renderCardsListas(listas, 
        (id) => { Storage.deleteLista(id); carregarMinhasListas(); }, // Delete Callback
        (lista) => { importarListaParaCalculadora(lista); } // Open Callback
    );
}

// --- LÓGICA DE NAVEGAÇÃO ---
function setupEventListeners() {
    // Navegação Principal (Abas)
    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = btn.dataset.target;
            UI.switchView(target);
            if (target === 'view-listas') carregarMinhasListas();
            if (target === 'view-calculadora') resetCalculadoraView();
        });
    });

    // Menu da Calculadora (Opções 1, 2, 3)
    document.querySelectorAll('.btn-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const modo = btn.dataset.mode;
            iniciarModoCalculadora(modo);
        });
    });

    // Botões de Voltar
    document.querySelectorAll('.btn-back, .btn-back-small').forEach(btn => {
        btn.addEventListener('click', resetCalculadoraView);
    });

    // --- LÓGICA CALCULADORA GERAL (OPÇÃO 1) ---
    document.getElementById('btn-somar-geral').addEventListener('click', () => {
        const input = document.getElementById('input-valor-geral');
        const valor = parseFloat(input.value);
        if (!isNaN(valor) && valor > 0) {
            estadoAtual.totalGeralSimples += valor;
            document.getElementById('valor-total-geral').textContent = Calc.formatarMoeda(estadoAtual.totalGeralSimples);
            
            // Adiciona ao histórico visual simples
            const li = document.createElement('li');
            li.textContent = `+ R$ ${Calc.formatarMoeda(valor)}`;
            document.getElementById('historico-geral').prepend(li);
            
            input.value = '';
            input.focus();
        }
    });

    // --- LÓGICA CALCULADORA DETALHADA (OPÇÃO 2 e 3) ---
    document.getElementById('btn-add-item').addEventListener('click', adicionarItemDetalhado);
    
    document.getElementById('btn-salvar-lista').addEventListener('click', () => {
        if (estadoAtual.listaAtiva.itens.length === 0) {
            alert("A lista está vazia.");
            return;
        }
        
        let nome = document.getElementById('nome-lista-ativa').value;
        if (!nome) nome = `Lista ${new Date().toLocaleDateString()}`;
        
        estadoAtual.listaAtiva.nome = nome;
        
        Storage.saveLista(estadoAtual.listaAtiva);
        UI.showMessage("Lista salva com sucesso!");
        
        // Volta para home
        UI.switchView('view-listas');
        carregarMinhasListas();
    });

    document.getElementById('btn-limpar-lista').addEventListener('click', () => {
        if(confirm("Limpar toda a lista atual?")) {
            estadoAtual.listaAtiva.itens = [];
            atualizarUIListaDetalhada();
        }
    });

    // Botão FAB na Home
    document.getElementById('btn-nova-lista-rapida').addEventListener('click', () => {
        UI.switchView('view-calculadora');
        iniciarModoCalculadora('criar');
    });

    // Modal Importar
    document.getElementById('btn-fechar-modal').addEventListener('click', () => {
        document.getElementById('modal-importar').classList.add('hidden');
    });
}

// --- FUNÇÕES DE CONTROLE ---

function resetCalculadoraView() {
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
        estadoAtual.totalGeralSimples = 0;
        document.getElementById('valor-total-geral').textContent = '0.00';
        document.getElementById('historico-geral').innerHTML = '';
        document.getElementById('input-valor-geral').focus();
    } 
    else if (modo === 'criar') {
        interfaceDetalhada.classList.remove('hidden');
        // Reseta lista atual
        estadoAtual.listaAtiva = { id: null, nome: '', itens: [] };
        document.getElementById('nome-lista-ativa').value = '';
        atualizarUIListaDetalhada();
    }
    else if (modo === 'importar') {
        abrirModalImportar();
    }
}

function abrirModalImportar() {
    const modal = document.getElementById('modal-importar');
    const container = document.getElementById('lista-importar-container');
    const listas = Storage.getListas();

    container.innerHTML = '';
    listas.forEach(lista => {
        const div = document.createElement('div');
        div.className = 'item-importar';
        div.textContent = `${lista.nome} (${lista.itens.length} itens)`;
        div.addEventListener('click', () => {
            modal.classList.add('hidden');
            importarListaParaCalculadora(lista);
        });
        container.appendChild(div);
    });

    modal.classList.remove('hidden');
}

function importarListaParaCalculadora(lista) {
    // Muda para a tab calculadora se não estiver
    UI.switchView('view-calculadora');
    menuCalc.classList.add('hidden');
    interfaceDetalhada.classList.remove('hidden');

    // Clona a lista para não editar a original diretamente até salvar
    estadoAtual.listaAtiva = JSON.parse(JSON.stringify(lista));
    document.getElementById('nome-lista-ativa').value = lista.nome;
    atualizarUIListaDetalhada();
}

function adicionarItemDetalhado() {
    const produto = document.getElementById('produto').value;
    const qtd = parseFloat(document.getElementById('quantidade').value);
    const unCompra = document.getElementById('unidade-compra').value;
    const preco = parseFloat(document.getElementById('preco').value);
    const unPreco = document.getElementById('unidade-preco').value;

    if (!produto || isNaN(qtd) || isNaN(preco)) {
        alert("Preencha os dados corretamente.");
        return;
    }

    try {
        const total = Calc.calcularTotalItem(qtd, unCompra, preco, unPreco);
        
        const item = {
            produto,
            quantidade: qtd,
            unidade: unCompra,
            preco,
            unidadePreco: unPreco,
            total
        };

        estadoAtual.listaAtiva.itens.push(item);
        atualizarUIListaDetalhada();
        
        // Limpa campos rápidos
        document.getElementById('produto').value = '';
        document.getElementById('quantidade').value = '';
        document.getElementById('preco').value = '';
        document.getElementById('produto').focus();

    } catch (e) {
        alert("Erro: " + e.message);
    }
}

function atualizarUIListaDetalhada() {
    UI.renderItensCalculadora(estadoAtual.listaAtiva.itens, (index) => {
        estadoAtual.listaAtiva.itens.splice(index, 1);
        atualizarUIListaDetalhada();
    });

    const total = estadoAtual.listaAtiva.itens.reduce((acc, item) => acc + item.total, 0);
    document.getElementById('total-detalhado').textContent = Calc.formatarMoeda(total);
}

// Inicializa
init();