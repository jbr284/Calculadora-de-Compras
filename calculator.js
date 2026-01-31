const fatoresDeConversao = {
    massa: { g: 1, kg: 1000 },
    volume: { ml: 1, L: 1000 },
    unidade: { un: 1 }
};
  
export function getUnitCategory(unit) {
    if (fatoresDeConversao.massa[unit]) return 'massa';
    if (fatoresDeConversao.volume[unit]) return 'volume';
    if (fatoresDeConversao.unidade[unit]) return 'unidade';
    return null;
}
  
export function calcularTotalItem(qtd, unitCompra, preco, unitPreco) {
    const catCompra = getUnitCategory(unitCompra);
    const catPreco = getUnitCategory(unitPreco);

    // Validação de categoria
    if (!catCompra || !catPreco || catCompra !== catPreco) {
        throw new Error("Unidades incompatíveis.");
    }

    // Se for unidade simples
    if (catCompra === 'unidade') {
        return qtd * preco;
    }

    // Conversão
    const fatorCompra = fatoresDeConversao[catCompra][unitCompra];
    const fatorPreco = fatoresDeConversao[catPreco][unitPreco];

    // Normaliza para a unidade base (g ou ml)
    const qtdBase = qtd * fatorCompra;
    const precoBase = preco / fatorPreco;

    return qtdBase * precoBase;
}

export function formatarMoeda(valor) {
    return valor.toFixed(2);
}