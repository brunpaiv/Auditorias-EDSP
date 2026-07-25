// ===== DADOS INICIAIS =====
const defaultData = [
    { id: 1, node: "SBU9", programa: "EDSP", item: 1, descricao: "Alvara e AVCB Ausente", status: "Concluido", comentarios: "" },
    { id: 2, node: "SBU9", programa: "EDSP", item: 2, descricao: "Somente uma Impressora ZEBRA", status: "Concluido", comentarios: "" },
    { id: 3, node: "SBU9", programa: "EDSP", item: 3, descricao: "Somente um TC Na base", status: "Concluido", comentarios: "" },
    { id: 4, node: "SBU9", programa: "EDSP", item: 4, descricao: "2 Paleteiras em ma condicao e ausencia de gaiolas", status: "Concluido", comentarios: "" },
    { id: 5, node: "SBU9", programa: "EDSP", item: 5, descricao: "Kit de Primeiros socorros ausente na operacao", status: "Concluido", comentarios: "" },
    { id: 6, node: "SBU9", programa: "EDSP", item: 6, descricao: "Falta de EPI's e cuidados na esteira (Cabelo solto, roupas inadequadas)", status: "Concluido", comentarios: "" },
    { id: 7, node: "SBU9", programa: "EDSP", item: 7, descricao: "Gestao do dispatch, sem startup", status: "Concluido", comentarios: "" },
    { id: 8, node: "SBU9", programa: "EDSP", item: 8, descricao: "Quadro Gestao A VISTA", status: "Concluido", comentarios: "" },
    { id: 9, node: "SBU9", programa: "EDSP", item: 9, descricao: "Processo de tratativa de pacotes feita de forma erronea (PS Com fotos falsas e de pacotes nao presentes na base)", status: "Concluido", comentarios: "" },
    { id: 10, node: "SBU9", programa: "EDSP", item: 10, descricao: "Base sem demarcacao de pedestres", status: "Concluido", comentarios: "" },
    { id: 11, node: "SBU9", programa: "EDSP", item: 11, descricao: "Wash report nao e reportado", status: "Concluido", comentarios: "" },
    { id: 12, node: "SBU9", programa: "EDSP", item: 12, descricao: "LOST Nao atingindo o target de 500 DPMO devido erros de processo", status: "Concluido", comentarios: "" },
    { id: 13, node: "SBU9", programa: "EDSP", item: 13, descricao: "Pessoas externas com livre acesso a operacao e eventualmente aos pacotes", status: "Concluido", comentarios: "" },
    { id: 14, node: "SBU9", programa: "EDSP", item: 14, descricao: "Lixeiras em baixo da esteiras, que acende um red flag a eventuais desvios.", status: "Concluido", comentarios: "" },
    { id: 15, node: "SSJ9", programa: "EDSP", item: 1, descricao: "Esteira muito curta, nao tem espaco suficiente para processar os pacotes", status: "Concluido", comentarios: "Foi prolongado a esteira com mais 5 mts automatizado e 3 manual" },
    { id: 16, node: "SSJ9", programa: "EDSP", item: 2, descricao: "Pouca quantidade de associados fazem a separacao (pick to buffer) gerando atraso", status: "Concluido", comentarios: "Mundanca de processo e adequacao da MO" },
    { id: 17, node: "SSJ9", programa: "EDSP", item: 3, descricao: "Falta gaiola/prateleira para conseguir fazer a triagem adequada, sao de 30-40 rotas por dia", status: "Concluido", comentarios: "Recebido quantidade de gaiolas e adequado processo total 90 gaiolas" },
    { id: 18, node: "SSJ9", programa: "EDSP", item: 4, descricao: "A falta de gaiolas/prateleiras e a esteira nao cobrir uma area maior, gera uma demora consideravel para terminar o processo", status: "Concluido", comentarios: "Idem itens anteriores" },
    { id: 19, node: "SSC9", programa: "EDSP", item: 1, descricao: "Possui suporte na estacao e apresenta apenas duas lampadas queimadas, causando assim a nao conformidade na iluminacao", status: "Concluido", comentarios: "Foi substituido as lampadas queimadas e instalado refletores laterais" },
    { id: 20, node: "SSC9", programa: "EDSP", item: 2, descricao: "Possui o alvara de funcionamento, entretanto o mesmo nao esta em local visivel, orientado a fixar o alvara em local visivel", status: "Concluido", comentarios: "Foi impresso e disponibilizado na base" },
    { id: 21, node: "SSC9", programa: "EDSP", item: 3, descricao: "Base possui paineis eletricos, mas estao sem sinalizacao adequada, necessario fixar placas de risco de choque eletrico", status: "Concluido", comentarios: "Foi realizado a identificacao dos paineis" },
    { id: 22, node: "STA9", programa: "EDSP", item: 1, descricao: "Extintores Vencidos", status: "Concluido", comentarios: "" },
    { id: 23, node: "STA9", programa: "EDSP", item: 2, descricao: "Base Sem Documentacao", status: "Concluido", comentarios: "" },
    { id: 24, node: "STA9", programa: "EDSP", item: 3, descricao: "Base Sem AVCB", status: "Concluido", comentarios: "" },
    { id: 25, node: "STA9", programa: "EDSP", item: 4, descricao: "Fios Eletricos aparente", status: "Concluido", comentarios: "" },
    { id: 26, node: "STA9", programa: "EDSP", item: 5, descricao: "Painel Eletrico Sem Tampa", status: "Concluido", comentarios: "" },
    { id: 27, node: "PLO1", programa: "EDSP", item: 1, descricao: "Nao ha Kit de Primeiros Socorros", status: "Pendente", comentarios: "" },
    { id: 28, node: "PLO1", programa: "EDSP", item: 2, descricao: "Cameras de seguranca gravam apenas 15 dias", status: "Pendente", comentarios: "" },
];

// ===== APP STATE =====
let auditorias = [];
let editingId = null;
let nextId = 100;

// ===== INICIALIZACAO =====
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    render();
    updateLastUpdate();
});

// ===== PERSISTENCIA (localStorage) =====
function loadData() {
    const saved = localStorage.getItem('auditorias-edsp');
    if (saved) {
        auditorias = JSON.parse(saved);
        nextId = Math.max(...auditorias.map(a => a.id), 99) + 1;
    } else {
        auditorias = [...defaultData];
        nextId = Math.max(...auditorias.map(a => a.id), 99) + 1;
        saveData();
    }
}

function saveData() {
    localStorage.setItem('auditorias-edsp', JSON.stringify(auditorias));
    updateLastUpdate();
}

function updateLastUpdate() {
    const now = new Date();
    const formatted = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('last-update').textContent = formatted;
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Filtros
    document.getElementById('filter-node').addEventListener('change', render);
    document.getElementById('filter-status').addEventListener('change', render);
    document.getElementById('filter-search').addEventListener('input', render);

    // Botoes
    document.getElementById('btn-add').addEventListener('click', openAddModal);
    document.getElementById('btn-export').addEventListener('click', exportCSV);

    // Modal
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('btn-cancel').addEventListener('click', closeModal);
    document.getElementById('audit-form').addEventListener('submit', handleFormSubmit);

    // Fechar modal ao clicar fora
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modal')) {
            closeModal();
        }
    });

    // Fechar modal com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

// ===== RENDERIZACAO =====
function render() {
    const filtered = getFilteredData();
    renderTable(filtered);
    renderCounters(filtered);
    renderNodeFilter();
}

function getFilteredData() {
    const nodeFilter = document.getElementById('filter-node').value;
    const statusFilter = document.getElementById('filter-status').value;
    const searchFilter = document.getElementById('filter-search').value.toLowerCase().trim();

    return auditorias.filter(item => {
        if (nodeFilter && item.node !== nodeFilter) return false;
        if (statusFilter && item.status !== statusFilter) return false;
        if (searchFilter && !item.descricao.toLowerCase().includes(searchFilter) && !item.comentarios.toLowerCase().includes(searchFilter)) return false;
        return true;
    });
}

function renderTable(data) {
    const tbody = document.getElementById('audit-tbody');

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <p>Nenhuma auditoria encontrada</p>
                        <span>Ajuste os filtros ou adicione uma nova auditoria</span>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = data.map(item => `
        <tr>
            <td><strong>${escapeHtml(item.node)}</strong></td>
            <td>${escapeHtml(item.programa)}</td>
            <td>${item.item}</td>
            <td>${escapeHtml(item.descricao)}</td>
            <td><span class="status-badge status-${item.status.toLowerCase()}">${item.status}</span></td>
            <td>${escapeHtml(item.comentarios || '-')}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-edit" onclick="editItem(${item.id})" title="Editar">Editar</button>
                    <button class="btn btn-danger" onclick="deleteItem(${item.id})" title="Excluir">Excluir</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderCounters(filtered) {
    const total = filtered.length;
    const pending = filtered.filter(i => i.status === 'Pendente').length;
    const done = filtered.filter(i => i.status === 'Concluido').length;

    document.getElementById('total-count').textContent = total;
    document.getElementById('pending-count').textContent = pending;
    document.getElementById('done-count').textContent = done;
}

function renderNodeFilter() {
    const select = document.getElementById('filter-node');
    const currentValue = select.value;
    const nodes = [...new Set(auditorias.map(a => a.node))].sort();

    // Preserva opcoes sem recriar se nao mudou
    const existingOptions = Array.from(select.options).map(o => o.value).filter(v => v);
    if (JSON.stringify(nodes) === JSON.stringify(existingOptions)) return;

    select.innerHTML = '<option value="">Todas</option>' +
        nodes.map(n => `<option value="${n}" ${n === currentValue ? 'selected' : ''}>${n}</option>`).join('');
}

// ===== MODAL =====
function openAddModal() {
    editingId = null;
    document.getElementById('modal-title').textContent = 'Nova Auditoria';
    document.getElementById('audit-form').reset();
    document.getElementById('input-programa').value = 'EDSP';
    document.getElementById('modal').classList.remove('hidden');
    document.getElementById('input-node').focus();
}

function openEditModal(item) {
    editingId = item.id;
    document.getElementById('modal-title').textContent = 'Editar Auditoria';
    document.getElementById('input-node').value = item.node;
    document.getElementById('input-programa').value = item.programa;
    document.getElementById('input-item').value = item.item;
    document.getElementById('input-descricao').value = item.descricao;
    document.getElementById('input-status').value = item.status;
    document.getElementById('input-comentarios').value = item.comentarios || '';
    document.getElementById('modal').classList.remove('hidden');
    document.getElementById('input-node').focus();
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    editingId = null;
}

// ===== CRUD =====
function handleFormSubmit(e) {
    e.preventDefault();

    const formData = {
        node: document.getElementById('input-node').value.trim().toUpperCase(),
        programa: document.getElementById('input-programa').value.trim(),
        item: parseInt(document.getElementById('input-item').value),
        descricao: document.getElementById('input-descricao').value.trim(),
        status: document.getElementById('input-status').value,
        comentarios: document.getElementById('input-comentarios').value.trim(),
    };

    if (editingId !== null) {
        // Editar existente
        const index = auditorias.findIndex(a => a.id === editingId);
        if (index !== -1) {
            auditorias[index] = { ...auditorias[index], ...formData };
        }
    } else {
        // Adicionar novo
        auditorias.push({
            id: nextId++,
            ...formData
        });
    }

    saveData();
    closeModal();
    render();
}

function editItem(id) {
    const item = auditorias.find(a => a.id === id);
    if (item) openEditModal(item);
}

function deleteItem(id) {
    const item = auditorias.find(a => a.id === id);
    if (!item) return;

    if (confirm(`Excluir auditoria "${item.descricao}"?`)) {
        auditorias = auditorias.filter(a => a.id !== id);
        saveData();
        render();
    }
}

// ===== EXPORTAR CSV =====
function exportCSV() {
    const filtered = getFilteredData();
    const headers = ['Node', 'Programa', 'Item', 'Itens Nao Conformes', 'Status', 'Comentarios'];
    const rows = filtered.map(item => [
        item.node,
        item.programa,
        item.item,
        `"${item.descricao.replace(/"/g, '""')}"`,
        item.status,
        `"${(item.comentarios || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `auditorias_edsp_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
}

// ===== UTILITARIOS =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== RESET DATA (funcao utilitaria) =====
function resetData() {
    if (confirm('Isso ira restaurar todos os dados para o estado original. Continuar?')) {
        localStorage.removeItem('auditorias-edsp');
        auditorias = [...defaultData];
        nextId = Math.max(...auditorias.map(a => a.id), 99) + 1;
        saveData();
        render();
    }
}
