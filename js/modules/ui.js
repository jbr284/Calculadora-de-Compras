import { formatarMoeda } from './calculator.js';

const $ = (selector) => document.querySelector(selector);

// 1. Renderiza Cards das Listas
export function renderCardsListas(listas, onDelete, onEdit, onUse) {
    const container = $('#lista-cards-container');
    container.innerHTML = '';

    if (listas.length === 0) {
        container.innerHTML = '<p class="empty-msg">Nenhuma lista salva.<br>Toque no + para criar.</p>';
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
                <button class="btn-card use" title="Comprar">🛒</button>
                <button class="btn-card edit" title="Editar">✏️</button>
                <button class="btn-card del" title="Excluir">🗑️</button>
            </div>
        `;
        
        div.querySelector('.use').addEventListener('click', () => onUse(lista));
        div.querySelector('.edit').addEventListener('click', () => onEdit(lista));
        div.querySelector('.del').addEventListener('click', () => {
            if(confirm(`Excluir "${lista.nome}"?`)) onDelete(lista.id);
        });

        container.appendChild(div);
    });
}

// 2. Renderiza a Calculadora Geral (Estilo Fita)
export function renderCalculadoraGeral() {
    const container = $('#interface-geral');
    container.innerHTML = `
        <div class="top-bar">
            <button class="btn-back">← Voltar</button>
        </div>

        <div class="calc-total-box">
            <div class="calc-total-label">Total Acumulado</div>
            <div class="calc-total-value">R$ <span id="valor-total-geral">0.00</span></div>
        </div>

        <div class="tape-container">
            <ul id="historico-lista" class="tape-list">
                </ul>
        </div>

        <div class="calc-controls-area">
            <div class="calc-input-row">
                <input type="number" id="input-calc-geral" class="input-calc-big" placeholder="0.00" inputmode="decimal">
            </div>
            <div class="calc-input-row">
                <button class="btn-calc-action btn-op-add" data-op="soma">+</button>
                <button class="btn-calc-action btn-op-sub" data-op="subt">-</button>
                <button class="btn-calc-action btn-op-mul" data-op="mult">×</button>
                <button class="btn-calc-action btn-op-div" data-op="div">÷</button>
            </div>
            <button class="btn-calc-action btn-op-clear" id="btn-limpar-geral">Limpar / Reiniciar</button>
        </div>
    `;
}

// 3. Renderiza Itens (Criar e Checklist)
export function renderItensCalculadora(itens, onDeleteItem, onConfirmarItem, modoEdicao = false) {
    const container = $('#lista-itens-detalhada');
    if(!container) return;
    container.innerHTML = '';

    itens.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'item-compra';
        
        if (modoEdicao) {
            // === MODO CHECKLIST (IMPORTAR/COMPRAR) ===
            div.classList.add('item-ativo');
            if (item.confirmado) div.classList.add('item-confirmado'); 

            const selectUnit = (sel) => `
                <option value="un" ${sel==='un'?'selected':''}>un</option>
                <option value="kg" ${sel==='kg'?'selected':''}>kg</option>
                <option value="g" ${sel==='g'?'selected':''}>g</option>
                <option value="L" ${sel==='L'?'selected':''}>L</option>
                <option value="ml" ${sel==='ml'?'selected':''}>ml</option>`;
            
            const selectPriceUnit = (sel) => `
                <option value="un" ${sel==='un'?'selected':''}>/un</option>
                <option value="kg" ${sel==='kg'?'selected':''}>/kg</option>
                <option value="L" ${sel==='L'?'selected':''}>/L</option>`;

            div.innerHTML = `
                <div class="checklist-header">
                    <strong style="font-size:16px;">${item.produto}</strong>
                    <input type="text" class="input-marca-inline" value="${item.marca || ''}" placeholder="Marca?">
                </div>
                <div class="checklist-controls">
                    <input type="number" class="input-compact inp-qtd" value="${item.quantidade}" placeholder="Qtd">
                    <select class="select-compact sel-unit-qtd">${selectUnit(item.unidade)}</select>
                    
                    <span class="separator" style="color:#999;">x</span>
                    
                    <input type="number" class="input-compact inp-preco" value="${item.preco===0?'':item.preco}" placeholder="R$">
                    <select class="select-compact sel-unit-preco">${selectPriceUnit(item.unidadePreco||'un')}</select>
                    
                    <button class="btn-confirmar ${item.confirmado ? 'desfazer' : ''}">
                        ${item.confirmado ? '↩' : '✔'}
                    </button>
                </div>
                ${item.confirmado ? `<div style="text-align:right; font-size:14px; margin-top:5px; color:#28a745; font-weight:bold;">Total: R$ ${formatarMoeda(item.total)}</div>` : ''}
            `;

            const btn = div.querySelector('.btn-confirmar');
            const inputs = {
                marca: div.querySelector('.input-marca-inline'),
                qtd: div.querySelector('.inp-qtd'),
                unQtd: div.querySelector('.sel-unit-qtd'),
                preco: div.querySelector('.inp-preco'),
                unPreco: div.querySelector('.sel-unit-preco')
            };

            btn.addEventListener('click', () => {
                onConfirmarItem(index, {
                    marca: inputs.marca.value,
                    quantidade: parseFloat(inputs.qtd.value),
                    unidade: inputs.unQtd.value,
                    preco: parseFloat(inputs.preco.value),
                    unidadePreco: inputs.unPreco.value
                });
            });

        } else {
            // === MODO CRIAR/EDITAR (ESTÁTICO) ===
            const textoProduto = item.marca 
                ? `<strong>${item.produto}</strong> <small>(${item.marca})</small>` 
                : `<strong>${item.produto}</strong>`;

            // Lógica para mostrar detalhes do preço (ex: 2 un x R$ 5.00)
            let detalheTexto = `${item.quantidade} ${item.unidade}`;
            if (item.preco > 0) {
                detalheTexto += ` x R$ ${formatarMoeda(item.preco)}`;
            }

            div.innerHTML = `
                <div class="item-top-row">
                    <div class="item-left">
                        <span class="item-nome">${textoProduto}</span>
                        <div class="item-detalhe">${detalheTexto}</div>
                    </div>
                    <div class="item-right" style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
                         <div style="font-weight:bold; color:#007bff; font-size:14px;">R$ ${formatarMoeda(item.total)}</div>
                         <button class="btn-mini-del" style="background:none; border:none; cursor:pointer; color:red; font-size:18px;">🗑️</button>
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

// Utilitários
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
