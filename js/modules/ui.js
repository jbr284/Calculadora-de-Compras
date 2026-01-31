import { formatarMoeda } from './calculator.js';

const $ = (selector) => document.querySelector(selector);

// Renderiza Cards na Home (COM BOTÕES DE EDITAR E COMPRAR)
export function renderCardsListas(listas, onDelete, onEdit, onUse) {
    const container = $('#lista-cards-container');
    container.innerHTML = '';

    if (listas.length === 0) {
        container.innerHTML = '<p class="empty-msg" style="text-align:center; margin-top:20px; color:#777;">Nenhuma lista salva.</p>';
        return;
    }

    listas.forEach(lista => {
        const div = document.createElement('div');
        div.className = 'card-lista';
        const data = new Date(lista.dataCriacao || Date.now()).toLocaleDateString('pt-BR');
        
        div.innerHTML = `
            <div class="card-info" style="flex:1;">
                <h3>${lista.nome}</h3>
                <span>${data} • ${lista.itens.length} itens</span>
            </div>
            <div class="card-actions">
                <button class="btn-card use" title="Ir às Compras">🛒</button>
                <button class="btn-card edit" title="Editar Lista">✏️</button>
                <button class="btn-card del" title="Excluir">🗑️</button>
            </div>
        `;
        
        // Eventos dos botões
        div.querySelector('.use').addEventListener('click', () => onUse(lista));
        div.querySelector('.edit').addEventListener('click', () => onEdit(lista));
        div.querySelector('.del').addEventListener('click', () => {
            if(confirm(`Excluir "${lista.nome}"?`)) onDelete(lista.id);
        });

        container.appendChild(div);
    });
}

// Renderiza Calculadora Geral (Layout Completo)
export function renderCalculadoraGeral() {
    const container = $('#interface-geral');
    container.innerHTML = `
        <div class="top-bar">
            <button class="btn-back">Voltar</button>
        </div>
        <div class="calc-visor" id="visor-calc">0</div>
        <div class="calc-grid">
            <button class="btn-calc clear">C</button>
            <button class="btn-calc op" data-op="/">÷</button>
            <button class="btn-calc op" data-op="*">×</button>
            <button class="btn-calc del-char">⌫</button>
            
            <button class="btn-calc num">7</button>
            <button class="btn-calc num">8</button>
            <button class="btn-calc num">9</button>
            <button class="btn-calc op" data-op="-">-</button>
            
            <button class="btn-calc num">4</button>
            <button class="btn-calc num">5</button>
            <button class="btn-calc num">6</button>
            <button class="btn-calc op" data-op="+">+</button>
            
            <button class="btn-calc num">1</button>
            <button class="btn-calc num">2</button>
            <button class="btn-calc num">3</button>
            <button class="btn-calc num">.</button>
            
            <button class="btn-calc num" style="grid-column: span 2;">0</button>
            <button class="btn-calc igual">=</button>
        </div>
    `;
}

// ... (renderItensCalculadora e switchView continuam iguais ao anterior) ...
// Copie a função renderItensCalculadora do código anterior aqui.
// Copie a função switchView e showMessage do código anterior aqui.

// Renderiza Itens na Tabela (Mantive igual para referência, mas use o do passo anterior se tiver)
export function renderItensCalculadora(itens, onDeleteItem, onConfirmarItem, modoEdicao = false) {
    const container = $('#lista-itens-detalhada');
    if(!container) return;
    container.innerHTML = '';

    itens.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'item-compra';
        
        if (modoEdicao) {
            div.classList.add('item-ativo');
            if (item.confirmado) div.classList.add('item-confirmado'); 

            const selectUnit = (selected) => `
                <option value="un" ${selected === 'un' ? 'selected' : ''}>un</option>
                <option value="kg" ${selected === 'kg' ? 'selected' : ''}>kg</option>
                <option value="g" ${selected === 'g' ? 'selected' : ''}>g</option>
                <option value="L" ${selected === 'L' ? 'selected' : ''}>L</option>
                <option value="ml" ${selected === 'ml' ? 'selected' : ''}>ml</option>
            `;
            
            const selectPriceUnit = (selected) => `
                <option value="un" ${selected === 'un' ? 'selected' : ''}>/un</option>
                <option value="kg" ${selected === 'kg' ? 'selected' : ''}>/kg</option>
                <option value="L" ${selected === 'L' ? 'selected' : ''}>/L</option>
            `;

            div.innerHTML = `
                <div class="checklist-header">
                    <strong style="font-size:16px;">${item.produto}</strong>
                    <input type="text" class="input-marca-inline" value="${item.marca || ''}" placeholder="Marca?">
                </div>
                <div class="checklist-controls">
                    <input type="number" class="input-compact inp-qtd" value="${item.quantidade}" placeholder="Qtd">
                    <select class="select-compact sel-unit-qtd">${selectUnit(item.unidade)}</select>
                    <span class="separator" style="text-align:center; color:#999;">x</span>
                    <input type="number" class="input-compact inp-preco" value="${item.preco === 0 ? '' : item.preco}" placeholder="R$">
                    <select class="select-compact sel-unit-preco">${selectPriceUnit(item.unidadePreco || 'un')}</select>
                    <button class="btn-confirmar ${item.confirmado ? 'desfazer' : ''}">
                        ${item.confirmado ? '↩' : '✔'}
                    </button>
                </div>
                ${item.confirmado ? `<div style="text-align:right; font-size:14px; margin-top:5px; color:#28a745; font-weight:bold;">Total: R$ ${formatarMoeda(item.total)}</div>` : ''}
            `;

            const btnConfirm = div.querySelector('.btn-confirmar');
            const inpMarca = div.querySelector('.input-marca-inline');
            const inpQtd = div.querySelector('.inp-qtd');
            const selUnitQtd = div.querySelector('.sel-unit-qtd');
            const inpPreco = div.querySelector('.inp-preco');
            const selUnitPreco = div.querySelector('.sel-unit-preco');

            btnConfirm.addEventListener('click', () => {
                const dadosAtualizados = {
                    marca: inpMarca.value,
                    quantidade: parseFloat(inpQtd.value),
                    unidade: selUnitQtd.value,
                    preco: parseFloat(inpPreco.value),
                    unidadePreco: selUnitPreco.value
                };
                onConfirmarItem(index, dadosAtualizados);
            });

        } else {
            // MODO EDITAR/CRIAR
            const textoProduto = item.marca 
                ? `<strong>${item.produto}</strong> <small>(${item.marca})</small>` 
                : `<strong>${item.produto}</strong>`;

            div.innerHTML = `
                <div class="item-top-row">
                    <div class="item-left">
                        <span class="item-nome">${textoProduto}</span>
                        <div class="item-detalhe">${item.quantidade} ${item.unidade}</div>
                    </div>
                    <div class="item-right">
                         <button class="btn-mini-del" style="background:none; border:none; cursor:pointer; color:red;">🗑️</button>
                    </div>
                </div>
            `;
            div.querySelector('.btn-mini-del').addEventListener('click', (e) => {
                e.stopPropagation();
                if(confirm(`Remover "${item.produto}"?`)) onDeleteItem(index);
            });
        }
        container.appendChild(div);
    });
}

export function switchView(targetId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden')); 
    const target = document.getElementById(targetId);
    if(target) { target.classList.remove('hidden'); target.classList.add('active'); }
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === targetId);
    });
}

export function showMessage(msg, type = 'success') {
    const el = $('#message-container');
    if(!el) return;
    el.textContent = msg;
    el.className = `message ${type === 'error' ? 'msg-error' : 'msg-success'}`;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 3000);
}
