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
    
    // Registra Service Worker se disponível
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
    // Navegação Principal (Abas Rodapé)
    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = btn.dataset.target;
            UI.switchView(target);
            if (target === 'view-listas') carregarMinhasListas();
            if (target === 'view-calculadora') resetCalculadoraView();
        });
    });

    // Menu da Calculadora (Botões de Opção)
    document.querySelectorAll('.btn-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const modo = btn.dataset.mode;
            iniciarModoCalculadora(modo);
        });
    });

    // Botões de Voltar (Setas)
    document.querySelectorAll('.btn-back, .btn-back-small').forEach(btn => {
        btn.addEventListener('click', resetCalculadoraView);
    });

    // --- LÓGICA CALCULADORA GERAL (Opção 1) ---
    const btnSomarGeral = document.getElementById('btn-somar-geral');
    if (btnSomarGeral) {
        btnSomarGeral.addEventListener('click', () => {
            const input = document.getElementById('input-valor-geral');
            const valor = parseFloat(input.value);
            if (!isNaN(valor) && valor > 0) {
                estadoAtual.totalGeralSimples += valor;
                document.getElementById('valor-total-geral').textContent = Calc.formatarMoeda(estadoAtual.totalGeralSimples);
                
                // Adiciona ao histórico visual
                const li = document.createElement('li');
                li.textContent = `+ R$ ${Calc.formatarMoeda(valor)}`;
                const listaHist = document.getElementById('historico-geral');
                if(listaHist) listaHist.prepend(li);
                
                input.value = '';
                input.focus();
            }
        });
    }

    // --- LÓGICA CALCULADORA DETALHADA (Opção 2 e 3) ---
    const btnAddItem = document.getElementById('btn-add-item');
    if (btnAddItem) {
        btnAddItem.addEventListener('click', adicionarItemDetalhado);
    }
    
    const btnSalvarLista = document.getElementById('btn-salvar-lista');
    if (btnSalvarLista) {
        btnSalvarLista.addEventListener('click', () => {
            if (estadoAtual.listaAtiva.itens.length === 0) {
                alert("A lista está vazia. Adicione itens antes de salvar.");
                return;
            }
            
            let nome = document.getElementById('nome-lista-ativa').value;
            if (!nome || nome.trim() === "") {
                nome = `Lista ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString().slice(0,5)}`;
            }
            
            estadoAtual.listaAtiva.nome = nome;
            
            Storage.saveLista(estadoAtual.listaAtiva);
            UI.showMessage("Lista salva com sucesso!");
            
            // Volta para home e recarrega
            UI.switchView('view-listas');
            carregarMinhasListas();
        });
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

    // Botão Flutuante (FAB) na Home
    const fab = document.getElementById('btn-nova-lista-rapida');
    if (fab) {
        fab.addEventListener('click', () => {
            UI.switchView('view-calculadora');
            iniciarModoCalculadora('criar');
        });
    }

    // Modal Importar - Fechar
    const btnFecharModal = document.getElementById('btn-fechar-modal');
    if (btnFecharModal) {
        btnFecharModal.addEventListener('click', () => {
            const modal = document.getElementById('modal-importar');
            if(modal) modal.classList.add('hidden');
        });
    }
}

// --- FUNÇÕES DE CONTROLE E LÓGICA ---

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
        // Reseta lista atual para uma nova limpa
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
        container.innerHTML = '<p style="text-align:center; padding:10px;">Nenhuma lista salva para importar.</p>';
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
    // Muda para a tab calculadora se não estiver
    UI.switchView('view-calculadora');
    if(menuCalc) menuCalc.classList.add('hidden');
    if(interfaceDetalhada) interfaceDetalhada.classList.remove('hidden');

    // Clona a lista profundamente para não editar a original do banco diretamente até clicar em salvar
    estadoAtual.listaAtiva = JSON.parse(JSON.stringify(lista));
    
    const inputNome = document.getElementById('nome-lista-ativa');
    if(inputNome) inputNome.value = lista.nome;
    
    atualizarUIListaDetalhada();
}

function adicionarItemDetalhado() {
    const produtoInput = document.getElementById('produto');
    const qtdInput = document.getElementById('quantidade');
    const unCompraInput = document.getElementById('unidade-compra');
    const precoInput = document.getElementById('preco');
    const unPrecoInput = document.getElementById('unidade-preco');

    const produto = produtoInput.value;
    const qtd = parseFloat(qtdInput.value);
    const unCompra = unCompraInput.value;
    
    // --- LÓGICA DE PREÇO OPCIONAL ---
    // Se o preço for vazio ou inválido, assumimos 0
    let preco = parseFloat(precoInput.value);
    if (isNaN(preco)) {
        preco = 0;
    }
    
    const unPreco = unPrecoInput.value;

    // Validação: Apenas Produto e Quantidade são obrigatórios agora
    if (!produto || isNaN(qtd)) {
        alert("Por favor, preencha pelo menos o Nome do Produto e a Quantidade.");
        return;
    }

    try {
        // Se o preço for 0, o total será 0. Isso é aceitável para listas de planejamento.
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
        
        // Limpar campos
        produtoInput.value = '';
        qtdInput.value = '';
        precoInput.value = ''; // Limpa o preço visualmente
        produtoInput.focus(); // Foca no produto para digitar o próximo rapidamente

    } catch (e) {
        alert("Erro ao calcular: " + e.message);
    }
}

function atualizarUIListaDetalhada() {
    // Renderiza a lista visual
    UI.renderItensCalculadora(estadoAtual.listaAtiva.itens, (index) => {
        // Callback para deletar item individual
        estadoAtual.listaAtiva.itens.splice(index, 1);
        atualizarUIListaDetalhada();
    });

    // Atualiza o Total da Lista
    const total = estadoAtual.listaAtiva.itens.reduce((acc, item) => acc + item.total, 0);
    const totalEl = document.getElementById('total-detalhado');
    if(totalEl) totalEl.textContent = Calc.formatarMoeda(total);
}

// Inicia o App
init();
