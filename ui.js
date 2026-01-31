import { formatarMoeda } from './calculator.js';

// Utilitário para selecionar elementos
const $ = (selector) => document.querySelector(selector);

// Renderiza os cards na tela inicial
export function renderCardsListas(listas, onDeleteClick, onOpenClick) {
    const container = $('#lista-cards-container');
    container.innerHTML = '';

    if (listas.length === 0) {
        container.innerHTML = '<p class="empty-msg" style="text-align:center; margin-top:20px; color:#777;">Nenhuma lista salva. Crie uma nova!</p>';
        return;
    }

    listas.forEach(lista => {
        const div = document.createElement('div');
        div.className = 'card-lista';
        
        // Data formatada
        const data = new Date(lista.dataCriacao || Date.now()).toLocaleDateString('pt-BR');

        div.innerHTML = `
            <div class="card-info" style="flex:1; cursor:pointer;">
                <h3>${lista.nome}</h3>
                <span>${data} • ${lista.itens.length} itens</span>
            </div>
            <div class="card-actions">
                <button class="btn-del">🗑️</button>
            </div>
        `;

        // Evento de abrir (clique no texto)
        div.querySelector('.card-info').addEventListener('click', () => onOpenClick(lista));
        
        // Evento de deletar
        div.querySelector('.btn-del').addEventListener('click', (e) => {
            e.stopPropagation();
            if(confirm(`Excluir a lista "${lista.nome}"?`)) onDeleteClick(lista.id);
        });

        container.appendChild(div);
    });
}

// Renderiza a lista de itens na calculadora detalhada
export function renderItensCalculadora(itens, onDeleteItem) {
    const container = $('#lista-itens-detalhada');
    container.innerHTML = '';

    itens.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'item-compra';
        div.innerHTML = `
            <div class="item-left">
                <span class="item-nome">${item.produto}</span>
                <span class="item-detalhe">${item.quantidade} ${item.unidade} x R$ ${formatarMoeda(item.preco)}</span>
            </div>
            <div class="item-right">
                <div class="item-total">R$ ${formatarMoeda(item.total)}</div>
            </div>
        `;
        // Opção simples de deletar ao clicar (pode melhorar depois com botão específico)
        div.addEventListener('click', () => {
            if(confirm("Remover este item?")) onDeleteItem(index);
        });
        container.appendChild(div);
    });
}

// Alterna abas
export function switchView(targetId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden')); // Garante hidden
    
    const target = document.getElementById(targetId);
    if(target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }

    // Atualiza nav bar
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === targetId);
    });
}

// Mostra mensagem toast
export function showMessage(msg, type = 'success') {
    const el = $('#message-container');
    el.textContent = msg;
    el.className = `message ${type === 'error' ? 'msg-error' : 'msg-success'}`;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 3000);
}