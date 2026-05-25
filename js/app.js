/* ========================================================
   BANCO DE DADOS LOCAL (STORAGE)
   ======================================================== */
   const DB_KEY = 'compras_app_listas';
   const generateID = () => Date.now().toString();
   
   function getListas() {
       const data = localStorage.getItem(DB_KEY);
       return data ? JSON.parse(data) : [];
   }
   
   function saveLista(lista) {
       const listas = getListas();
       if (lista.id) {
           const index = listas.findIndex(l => l.id === lista.id);
           if (index !== -1) {
               listas[index] = lista;
               listas[index].dataAtualizacao = new Date().toISOString();
           } else listas.push(lista);
       } else {
           lista.id = generateID();
           lista.dataCriacao = new Date().toISOString();
           listas.push(lista);
       }
       localStorage.setItem(DB_KEY, JSON.stringify(listas));
       return lista;
   }
   
   function deleteLista(id) {
       let listas = getListas();
       listas = listas.filter(l => l.id !== id);
       localStorage.setItem(DB_KEY, JSON.stringify(listas));
   }
   
   /* ========================================================
      MOTOR DE CÁLCULO E CONVERSÃO
      ======================================================== */
   const fatoresDeConversao = { massa: { g: 1, kg: 1000 }, volume: { ml: 1, L: 1000 }, unidade: { un: 1 } };
   
   function getUnitCategory(unit) {
       if (fatoresDeConversao.massa[unit]) return 'massa';
       if (fatoresDeConversao.volume[unit]) return 'volume';
       if (fatoresDeConversao.unidade[unit]) return 'unidade';
       return null;
   }
   
   function calcularTotalItem(qtd, unitCompra, preco, unitPreco) {
       const catCompra = getUnitCategory(unitCompra);
       const catPreco = getUnitCategory(unitPreco);
       if (!catCompra || !catPreco || catCompra !== catPreco) throw new Error("Unidades incompatíveis. (Ex: kg com L)");
       if (catCompra === 'unidade') return qtd * preco;
       
       const fatorCompra = fatoresDeConversao[catCompra][unitCompra];
       const fatorPreco = fatoresDeConversao[catPreco][unitPreco];
       const qtdBase = qtd * fatorCompra;
       const precoBase = preco / fatorPreco;
       return qtdBase * precoBase;
   }
   
   function formatarMoeda(valor) { return valor.toFixed(2); }
   
   /* ========================================================
      WAKE LOCK API (Evitar que a tela desligue no mercado)
      ======================================================== */
   let wakeLockObj = null;
   
   async function solicitarTelaAtiva() {
       if ('wakeLock' in navigator) {
           try {
               wakeLockObj = await navigator.wakeLock.request('screen');
               console.log("Tela Sempre Ativa: LIGADA");
           } catch (err) {
               console.log("Wake Lock negado pelo sistema:", err.message);
           }
       }
   }
   
   function liberarTelaAtiva() {
       if (wakeLockObj !== null) {
           wakeLockObj.release();
           wakeLockObj = null;
           console.log("Tela Sempre Ativa: DESLIGADA");
       }
   }
   
   // Se o usuário minimizar o app no mercado e voltar, pede a tela de novo
   document.addEventListener('visibilitychange', async () => {
       if (wakeLockObj !== null && document.visibilityState === 'visible') {
           await solicitarTelaAtiva();
       }
   });
   
   /* ========================================================
      ESTADO GLOBAL E NAVEGAÇÃO
      ======================================================== */
   let estadoAtual = { modo: null, listaAtiva: { id: null, nome: '', itens: [] }, totalGeral: 0 };
   
   window.abrirModulo = (modulo) => {
       document.getElementById('tela-hub').classList.add('hidden');
       document.getElementById('app').classList.remove('hidden');
       document.querySelectorAll('.master-module').forEach(m => m.classList.remove('active'));
       
       if (modulo === 'listas') {
           document.getElementById('app-title').innerText = 'LISTAS DE COMPRAS';
           document.getElementById('module-listas').classList.add('active');
           renderizarCards('planejamento');
       } 
       else if (modulo === 'comprar') {
           document.getElementById('app-title').innerText = 'MODO SUPERMERCADO';
           document.getElementById('module-comprar').classList.add('active');
           solicitarTelaAtiva(); // <-- MANTÉM A TELA ACESA NO MERCADO
           renderizarCards('comprar');
       } 
       else if (modulo === 'calculadoras') {
           document.getElementById('app-title').innerText = 'CALCULADORAS';
           document.getElementById('module-calculadoras').classList.add('active');
           solicitarTelaAtiva(); // <-- MANTÉM A TELA ACESA NA CALCULADORA
       }
   };
   
   window.abrirSubModulo = (submodulo) => {
       document.querySelectorAll('.master-module').forEach(m => m.classList.remove('active'));
       
       if (submodulo === 'calc-simples') {
           document.getElementById('app-title').innerText = 'CALCULADORA GERAL';
           document.getElementById('sub-calc-simples').classList.add('active');
           iniciarCalcSimples();
       } 
       else if (submodulo === 'calc-detalhada') {
           document.getElementById('app-title').innerText = 'COMPRA DETALHADA';
           document.getElementById('sub-interface-detalhada').classList.add('active');
           estadoAtual.modo = 'calc_detalhada';
           iniciarInterfaceDetalhada({ id: null, nome: '', itens: [] });
       }
   };
   
   window.voltarAoHub = () => {
       document.getElementById('app').classList.add('hidden');
       document.getElementById('tela-hub').classList.remove('hidden');
       estadoAtual.modo = null;
       liberarTelaAtiva(); // <-- DEIXA O CELULAR DESCANSAR QUANDO VOLTA AO MENU
   };
   
   /* ========================================================
      RENDERIZAÇÃO DOS CARTÕES DE LISTAS
      ======================================================== */
   const iconEdit = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;
   const iconDel = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
   const iconCart = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`;
   
   function renderizarCards(tipo) { 
       const listas = getListas();
       const container = document.getElementById(tipo === 'planejamento' ? 'lista-cards-planejamento' : 'lista-cards-comprar');
       container.innerHTML = '';
   
       if (listas.length === 0) {
           container.innerHTML = '<p class="empty-msg">Nenhuma lista guardada.</p>';
           return;
       }
   
       listas.forEach(lista => {
           const data = new Date(lista.dataCriacao || Date.now()).toLocaleDateString('pt-BR');
           const div = document.createElement('div');
           div.className = 'card-lista';
           
           let actions = tipo === 'planejamento' 
               ? `<button class="btn-card edit" title="Editar">${iconEdit}</button><button class="btn-card del" title="Excluir">${iconDel}</button>`
               : `<button class="btn-card use">${iconCart} Ir</button>`;
   
           div.innerHTML = `
               <div class="card-info"><h3>${lista.nome || 'Lista Sem Nome'}</h3><span>${data} • ${lista.itens.length} itens</span></div>
               <div class="card-actions">${actions}</div>
           `;
           
           if (tipo === 'planejamento') {
               div.querySelector('.edit').addEventListener('click', () => {
                   estadoAtual.modo = 'listas_editar';
                   document.getElementById('app-title').innerText = 'EDITAR LISTA';
                   document.querySelectorAll('.master-module').forEach(m => m.classList.remove('active'));
                   document.getElementById('sub-interface-detalhada').classList.add('active');
                   iniciarInterfaceDetalhada(lista);
               });
               div.querySelector('.del').addEventListener('click', () => {
                   if(confirm(`Eliminar "${lista.nome}"?`)) { deleteLista(lista.id); renderizarCards(tipo); }
               });
           } else {
               div.querySelector('.use').addEventListener('click', () => {
                   estadoAtual.modo = 'comprar';
                   document.getElementById('app-title').innerText = 'NO SUPERMERCADO';
                   document.querySelectorAll('.master-module').forEach(m => m.classList.remove('active'));
                   document.getElementById('sub-interface-detalhada').classList.add('active');
                   iniciarInterfaceDetalhada(lista);
               });
           }
           container.appendChild(div);
       });
   }
   
   /* ========================================================
      LÓGICA DA INTERFACE DE ITENS
      ======================================================== */
   window.iniciarCriacaoLista = () => {
       estadoAtual.modo = 'listas_criar';
       document.getElementById('app-title').innerText = 'NOVA LISTA';
       document.querySelectorAll('.master-module').forEach(m => m.classList.remove('active'));
       document.getElementById('sub-interface-detalhada').classList.add('active');
       iniciarInterfaceDetalhada({ id: null, nome: '', itens: [] });
   };
   
   function iniciarInterfaceDetalhada(lista) {
       estadoAtual.listaAtiva = JSON.parse(JSON.stringify(lista));
       document.getElementById('nome-lista-ativa').value = lista.nome;
       
       const isPlanejamento = (estadoAtual.modo === 'listas_criar' || estadoAtual.modo === 'listas_editar');
       const isCompras = estadoAtual.modo === 'comprar';
   
       document.getElementById('row-preco').style.display = isPlanejamento ? 'none' : 'flex';
       document.getElementById('form-item').style.display = isCompras ? 'none' : 'block';
       document.getElementById('barra-total').style.display = isPlanejamento ? 'none' : 'flex'; 
       
       const header = document.getElementById('header-tabela-criar');
       if (isCompras) {
           header.classList.add('hidden'); 
       } else {
           header.classList.remove('hidden');
           header.querySelectorAll('.col-hide-preco').forEach(col => col.style.display = isPlanejamento ? 'none' : 'block');
           header.style.gridTemplateColumns = isPlanejamento 
               ? 'minmax(0, 3fr) minmax(0, 2fr) minmax(0, 1.2fr) 30px' 
               : 'minmax(0, 3fr) minmax(0, 2fr) minmax(0, 1.2fr) minmax(0, 1.5fr) minmax(0, 2fr) 25px';
       }
   
       atualizarUIListaDetalhada();
   }
   
   function atualizarUIListaDetalhada() {
       const container = document.getElementById('lista-itens-detalhada');
       container.innerHTML = '';
       
       const isPlanejamento = (estadoAtual.modo === 'listas_criar' || estadoAtual.modo === 'listas_editar');
       const isCompras = estadoAtual.modo === 'comprar';
   
       const iconCheck = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
       const iconUndo = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>`;
   
       estadoAtual.listaAtiva.itens.forEach((item, index) => {
           const div = document.createElement('div');
           
           if (isCompras) {
               div.className = 'item-compra'; div.classList.add('item-ativo');
               if (item.confirmado) div.classList.add('item-confirmado'); 
   
               const selUnit = (s) => `<option value="un" ${s==='un'?'selected':''}>un</option><option value="kg" ${s==='kg'?'selected':''}>kg</option><option value="g" ${s==='g'?'selected':''}>g</option><option value="L" ${s==='L'?'selected':''}>L</option><option value="ml" ${s==='ml'?'selected':''}>ml</option>`;
               const selPriceUnit = (s) => `<option value="un" ${s==='un'?'selected':''}>/un</option><option value="kg" ${s==='kg'?'selected':''}>/kg</option><option value="L" ${s==='L'?'selected':''}>/L</option>`;
   
               div.innerHTML = `
                   <div class="checklist-header"><strong style="font-size:16px;">${item.produto}</strong><input type="text" class="input-marca-inline" value="${item.marca || ''}" placeholder="Marca?"></div>
                   <div class="checklist-controls">
                       <input type="number" class="input-compact inp-qtd" value="${item.quantidade}" placeholder="Qtd">
                       <select class="select-compact sel-unit-qtd">${selUnit(item.unidade)}</select>
                       <span class="separator" style="color:#94a3b8;">x</span>
                       <input type="number" class="input-compact inp-preco" value="${item.preco > 0 ? item.preco : ''}" placeholder="R$">
                       <select class="select-compact sel-unit-preco">${selPriceUnit(item.unidadePreco||'un')}</select>
                       <button class="btn-confirmar ${item.confirmado ? 'desfazer' : ''}">${item.confirmado ? iconUndo : iconCheck}</button>
                   </div>
                   ${item.confirmado ? `<div style="text-align:right; font-size:14px; margin-top:5px; color:var(--success); font-weight:800;">Total: R$ ${formatarMoeda(item.total)}</div>` : ''}
               `;
   
               const btn = div.querySelector('.btn-confirmar');
               const inputs = { marca: div.querySelector('.input-marca-inline'), qtd: div.querySelector('.inp-qtd'), unQtd: div.querySelector('.sel-unit-qtd'), preco: div.querySelector('.inp-preco'), unPreco: div.querySelector('.sel-unit-preco') };
   
               btn.addEventListener('click', () => {
                   if (item.confirmado) { item.confirmado = false; atualizarUIListaDetalhada(); return; }
                   item.marca = inputs.marca.value; item.quantidade = parseFloat(inputs.qtd.value); item.unidade = inputs.unQtd.value;
                   item.preco = parseFloat(inputs.preco.value); item.unidadePreco = inputs.unPreco.value;
   
                   if (isNaN(item.preco) || item.preco <= 0) return alert("Insira um preço válido.");
                   try { item.total = calcularTotalItem(item.quantidade, item.unidade, item.preco, item.unidadePreco); item.confirmado = true; atualizarUIListaDetalhada(); } 
                   catch (e) { alert(e.message); }
               });
           } else {
               div.className = 'item-tabela';
               const miniDel = `<button class="btn-mini-del" onclick="removerItem(${index})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>`;
               
               if (isPlanejamento) {
                   div.style.gridTemplateColumns = 'minmax(0, 3fr) minmax(0, 2fr) minmax(0, 1.2fr) 30px';
                   div.innerHTML = `<div class="col-texto"><strong>${item.produto}</strong></div><div class="col-texto" style="color:var(--text-muted);">${item.marca || '-'}</div><div class="col-num">${item.quantidade} ${item.unidade}</div><div>${miniDel}</div>`;
               } else {
                   div.style.gridTemplateColumns = 'minmax(0, 3fr) minmax(0, 2fr) minmax(0, 1.2fr) minmax(0, 1.5fr) minmax(0, 2fr) 25px';
                   div.innerHTML = `<div class="col-texto"><strong>${item.produto}</strong></div><div class="col-texto" style="color:var(--text-muted);">${item.marca || '-'}</div><div class="col-num">${item.quantidade} ${item.unidade}</div><div class="col-num">${item.preco > 0 ? formatarMoeda(item.preco) : '-'}</div><div class="col-num" style="font-weight:700; color:var(--primary);">${item.total > 0 ? formatarMoeda(item.total) : '-'}</div><div>${miniDel}</div>`;
               }
           }
           container.appendChild(div);
       });
   
       const total = estadoAtual.listaAtiva.itens.reduce((acc, it) => acc + (it.total || 0), 0);
       document.getElementById('total-detalhado').innerText = formatarMoeda(total);
   }
   
   window.removerItem = (index) => {
       if(confirm("Remover item?")) { estadoAtual.listaAtiva.itens.splice(index, 1); atualizarUIListaDetalhada(); }
   };
   
   document.getElementById('btn-add-item').addEventListener('click', () => {
       const prod = document.getElementById('produto').value;
       const marca = document.getElementById('marca').value;
       const qtd = parseFloat(document.getElementById('quantidade').value);
       const unC = document.getElementById('unidade-compra').value;
       let preco = parseFloat(document.getElementById('preco').value);
       const unP = document.getElementById('unidade-preco').value;
   
       if (!prod || isNaN(qtd)) return alert("Preencha produto e quantidade.");
       
       let total = 0;
       const isPlanejamento = (estadoAtual.modo === 'listas_criar' || estadoAtual.modo === 'listas_editar');
       
       if (!isPlanejamento) {
           if (isNaN(preco)) preco = 0;
           if (preco > 0) { try { total = calcularTotalItem(qtd, unC, preco, unP); } catch(e) { return alert(e.message); } }
       } else { preco = 0; }
   
       estadoAtual.listaAtiva.itens.push({ produto: prod, marca, quantidade: qtd, unidade: unC, preco, unidadePreco: unP, total, confirmado: false });
       
       document.getElementById('produto').value = ''; document.getElementById('marca').value = ''; document.getElementById('quantidade').value = ''; document.getElementById('preco').value = '';
       document.getElementById('produto').focus();
       atualizarUIListaDetalhada();
   });
   
   document.getElementById('btn-salvar-lista').addEventListener('click', () => {
       if (estadoAtual.listaAtiva.itens.length === 0) return alert("A lista está vazia.");
       let nome = document.getElementById('nome-lista-ativa').value;
       if (!nome || !nome.trim()) nome = `Lista ${new Date().toLocaleDateString()}`;
       estadoAtual.listaAtiva.nome = nome;
       
       saveLista(estadoAtual.listaAtiva);
       
       const toast = document.getElementById("message-container");
       toast.textContent = "Lista guardada com sucesso!";
       toast.className = "message show";
       setTimeout(() => toast.className = "message hidden", 3000);
       
       voltarAoHub();
   });
   
   document.getElementById('btn-limpar-lista').addEventListener('click', () => {
       if(confirm("Limpar toda a lista?")) { estadoAtual.listaAtiva.itens = []; atualizarUIListaDetalhada(); }
   });
   
   /* ========================================================
      NOVA LÓGICA DA CALCULADORA DE FITA (COM MEMÓRIA DE ITEM)
      ======================================================== */
   function iniciarCalcSimples() {
       const visorTotal = document.getElementById('valor-total-geral');
       const displayInput = document.getElementById('input-display');
       const visorOp = document.getElementById('visor-operacao');
       const historico = document.getElementById('historico-lista');
   
       let inputAtual = '0';
       let valPendente = 0;
       let opPendente = null;
   
       // Recuperar fita salva
       const dadosSalvos = localStorage.getItem('calc_geral_dados');
       if (dadosSalvos) {
           const dados = JSON.parse(dadosSalvos);
           estadoAtual.totalGeral = dados.total;
           visorTotal.textContent = formatarMoeda(dados.total);
           historico.innerHTML = dados.html;
           setTimeout(() => { historico.parentElement.scrollTop = historico.parentElement.scrollHeight; }, 100);
       } else {
           estadoAtual.totalGeral = 0; visorTotal.textContent = '0.00'; historico.innerHTML = '';
       }
   
       const salvarEstado = () => localStorage.setItem('calc_geral_dados', JSON.stringify({ total: estadoAtual.totalGeral, html: historico.innerHTML }));
   
       const updateDisplay = () => {
           displayInput.textContent = inputAtual;
           if (opPendente) {
               const sinal = opPendente === 'mult' ? '×' : '÷';
               visorOp.textContent = `${formatarMoeda(valPendente)} ${sinal}`;
           } else {
               visorOp.innerHTML = '&nbsp;';
           }
       };
   
       const addHist = (textoOperacao, valorAdicionado) => {
           const li = document.createElement('li'); li.className = 'tape-item';
           li.innerHTML = `<span>${textoOperacao}</span><span>= ${formatarMoeda(estadoAtual.totalGeral)}</span>`;
           historico.appendChild(li);
           historico.parentElement.scrollTop = historico.parentElement.scrollHeight;
       };
   
       // Destrói eventos antigos recriando o teclado
       const keypad = document.getElementById('teclado-calculadora');
       const newKeypad = keypad.cloneNode(true);
       keypad.replaceWith(newKeypad);
   
       document.getElementById('teclado-calculadora').addEventListener('click', (e) => {
           const btn = e.target.closest('.btn-key');
           if (!btn) return;
   
           // DIGITAR NÚMEROS E PONTOS
           if (btn.dataset.num !== undefined) {
               const num = btn.dataset.num;
               if (num === '.' && inputAtual.includes('.')) return;
               if (inputAtual === '0' && num !== '.') inputAtual = num;
               else inputAtual += num;
               updateDisplay();
           }
   
           // APAGAR (BACKSPACE/CLEAR)
           if (btn.dataset.action === 'clear') {
               inputAtual = '0'; valPendente = 0; opPendente = null;
               updateDisplay();
           }
   
           // OPERAÇÕES
           if (btn.dataset.op !== undefined) {
               const op = btn.dataset.op;
               const valorInput = parseFloat(inputAtual) || 0;
   
               // MULTIPLICAR OU DIVIDIR (Prepara o preço para a quantidade)
               if (op === 'mult' || op === 'div') {
                   valPendente = valorInput;
                   opPendente = op;
                   inputAtual = '0';
                   updateDisplay();
                   return;
               }
   
               // SOMAR OU SUBTRAIR DA FITA GERAL
               if (op === 'soma' || op === 'subt') {
                   let itemTotal = valorInput;
                   let textoFita = '';
   
                   // Se houver uma multiplicação esperando (ex: Preço x Quantidade)
                   if (opPendente) {
                       if (opPendente === 'mult') itemTotal = valPendente * valorInput;
                       if (opPendente === 'div') itemTotal = valorInput !== 0 ? valPendente / valorInput : 0;
   
                       const sinalM = opPendente === 'mult' ? '×' : '÷';
                       const sinalS = op === 'soma' ? '+' : '-';
                       textoFita = `<span class="tape-op">${sinalS}</span> ${formatarMoeda(valPendente)} ${sinalM} ${valorInput}`;
                   } else {
                       const sinalS = op === 'soma' ? '+' : '-';
                       textoFita = `<span class="tape-op">${sinalS}</span> ${formatarMoeda(itemTotal)}`;
                   }
   
                   if (op === 'soma') estadoAtual.totalGeral += itemTotal;
                   if (op === 'subt') estadoAtual.totalGeral -= itemTotal;
   
                   visorTotal.textContent = formatarMoeda(estadoAtual.totalGeral);
                   addHist(textoFita, itemTotal);
                   salvarEstado();
   
                   inputAtual = '0';
                   valPendente = 0;
                   opPendente = null;
                   updateDisplay();
               }
           }
       });
   
       // BOTÃO ZERAR TUDO
       const btnLimpar = document.getElementById('btn-limpar-geral');
       const newBtnLimpar = btnLimpar.cloneNode(true);
       btnLimpar.replaceWith(newBtnLimpar);
       
       document.getElementById('btn-limpar-geral').addEventListener('click', () => {
           if(confirm("Deseja zerar toda a fita do supermercado?")) {
               estadoAtual.totalGeral = 0; visorTotal.textContent = '0.00'; historico.innerHTML = '';
               inputAtual = '0'; valPendente = 0; opPendente = null; updateDisplay();
               localStorage.removeItem('calc_geral_dados');
           }
       });
   
       updateDisplay();
   }
   
   // INICIALIZADOR DO SERVICE WORKER
   if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(console.error);
