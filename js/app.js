import * as Calc from './modules/calculator.js';
import * as Storage from './modules/storage.js';
import * as UI from './modules/ui.js';

// --- ESTADO ---
let estadoAtual = {
    modo: null, 
    listaAtiva: { id: null, nome: '', itens: [] },
    totalGeralSimples: 0
};

// --- ELEMENTOS ---
const navBtns = document.querySelectorAll('.nav-btn');
const menuCalc = document.getElementById('calc-menu');
const interfaceGeral = document.getElementById('interface-geral');
const interfaceDetalhada = document.getElementById('interface-detalhada');
const formItem = document.getElementById('form-item');
const btnLimparLista = document.getElementById('btn-limpar-lista'); // Capturado aqui

function init() {
    carregarMinhasListas();
    setupEventListeners();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(console.error);
}

function carregarMinhasListas() {
    const listas = Storage.getListas();
    UI.renderCardsListas(listas, 
        (id) => { Storage.deleteLista(id); carregarMinhasListas(); }, 
        (lista) => { importarListaParaCalculadora(lista); }
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

    document.querySelectorAll('.btn-back, .btn-back-small').forEach(btn => {
        btn.addEventListener('click', resetCalculadoraView);
    });

    const btnSomar = document.getElementById('btn-somar-geral');
    if(btnSomar) btnSomar.addEventListener('click', somarGeral);

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

// --- CONTROLLERS ---

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
        
    } else if (modo === 'criar') {
        interfaceDetalhada.classList.remove('hidden');
        if(formItem) formItem.classList.remove('hidden');
        
        // MOSTRA o botão limpar no modo criar
        if(btnLimparLista) btnLimparLista.classList.remove('hidden');

        estadoAtual.listaAtiva = { id: null, nome: '', itens: [] };
        document.getElementById('nome-lista-ativa').value = '';
        atualizarUIListaDetalhada();
        
    } else if (modo === 'importar') {
        abrirModalImportar();
    }
}

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
    
    // ESCONDE form e botão limpar
    if(formItem) formItem.classList.add('hidden'); 
    if(btnLimparLista) btnLimparLista.classList.add('hidden');

    estadoAtual.modo = 'importar'; 
    estadoAtual.listaAtiva = JSON.parse(JSON.stringify(lista));
    
    // Zera os totais anteriores para começar a compra limpa, mas mantém quantidades
    // Opcional: Se quiser manter o histórico de preços antigo, remova este map.
    estadoAtual.listaAtiva.itens = estadoAtual.listaAtiva.itens.map(i => ({
        ...i,
        preco: 0, // Zera preço para forçar preenchimento na loja
        total: 0,
        confirmado: false
    }));

    document.getElementById('nome-lista-ativa').value = lista.nome;
    atualizarUIListaDetalhada();
}

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
    
    // No modo criar, não validamos unidade rigidamente se preço for 0
    if (preco > 0) {
        try { total = Calc.calcularTotalItem(qtd, unCompra, preco, unPreco); } 
        catch(e) { return alert(e.message); }
    }

    estadoAtual.listaAtiva.itens.push({ 
        produto, marca, quantidade: qtd, unidade: unCompra, preco, unidadePreco: unPreco, total, confirmado: false 
    });
    
    // Limpa form
    document.getElementById('produto').value = '';
    document.getElementById('marca').value = '';
    document.getElementById('quantidade').value = '';
    document.getElementById('preco').value = '';
    
    atualizarUIListaDetalhada();
}

function atualizarUIListaDetalhada() {
    const isModoImportar = estadoAtual.modo === 'importar';

    UI.renderItensCalculadora(
        estadoAtual.listaAtiva.itens, 
        // Callback Delete (Criar)
        (index) => {
            estadoAtual.listaAtiva.itens.splice(index, 1);
            atualizarUIListaDetalhada();
        },
        // Callback Confirmar (Importar)
        (index, dadosNovos) => {
            const item = estadoAtual.listaAtiva.itens[index];
            
            // Se já estava confirmado, o clique serve para desfazer/editar
            if (item.confirmado) {
                item.confirmado = false;
                item.total = 0;
                atualizarUIListaDetalhada(); // Redesenha para destravar edição se quisesse travar
                atualizarTotalGeralNaTela();
                return;
            }

            // Atualiza dados
            item.marca = dadosNovos.marca;
            item.quantidade = dadosNovos.quantidade;
            item.unidade = dadosNovos.unidade;
            item.preco = dadosNovos.preco;
            item.unidadePreco = dadosNovos.unidadePreco;

            if (isNaN(item.preco) || item.preco <= 0) {
                alert("Insira um preço válido para confirmar.");
                return;
            }

            try {
                // AQUI O APP CONVERTE (Ex: 700g com preço em kg)
                item.total = Calc.calcularTotalItem(item.quantidade, item.unidade, item.preco, item.unidadePreco);
                item.confirmado = true;
                
                // Salva automaticamente o progresso no localStorage se quiser
                // Storage.saveLista(estadoAtual.listaAtiva); 

                atualizarUIListaDetalhada();
            } catch (e) {
                alert("Erro de conversão: " + e.message + "\nVerifique se as unidades são compatíveis (Ex: Massa com Massa).");
            }
        },
        isModoImportar
    );

    atualizarTotalGeralNaTela();
}

function atualizarTotalGeralNaTela() {
    // Soma apenas itens confirmados ou com total calculado
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
    }
}

function salvarListaAtual() {
    if (estadoAtual.listaAtiva.itens.length === 0) return alert("Lista vazia.");
    let nome = document.getElementById('nome-lista-ativa').value;
    if (!nome || !nome.trim()) nome = `Lista ${new Date().toLocaleDateString()}`;
    estadoAtual.listaAtiva.nome = nome;
    Storage.saveLista(estadoAtual.listaAtiva);
    UI.showMessage("Lista salva!");
    UI.switchView('view-listas');
    carregarMinhasListas();
}

init();
