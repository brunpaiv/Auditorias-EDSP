// ===== CONFIGURACAO =====
// IMPORTANTE: Substitua a URL abaixo pela URL do seu Google Apps Script
// (Veja as instrucoes no arquivo google-apps-script.js)
const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbw46is0HgQt4DZBVg2Az6v66NlYJ9uzbnDsBDixXDZgqiKydAI--zyjrWdlHOKqcxc/exec';

// ===== DADOS INICIAIS (vazio - dados vem do Google Sheets) =====
const defaultData = [];

// ===== APP STATE =====
let auditorias = [];
let editingId = null;
let nextId = 100;
let useSheets = false;

// ===== INICIALIZACAO =====
document.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    useSheets = SHEETS_API_URL !== 'COLE_SUA_URL_AQUI' && SHEETS_API_URL.startsWith('https://');
    
    if (useSheets) {
        showLoading(true);
        await loadFromSheets();
        showLoading(false);
    } else {
        loadFromLocal();
    }
    
    setupEventListeners();
    render();
    updateLastUpdate();
}

// ===== LOADING INDICATOR =====
function showLoading(show) {
    const tbody = document.getElementById('audit-tbody');
    if (show) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:2rem; color:#888;">
                    Carregando dados do Google Sheets...
                </td>
            </tr>
        `;
    }
}

// ===== PERSISTENCIA - GOOGLE SHEETS =====
async function loadFromSheets() {
    try {
        const response = await fetch(SHEETS_API_URL);
        const data = await response.json();
        auditorias = data.map(row => ({
            id: Number(row.id),
            node: String(row.node || ''),
            programa: String(row.programa || ''),
            item: Number(row.item),
            descricao: String(row.descricao || ''),
            status: String(row.status || ''),
            comentarios: String(row.comentarios || '')
        }));
        nextId = Math.max(...auditorias.map(a => a.id), 99) + 1;
    } catch (error) {
        console.error('Erro ao carregar dados do Sheets:', error);
        alert('Erro ao conectar com Google Sheets. Usando dados locais.');
        loadFromLocal();
    }
}

async function addToSheets(item) {
    try {
        await fetch(SHEETS_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'add', data: item }),
            headers: { 'Content-Type': 'text/plain' }
        });
    } catch (error) {
        console.error('Erro ao adicionar no Sheets:', error);
    }
}

async function updateInSheets(item) {
    try {
        await fetch(SHEETS_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'update', data: item }),
            headers: { 'Content-Type': 'text/plain' }
        });
    } catch (error) {
        console.error('Erro ao atualizar no Sheets:', error);
    }
}

async function deleteFromSheets(id) {
    try {
        await fetch(SHEETS_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'delete', data: { id: id } }),
            headers: { 'Content-Type': 'text/plain' }
        });
    } catch (error) {
        console.error('Erro ao excluir no Sheets:', error);
    }
}

// ===== PERSISTENCIA - LOCAL (fallback) =====
function loadFromLocal() {
    const saved = localStorage.getItem('auditorias-edsp');
    if (saved) {
        auditorias = JSON.parse(saved);
        nextId = Math.max(...auditorias.map(a => a.id), 99) + 1;
    } else {
        auditorias = [...defaultData];
        nextId = Math.max(...auditorias.map(a => a.id), 99) + 1;
        saveLocal();
    }
}

function saveLocal() {
    localStorage.setItem('auditorias-edsp', JSON.stringify(auditorias));
}

function updateLastUpdate() {
    const now = new Date();
    const formatted = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('last-update').textContent = formatted;
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    document.getElementById('filter-node').addEventListener('change', render);
    document.getElementById('filter-status').addEventListener('change', render);
    document.getElementById('filter-search').addEventListener('input', render);
    document.getElementById('btn-add').addEventListener('click', openAddModal);
    document.getElementById('btn-export').addEventListener('click', exportCSV);
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('btn-cancel').addEventListener('click', closeModal);
    document.getElementById('audit-form').addEventListener('submit', handleFormSubmit);

    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modal')) closeModal();
    });

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
async function handleFormSubmit(e) {
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
        const index = auditorias.findIndex(a => a.id === editingId);
        if (index !== -1) {
            auditorias[index] = { ...auditorias[index], ...formData };
            if (useSheets) await updateInSheets(auditorias[index]);
        }
    } else {
        const newItem = { id: nextId++, ...formData };
        auditorias.push(newItem);
        if (useSheets) await addToSheets(newItem);
    }

    if (!useSheets) saveLocal();
    closeModal();
    render();
    updateLastUpdate();
}

function editItem(id) {
    const item = auditorias.find(a => a.id === id);
    if (item) openEditModal(item);
}

async function deleteItem(id) {
    const item = auditorias.find(a => a.id === id);
    if (!item) return;

    if (confirm(`Excluir auditoria "${item.descricao}"?`)) {
        auditorias = auditorias.filter(a => a.id !== id);
        if (useSheets) await deleteFromSheets(id);
        if (!useSheets) saveLocal();
        render();
        updateLastUpdate();
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

function resetData() {
    if (confirm('Isso ira restaurar todos os dados para o estado original. Continuar?')) {
        localStorage.removeItem('auditorias-edsp');
        auditorias = [...defaultData];
        nextId = Math.max(...auditorias.map(a => a.id), 99) + 1;
        saveLocal();
        render();
    }
}
