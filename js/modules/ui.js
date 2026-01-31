import { formatarMoeda } from './calculator.js';

const $ = (selector) => document.querySelector(selector);

// Renderiza Cards na Home
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

        div.querySelector('.card-info').addEventListener('click', () => onOpenClick(lista));
        
        div.querySelector('.btn-del').addEventListener('click', (e) => {
            e.stopPropagation();
            if(confirm(`Excluir a lista "${lista.nome}"?`)) onDeleteClick(lista.id);
        });

        container.appendChild(div);
    });
}

// Renderiza Itens na Tabela (Agora suporta Modo Edição/Checklist)
export function renderItensCalculadora(itens, onDeleteItem, onUpdateItem, modoEdicao = false) {
    const container = $('#lista-itens-detalhada');
    if(!container) return;
    
    container.innerHTML = '';

    itens.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'item-compra';
        
        // --- MODO IMPORTAR (CHECKLIST EDITÁVEL) ---
        if (modoEdicao) {
            div.classList.add('item-ativo');
            
            // Verifica se o item já tem preço para marcar o checkbox
            const temPreco = item.preco > 0;

            div.innerHTML = `
                <div class="item-left" style="flex: 60%;">
                    <div class="item-header">
                        <input type="checkbox" class="check-compra" ${temPreco ? 'checked' : ''} disabled>
                        <span class="item-nome">
                            ${item.produto} 
                            ${item.marca ? `<small style="color:#666;">(${item.marca})</small>` : ''}
                        </span>
                    </div>
                    <div class="row-edit">
                        <input type="number" class="input-qtd-lista" value="${item.quantidade}" step="any" aria-label="Qtd">
                        <span class="unit-label" style="font-size:12px;">${item.unidade}</span>
                    </div>
                </div>
                <div class="item-right" style="flex: 40%; display: flex; align-items: center; justify-content: flex-end;">
                    <div class="price-input-wrapper">
                        <span style="font-size:12px; color:#aaa;">R$</span>
                        <input type="number" class="input-preco-lista" value="${item.preco === 0 ? '' : item.preco}" placeholder="0.00" step="any">
                    </div>
                </div>
            `;

            const qtdInput = div.querySelector('.input-qtd-lista');
            const precoInput = div.querySelector('.input-preco-lista');
            const checkInput = div.querySelector('.check-compra');

            // Função gatilho para atualizar dados
            const triggerUpdate = () => {
                const novaQtd = parseFloat(qtdInput.value);
                const novoPreco = parseFloat(precoInput.value);
                
                // Marca o checkbox visualmente se tiver preço > 0
                checkInput.checked = (!isNaN(novoPreco) && novoPreco > 0);

                // Envia para o controller (app.js)
                onUpdateItem(index, novaQtd, novoPreco);
            };

            qtdInput.addEventListener('input', triggerUpdate);
            precoInput.addEventListener('input', triggerUpdate);

        } else {
            // --- MODO CRIAR (VISUALIZAÇÃO ESTÁTICA) ---
            const textoProduto = item.marca 
                ? `<strong>${item.produto}</strong> <small style="color:#666;">(${item.marca})</small>` 
                : `<strong>${item.produto}</strong>`;

            div.innerHTML = `
                <div class="item-left">
                    <span class="item-nome">${textoProduto}</span>
                    <span class="item-detalhe">${item.quantidade} ${item.unidade} ${item.preco > 0 ? 'x R$ ' + formatarMoeda(item.preco) : ''}</span>
                </div>
                <div class="item-right">
                    <div class="item-total">R$ ${formatarMoeda(item.total)}</div>
                    <button class="btn-mini-del" style="background:none; border:none; cursor:pointer;">❌</button>
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
    if(target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }

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
