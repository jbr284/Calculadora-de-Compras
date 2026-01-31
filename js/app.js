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
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(() => console.log("Service Worker registrado."))
            .catch(err => console.error("Erro SW:", err));
    }
}

function carregarMinhasListas() {
    const listas = Storage.getListas();
    UI.renderCardsListas(listas, 
        (id) => { Storage.deleteLista(id); carregarMinhasListas(); }, // Delete Callback
        (lista) => { importarListaParaCalculadora(lista); } // Open Callback
    );
}

// --- LÓGICA DE EVENTOS ---
function setupEventListeners() {
    // Navegação Principal
    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = btn.dataset.target;
            UI.switchView(target);
            if (target === 'view-listas') carregarMinhasListas();
            if (target === 'view-calculadora') resetCalculadoraView();
        });
    });

    // Menu da Calculadora
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

    // --- CALCULADORA GERAL ---
    const btnSomarGeral = document.getElementById('btn-somar-geral');
    if (btnSomarGeral) {
        btnSomarGeral.addEventListener('click', () => {
            const input = document.getElementById('input-valor-geral');
            const valor = parseFloat(input.value);
            if (!isNaN(valor) && valor > 0) {
                estadoAtual.totalGeralSimples += valor;
                document.getElementById('valor-total-geral').textContent = Calc.formatarMoeda(estadoAtual.totalGeralSimples);
                
                const li = document.createElement('li');
                li.textContent = `+ R$ ${Calc.formatarMoeda(valor)}`;
                const listaHist = document.getElementById('historico-geral');
                if(listaHist) listaHist.prepend(li);
                
                input.value = '';
                input.focus();
            }
        });
    }

    // --- CALCULADORA DETALHADA ---
    const btnAddItem = document.getElementById('btn-add-item');
    if (btnAddItem) {
        btnAddItem.addEventListener('click', adicionarItemDetalhado);
    }
    
    const btnSalvarLista = document.getElementById('btn-salvar-lista');
    if (btnSalvarLista) {
        btnSalvarLista.addEventListener('click', () => {
            if (estadoAtual.listaAtiva.itens.length === 0) {
                alert("A lista está vazia.");
                return;
            }
            
            let nome = document.getElementById('nome-lista-ativa').value;
            if (!nome || nome.trim() === "") {
                nome = `Lista ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString().slice(0,5)}`;
            }
            
            estadoAtual.listaAtiva.nome = nome;
            
            Storage.saveLista(estadoAtual.listaAtiva);
            UI.showMessage("Lista salva com sucesso!");
            
            UI.switchView('view-listas');
            carregarMinhasListas();
        });
    }

    const btnLimparLista = document.getElementById('btn-limpar-lista');
    if (btnLimparLista) {
        btnLimparLista.addEventListener('click', () => {
            if(confirm("Limpar toda a lista atual?")) {
                estadoAtual.listaAtiva.itens = [];
                atualizarUIListaDetalhada();
            }
        });
    }

    const fab = document.getElementById('btn-nova-lista-rapida');
    if (fab) {
        fab.addEventListener('click', () => {
            UI.switchView('view-calculadora');
            iniciarModoCalculadora('criar');
        });
    }

    const btnFecharModal = document.getElementById('btn-fechar-modal');
    if (btnFecharModal) {
        btnFecharModal.addEventListener('click', () => {
            const modal = document.getElementById('modal-importar');
            if(modal) modal.classList.add('hidden');
        });
    }
}

// --- FUNÇÕES DE CONTROLE ---

function resetCalculadoraView() {
    if(menuCalc) menuCalc.classList.remove('hidden');
    if(interfaceGeral) interfaceGeral.classList.add('hidden');
    if(interfaceDetalhada) interfaceDetalhada.classList.add('hidden');
    estadoAtual.modo = null;
}

function iniciarModoCalculadora(modo) {
    if(menuCalc) menuCalc.classList.add('hidden');
    estadoAtual.modo = modo;

    if (modo === 'geral') {
        if(interfaceGeral) interfaceGeral.classList.remove('hidden');
        estadoAtual.totalGeralSimples = 0;
        const displayGeral = document.getElementById('valor-total-geral');
        if(displayGeral) displayGeral.textContent = '0.00';
        const histGeral = document.getElementById('historico-geral');
        if(histGeral) histGeral.innerHTML = '';
        const inputGeral = document.getElementById('input-valor-geral');
        if(inputGeral) inputGeral.focus();

    } 
    else if (modo === 'criar') {
        if(interfaceDetalhada) interfaceDetalhada.classList.remove('hidden');
        estadoAtual.listaAtiva = { id: null, nome: '', itens: [] };
        const inputNome = document.getElementById('nome-lista-ativa');
        if(inputNome) inputNome.value = '';
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

    if (!container || !modal) return;

    container.innerHTML = '';
    
    if (listas.length === 0) {
        container.innerHTML = '<p style="text-align:center;">Nenhuma lista salva.</p>';
    } else {
        listas.forEach(lista => {
            const div = document.createElement('div');
            div.className = 'item-importar';
            div.innerHTML = `<strong>${lista.nome}</strong> <br> <small>${lista.itens.length} itens</small>`;
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
    if(menuCalc) menuCalc.classList.add('hidden');
    if(interfaceDetalhada) interfaceDetalhada.classList.remove('hidden');

    estadoAtual.listaAtiva = JSON.parse(JSON.stringify(lista));
    
    const inputNome = document.getElementById('nome-lista-ativa');
    if(inputNome) inputNome.value = lista.nome;
    
    atualizarUIListaDetalhada();
}

function adicionarItemDetalhado() {
    const produtoInput = document.getElementById('produto');
    const marcaInput = document.getElementById('marca'); // Captura Marca
    const qtdInput = document.getElementById('quantidade');
    const unCompraInput = document.getElementById('unidade-compra');
    const precoInput = document.getElementById('preco');
    const unPrecoInput = document.getElementById('unidade-preco');

    const produto = produtoInput.value;
    const marca = marcaInput.value;
    const qtd = parseFloat(qtdInput.value);
    const unCompra = unCompraInput.value;
    const unPreco = unPrecoInput.value;
    
    // Tratamento Preço Opcional
    let preco = parseFloat(precoInput.value);
    let total = 0;

    if (!produto || isNaN(qtd)) {
        alert("Preencha pelo menos o Nome do Produto e a Quantidade.");
        return;
    }

    // Se não tem preço ou é zero, ignoramos validação de unidade
    if (isNaN(preco) || preco === 0) {
        preco = 0;
        total = 0;
    } else {
        try {
            total = Calc.calcularTotalItem(qtd, unCompra, preco, unPreco);
        } catch (e) {
            alert("Erro de Unidade: " + e.message);
            return;
        }
    }

    const item = {
        produto,
        marca,
        quantidade: qtd,
        unidade: unCompra,
        preco,
        unidadePreco: unPreco,
        total
    };

    estadoAtual.listaAtiva.itens.push(item);
    atualizarUIListaDetalhada();
    
    // Limpar campos
    produtoInput.value = '';
    marcaInput.value = '';
    qtdInput.value = '';
    precoInput.value = '';
    produtoInput.focus();
}

function atualizarUIListaDetalhada() {
    UI.renderItensCalculadora(estadoAtual.listaAtiva.itens, (index) => {
        estadoAtual.listaAtiva.itens.splice(index, 1);
        atualizarUIListaDetalhada();
    });

    const total = estadoAtual.listaAtiva.itens.reduce((acc, item) => acc + item.total, 0);
    const totalEl = document.getElementById('total-detalhado');
    if(totalEl) totalEl.textContent = Calc.formatarMoeda(total);
}

// Inicia
init();
