const DB_KEY = 'compras_app_listas';

// Gera um ID único baseado no tempo
const generateID = () => Date.now().toString();

export function getListas() {
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : [];
}

export function saveLista(lista) {
    const listas = getListas();
    
    // Se a lista já tem ID, atualiza. Senão, cria nova.
    if (lista.id) {
        const index = listas.findIndex(l => l.id === lista.id);
        if (index !== -1) {
            listas[index] = lista; // Atualiza timestamp ou dados
            listas[index].dataAtualizacao = new Date().toISOString();
        } else {
            // Caso raro onde ID existe mas não tá no banco
            listas.push(lista);
        }
    } else {
        lista.id = generateID();
        lista.dataCriacao = new Date().toISOString();
        listas.push(lista);
    }

    localStorage.setItem(DB_KEY, JSON.stringify(listas));
    return lista;
}

export function deleteLista(id) {
    let listas = getListas();
    listas = listas.filter(l => l.id !== id);
    localStorage.setItem(DB_KEY, JSON.stringify(listas));
}

export function getListaById(id) {
    const listas = getListas();
    return listas.find(l => l.id === id);
}