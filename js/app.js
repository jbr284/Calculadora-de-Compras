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
const formItem = document.getElementById('form-item'); // Formulário de adição

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
        (id) => { Storage.deleteLista(id); carregarMinhasListas(); }, // Callback Deletar
        (lista) => { importarListaParaCalculadora(lista); } // Callback Abrir
    );
}

// --- LÓGICA DE EVENTOS ---
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

    // Menu da Calculadora (Opções)
    document.querySelectorAll('.btn-option').forEach(btn => {
        btn.addEventListener('click', () => {
            iniciarModoCalculadora(btn.dataset.mode);
        });
    });

    // Botões de Voltar
    document.querySelectorAll('.btn-back, .btn-back-small').forEach(btn => {
        btn.addEventListener('click', resetCalculadoraView);
    });

    // --- CALCULADORA GERAL ---
    const btnSomarGeral = document.getElementById('btn-somar-geral');
    if (btnSomarGeral) {
        btnSomarGeral.addEventListener('click', somarGeral);
    }

    // --- CALCULADORA DETALHADA ---
    const btnAddItem = document.getElementById('btn-add-item');
    if (btnAddItem) {
        btnAddItem.addEventListener('click', adicionarItemDetalhado);
    }
    
    // Botão SALVAR LISTA (Agora serve tanto para criar quanto para salvar progresso da importada)
    const btnSalvarLista = document.getElementById('btn-salvar-lista');
    if (btnSalvarLista) {
        btnSalvarLista.addEventListener('click', salvarListaAtual);
    }

    const btnLimparLista = document.getElementById('btn-limpar-lista');
    if (btnLimparLista) {
        btnLimparLista.addEventListener('click', () => {
            if(confirm("Tem certeza que deseja limpar todos os itens da tela?")) {
                estadoAtual.listaAtiva.itens = [];
                atualizarUIListaDetalhada();
            }
        });
    }

    // FAB e Modal
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

// --- FUNÇÕES DE CONTROLE (CONTROLLERS) ---

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
        document.getElementById('valor-total-geral').textContent = '0.00';
        document.getElementById('historico-geral').innerHTML = '';
        const input = document.getElementById('input-valor-geral');
        if(input) input.focus();

    } 
    else if (modo === 'criar') {
        if(interfaceDetalhada) interfaceDetalhada.classList.remove('hidden');
        
        // MOSTRA o formulário no modo criar
        if(formItem) formItem.classList.remove('hidden');
        
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

    // MÁGICA: Esconde o formulário de adicionar itens no modo checklist
    if(formItem) formItem.classList.add('hidden');

    // Define modo para que a UI saiba renderizar inputs
    estadoAtual.modo = 'importar'; 
    estadoAtual.listaAtiva = JSON.parse(JSON.stringify(lista));
    
    document.getElementById('nome-lista-ativa').value = lista.nome;
    
    atualizarUIListaDetalhada();
}

function adicionarItemDetalhado() {
    // Esta função só é usada no modo 'criar' (quando o form está visível)
    const produtoInput = document.getElementById('produto');
    const marcaInput = document.getElementById('marca');
    const qtdInput = document.getElementById('quantidade');
    const unCompraInput = document.getElementById('unidade-compra');
    const precoInput = document.getElementById('preco');
    const unPrecoInput = document.getElementById('unidade-preco');

    const produto = produtoInput.value;
    const marca = marcaInput.value;
    const qtd = parseFloat(qtdInput.value);
    const unCompra = unCompraInput.value;
    let preco = parseFloat(precoInput.value);
    const unPreco = unPrecoInput.value;
    let total = 0;

    if (!produto || isNaN(qtd)) {
        alert("Preencha pelo menos o Nome do Produto e a Quantidade.");
        return;
    }

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
    const isModoImportar = estadoAtual.modo === 'importar';

    UI.renderItensCalculadora(
        estadoAtual.listaAtiva.itens, 
        // Callback Delete (Para modo Criar)
        (index) => {
            estadoAtual.listaAtiva.itens.splice(index, 1);
            atualizarUIListaDetalhada();
        },
        // Callback Update (Novo! Para modo Importar/Checklist)
        (index, novaQtd, novoPreco) => {
            // Atualiza o modelo de dados em tempo real
            const item = estadoAtual.listaAtiva.itens[index];
            
            // Se o input vier NaN (vazio), assumimos o que estava antes ou 0
            if (!isNaN(novaQtd)) item.quantidade = novaQtd;
            if (!isNaN(novoPreco)) item.preco = novoPreco;

            // Recalcula total do item
            try {
                if (item.preco > 0) {
                    item.total = Calc.calcularTotalItem(item.quantidade, item.unidade, item.preco, item.unidadePreco);
                } else {
                    item.total = 0;
                }
            } catch (e) {
                console.warn(e);
                item.total = 0;
            }

            // Atualiza apenas o total geral na tela para não perder o foco do input digitado
            atualizarTotalGeralNaTela();
        },
        isModoImportar // Passa true para ativar renderização com inputs
    );

    atualizarTotalGeralNaTela();
}

function atualizarTotalGeralNaTela() {
    const total = estadoAtual.listaAtiva.itens.reduce((acc, item) => acc + (item.total || 0), 0);
    const totalEl = document.getElementById('total-detalhado');
    if(totalEl) totalEl.textContent = Calc.formatarMoeda(total);
}

function somarGeral() {
    const input = document.getElementById('input-valor-geral');
    const valor = parseFloat(input.value);
    if (!isNaN(valor) && valor > 0) {
        estadoAtual.totalGeralSimples += valor;
        document.getElementById('valor-total-geral').textContent = Calc.formatarMoeda(estadoAtual.totalGeralSimples);
        
        const li = document.createElement('li');
        li.textContent = `+ R$ ${Calc.formatarMoeda(valor)}`;
        document.getElementById('historico-geral').prepend(li);
        
        input.value = '';
        input.focus();
    }
}

function salvarListaAtual() {
    if (estadoAtual.listaAtiva.itens.length === 0) {
        alert("A lista está vazia.");
        return;
    }
    
    let nome = document.getElementById('nome-lista-ativa').value;
    if (!nome || nome.trim() === "") {
        nome = `Lista ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString().slice(0,5)}`;
    }
    
    estadoAtual.listaAtiva.nome = nome;
    
    // Salva no LocalStorage
    Storage.saveLista(estadoAtual.listaAtiva);
    UI.showMessage("Lista salva com sucesso!");
    
    // Volta para home
    UI.switchView('view-listas');
    carregarMinhasListas();
}

// Inicia
init();
