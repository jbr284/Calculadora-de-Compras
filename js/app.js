import * as Calc from './modules/calculator.js';
import * as Storage from './modules/storage.js';
import * as UI from './modules/ui.js';

let estadoAtual = {
    modo: null, 
    listaAtiva: { id: null, nome: '', itens: [] },
    calcExpressao: '' // Para a calculadora geral
};

// --- ELEMENTOS ---
const navBtns = document.querySelectorAll('.nav-btn');
const menuCalc = document.getElementById('calc-menu');
const interfaceGeral = document.getElementById('interface-geral');
const interfaceDetalhada = document.getElementById('interface-detalhada');
const formItem = document.getElementById('form-item');
const btnLimparLista = document.getElementById('btn-limpar-lista');

function init() {
    carregarMinhasListas();
    setupEventListeners();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(console.error);
}

function carregarMinhasListas() {
    const listas = Storage.getListas();
    // Agora passamos 3 callbacks: Deletar, Editar, Usar(Comprar)
    UI.renderCardsListas(listas, 
        (id) => { Storage.deleteLista(id); carregarMinhasListas(); }, // Delete
        (lista) => { editarLista(lista); }, // Editar
        (lista) => { importarListaParaCalculadora(lista); } // Usar/Comprar
    );
}

function setupEventListeners() {
    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            UI.switchView(btn.dataset.target);
            if (btn.dataset.target === 'view-listas') carregarMinhasListas();
        });
    });

    document.querySelectorAll('.btn-option').forEach(btn => {
        btn.addEventListener('click', () => iniciarModoCalculadora(btn.dataset.mode));
    });

    // Event Delegation para o botão voltar da calculadora geral que é gerado dinamicamente
    document.body.addEventListener('click', (e) => {
        if(e.target.classList.contains('btn-back') || e.target.classList.contains('btn-back-small')) {
            resetCalculadoraView();
        }
    });

    // --- Eventos da Calculadora Detalhada ---
    const btnAdd = document.getElementById('btn-add-item');
    if(btnAdd) btnAdd.addEventListener('click', adicionarItemDetalhado);
    
    document.getElementById('btn-salvar-lista').addEventListener('click', salvarListaAtual);

    if (btnLimparLista) {
        btnLimparLista.addEventListener('click', () => {
            if(confirm("Limpar lista?")) {
                estadoAtual.listaAtiva.itens = [];
                atualizarUIListaDetalhada();
            }
        });
    }

    const fab = document.getElementById('btn-nova-lista-rapida');
    if(fab) fab.addEventListener('click', () => { UI.switchView('view-calculadora'); iniciarModoCalculadora('criar'); });
    
    document.getElementById('btn-fechar-modal').addEventListener('click', () => document.getElementById('modal-importar').classList.add('hidden'));
}

// --- LÓGICA DA CALCULADORA GERAL (NOVA) ---
function iniciarCalculadoraGeral() {
    UI.renderCalculadoraGeral(); // Desenha o HTML
    estadoAtual.calcExpressao = '';
    const visor = document.getElementById('visor-calc');

    // Adiciona eventos aos botões da calc
    const botoes = document.querySelectorAll('.btn-calc');
    botoes.forEach(btn => {
        btn.addEventListener('click', () => {
            const valor = btn.innerText;
            
            if (btn.classList.contains('clear')) {
                estadoAtual.calcExpressao = '';
                visor.innerText = '0';
            } 
            else if (btn.classList.contains('del-char')) {
                estadoAtual.calcExpressao = estadoAtual.calcExpressao.slice(0, -1);
                visor.innerText = estadoAtual.calcExpressao || '0';
            }
            else if (btn.classList.contains('igual')) {
                try {
                    // Substitui x por * e ÷ por / para cálculo
                    let expressaoReal = estadoAtual.calcExpressao.replace(/×/g, '*').replace(/÷/g, '/');
                    const resultado = eval(expressaoReal); // Eval é seguro aqui pois o input é controlado por botões
                    visor.innerText = Number.isInteger(resultado) ? resultado : resultado.toFixed(2);
                    estadoAtual.calcExpressao = visor.innerText;
                } catch (e) {
                    visor.innerText = 'Erro';
                    estadoAtual.calcExpressao = '';
                }
            } 
            else if (btn.classList.contains('op')) {
                const op = btn.dataset.op; // /, *, -, +
                const ultimoChar = estadoAtual.calcExpressao.slice(-1);
                // Evita operadores duplicados
                if (['/','*','-','+'].includes(ultimoChar)) {
                    estadoAtual.calcExpressao = estadoAtual.calcExpressao.slice(0, -1) + op;
                } else {
                    estadoAtual.calcExpressao += op;
                }
                visor.innerText = estadoAtual.calcExpressao;
            } 
            else {
                // Números e Ponto
                estadoAtual.calcExpressao += valor;
                visor.innerText = estadoAtual.calcExpressao;
            }
        });
    });
}

// --- FLUXOS DE NAVEGAÇÃO ---

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
        iniciarCalculadoraGeral(); // Inicia lógica da calc geral
        
    } else if (modo === 'criar') {
        interfaceDetalhada.classList.remove('hidden');
        if(formItem) formItem.classList.remove('hidden');
        if(btnLimparLista) btnLimparLista.classList.remove('hidden');

        // Cria nova lista limpa (sem ID)
        estadoAtual.listaAtiva = { id: null, nome: '', itens: [] };
        document.getElementById('nome-lista-ativa').value = '';
        atualizarUIListaDetalhada();
        
    } else if (modo === 'importar') {
        abrirModalImportar();
    }
}

// --- MODO EDITAR LISTA (NOVO) ---
function editarLista(lista) {
    UI.switchView('view-calculadora');
    menuCalc.classList.add('hidden');
    interfaceDetalhada.classList.remove('hidden');
    
    // Configuração igual ao modo CRIAR (Form visível)
    if(formItem) formItem.classList.remove('hidden');
    if(btnLimparLista) btnLimparLista.classList.remove('hidden');

    estadoAtual.modo = 'criar'; // Usa a lógica de criar (com form)
    // Mas carrega os dados da lista existente, INCLUINDO O ID
    estadoAtual.listaAtiva = JSON.parse(JSON.stringify(lista));
    
    document.getElementById('nome-lista-ativa').value = lista.nome;
    atualizarUIListaDetalhada();
}

// --- MODO COMPRAR/IMPORTAR (CHECKLIST) ---
function abrirModalImportar() {
    const modal = document.getElementById('modal-importar');
    const container = document.getElementById('lista-importar-container');
    const listas = Storage.getListas();
    container.innerHTML = '';
    if (listas.length === 0) {
        container.innerHTML = '<p>Sem listas salvas.</p>';
    } else {
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
    interfaceDetalhada.classList.remove('hidden');
    
    if(formItem) formItem.classList.add('hidden'); 
    if(btnLimparLista) btnLimparLista.classList.add('hidden');

    estadoAtual.modo = 'importar'; 
    estadoAtual.listaAtiva = JSON.parse(JSON.stringify(lista));
    
    // Zera preços para checklist limpo
    estadoAtual.listaAtiva.itens = estadoAtual.listaAtiva.itens.map(i => ({
        ...i,
        preco: 0,
        total: 0,
        confirmado: false
    }));

    document.getElementById('nome-lista-ativa').value = lista.nome;
    atualizarUIListaDetalhada();
}

// --- LÓGICA DE ITENS E SALVAMENTO (Mantém quase igual) ---

function adicionarItemDetalhado() {
    const produto = document.getElementById('produto').value;
    const marca = document.getElementById('marca').value;
    const qtd = parseFloat(document.getElementById('quantidade').value);
    const unCompra = document.getElementById('unidade-compra').value;
    let preco = parseFloat(document.getElementById('preco').value);
    const unPreco = document.getElementById('unidade-preco').value;

    if (!produto || isNaN(qtd)) return alert("Preencha produto e quantidade.");
    
    let total = 0;
    if (isNaN(preco)) preco = 0;
    if (preco > 0) {
        try { total = Calc.calcularTotalItem(qtd, unCompra, preco, unPreco); } 
        catch(e) { return alert(e.message); }
    }

    estadoAtual.listaAtiva.itens.push({ 
        produto, marca, quantidade: qtd, unidade: unCompra, preco, unidadePreco: unPreco, total, confirmado: false 
    });
    
    document.getElementById('produto').value = '';
    document.getElementById('marca').value = '';
    document.getElementById('quantidade').value = '';
    document.getElementById('preco').value = '';
    document.getElementById('produto').focus();
    
    atualizarUIListaDetalhada();
}

function atualizarUIListaDetalhada() {
    const isModoImportar = estadoAtual.modo === 'importar';

    UI.renderItensCalculadora(
        estadoAtual.listaAtiva.itens, 
        // Callback Delete
        (index) => {
            estadoAtual.listaAtiva.itens.splice(index, 1);
            atualizarUIListaDetalhada();
        },
        // Callback Confirmar
        (index, dadosNovos) => {
            const item = estadoAtual.listaAtiva.itens[index];
            if (item.confirmado) {
                item.confirmado = false;
                item.total = 0;
                atualizarUIListaDetalhada();
                atualizarTotalGeralNaTela();
                return;
            }
            item.marca = dadosNovos.marca;
            item.quantidade = dadosNovos.quantidade;
            item.unidade = dadosNovos.unidade;
            item.preco = dadosNovos.preco;
            item.unidadePreco = dadosNovos.unidadePreco;

            if (isNaN(item.preco) || item.preco <= 0) return alert("Insira um preço válido.");

            try {
                item.total = Calc.calcularTotalItem(item.quantidade, item.unidade, item.preco, item.unidadePreco);
                item.confirmado = true;
                atualizarUIListaDetalhada();
            } catch (e) {
                alert("Erro: " + e.message);
            }
        },
        isModoImportar
    );
    atualizarTotalGeralNaTela();
}

function atualizarTotalGeralNaTela() {
    const total = estadoAtual.listaAtiva.itens.reduce((acc, item) => acc + (item.total || 0), 0);
    const totalEl = document.getElementById('total-detalhado');
    if(totalEl) totalEl.textContent = Calc.formatarMoeda(total);
}

function salvarListaAtual() {
    if (estadoAtual.listaAtiva.itens.length === 0) return alert("Lista vazia.");
    let nome = document.getElementById('nome-lista-ativa').value;
    if (!nome || !nome.trim()) nome = `Lista ${new Date().toLocaleDateString()}`;
    estadoAtual.listaAtiva.nome = nome;
    
    // O Storage.saveLista já lida com Update se o ID existir
    Storage.saveLista(estadoAtual.listaAtiva);
    UI.showMessage("Lista salva!");
    UI.switchView('view-listas');
    carregarMinhasListas();
}

init();
