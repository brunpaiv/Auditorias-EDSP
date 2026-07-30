// ===== CONFIGURACAO =====
// IMPORTANTE: Substitua a URL abaixo pela URL do seu Google Apps Script
// (Veja as instrucoes no arquivo google-apps-script.js)
const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbyE5-WafNxMRp2wmobUEHeifBBw2BPrHF2lnOn6B0C00rMIP3Aaru88-clwFLfeMQw/exec';

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
    setupEvidenceListeners();
    document.getElementById('filter-status').value = 'Pendente';
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
            responsavel: String(row['Responsável'] || row.responsavel || ''),
            data_auditoria: (row.Data || row.data || row.data_auditoria || '').toString().substring(0, 10),
            acoes: String(row.acoes || ''),
            comentarios: String(row.comentarios || ''),
            evidencias: String(row.evidencias || '')
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
                <td colspan="8">
                    <div class="empty-state">
                        <p>Nenhuma auditoria encontrada</p>
                        <span>Ajuste os filtros ou adicione uma nova auditoria</span>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = data.map(item => {
        const evidences = getEvidences(item.id);
        const evidenceHtml = evidences.length > 0
            ? evidences.map((ev, idx) => `<div class="evidence-wrapper"><img src="${ev}" class="evidence-thumb" onclick="viewEvidence('${ev}')"><span class="evidence-remove" onclick="removeEvidence(${item.id}, ${idx})">x</span></div>`).join('')
            : '';

        const statusSelected = item.status === 'Pendente' ? 'Pendente' : 'Concluido';

        return `
        <tr>
            <td><strong>${escapeHtml(item.node)}</strong></td>
            <td>${escapeHtml(item.programa)}</td>
            <td>${escapeHtml(item.descricao)}</td>
            <td contenteditable="true" spellcheck="false" class="editable-cell" onblur="updateAcoes(${item.id}, this.textContent.trim())">${escapeHtml(item.comentarios || '')}</td>
            <td contenteditable="true" spellcheck="false" class="editable-cell" onblur="updateResponsavel(${item.id}, this.textContent.trim())">${escapeHtml(item.responsavel || '')}</td>
            <td contenteditable="true" spellcheck="false" class="editable-cell ${getDateColor(item.data_auditoria)}" onblur="updateData(${item.id}, this.textContent.trim())">${escapeHtml(item.data_auditoria || '')}</td>
            <td>
                <div class="evidence-cell">
                    ${evidenceHtml}
                    <label class="btn-upload-evidence" title="Subir evidência">
                        📷
                        <input type="file" accept="image/*" multiple onchange="uploadEvidence(${item.id}, this.files)" style="display:none">
                    </label>
                </div>
            </td>
            <td>
                <select class="inline-select ${statusSelected === 'Pendente' ? 'select-pendente' : 'select-concluido'}" onchange="this.className='inline-select '+(this.value==='Pendente'?'select-pendente':'select-concluido'); setStatus(${item.id}, this.value)">
                    <option value="Pendente" ${statusSelected === 'Pendente' ? 'selected' : ''}>Pendente</option>
                    <option value="Concluido" ${statusSelected === 'Concluido' ? 'selected' : ''}>Concluído</option>
                </select>
            </td>
        </tr>
    `}).join('');
}

function renderCounters(filtered) {
    const total = auditorias.length;
    const pending = auditorias.filter(i => i.status === 'Pendente').length;
    const done = auditorias.filter(i => i.status === 'Concluído' || i.status === 'Concluido').length;

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
    evidenceFiles = [];
    document.getElementById('modal-title').textContent = 'Nova Auditoria';
    document.getElementById('audit-form').reset();
    document.getElementById('input-programa').value = 'EDSP';
    renderEvidenceList();
    document.getElementById('modal').classList.remove('hidden');
    document.getElementById('input-node').focus();
}

function openEditModal(item) {
    editingId = item.id;
    evidenceFiles = [];
    document.getElementById('modal-title').textContent = 'Editar Auditoria';
    document.getElementById('input-node').value = item.node;
    document.getElementById('input-programa').value = item.programa;
    document.getElementById('input-item').value = item.item;
    document.getElementById('input-descricao').value = item.descricao;
    document.getElementById('input-status').value = item.status;
    document.getElementById('input-responsavel').value = item.responsavel || '';
    document.getElementById('input-comentarios').value = item.comentarios || '';
    renderEvidenceList();
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
        responsavel: document.getElementById('input-responsavel').value.trim(),
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

async function setStatus(id, newStatus) {
    const index = auditorias.findIndex(a => a.id === id);
    if (index === -1) return;
    auditorias[index].status = newStatus;
    if (useSheets) await updateInSheets(auditorias[index]);
    if (!useSheets) saveLocal();
    render();
    updateLastUpdate();
}

async function updateField(id, field, value) {
    const index = auditorias.findIndex(a => a.id === id);
    if (index === -1) return;
    auditorias[index][field] = value;
    if (useSheets) await updateInSheets(auditorias[index]);
    if (!useSheets) saveLocal();
    updateLastUpdate();
}

async function updateAcoes(id, value) {
    const index = auditorias.findIndex(a => a.id === id);
    if (index === -1) return;
    auditorias[index].comentarios = value;
    if (useSheets) await updateInSheets(auditorias[index]);
    if (!useSheets) saveLocal();
    updateLastUpdate();
}

async function updateData(id, value) {
    const index = auditorias.findIndex(a => a.id === id);
    if (index === -1) return;
    auditorias[index].data_auditoria = value;
    if (useSheets) {
        var url = SHEETS_API_URL + '?action=updateData&id=' + id + '&data_auditoria=' + encodeURIComponent(value);
        fetch(url, { mode: 'no-cors' });
    }
    if (!useSheets) saveLocal();
    render();
    updateLastUpdate();
}

async function updateResponsavel(id, value) {
    const index = auditorias.findIndex(a => a.id === id);
    if (index === -1) return;
    auditorias[index].responsavel = value;
    if (useSheets) {
        var url = SHEETS_API_URL + '?action=updateResponsavel&id=' + id + '&responsavel=' + encodeURIComponent(value);
        fetch(url, { mode: 'no-cors' });
    }
    if (!useSheets) saveLocal();
    updateLastUpdate();
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
    const headers = ['Node', 'Programa', 'Descricao', 'Status', 'Responsavel', 'Acoes', 'Comentarios'];
    const rows = filtered.map(item => [
        '"' + (item.node || '').replace(/"/g, '""') + '"',
        '"' + (item.programa || '').replace(/"/g, '""') + '"',
        '"' + (item.descricao || '').replace(/"/g, '""') + '"',
        '"' + (item.status || '').replace(/"/g, '""') + '"',
        '"' + (item.responsavel || '').replace(/"/g, '""') + '"',
        '"' + (item.acoes || '').replace(/"/g, '""') + '"',
        '"' + (item.comentarios || '').replace(/"/g, '""') + '"'
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

function getDateColor(dateStr) {
    if (!dateStr || dateStr.length < 8) return '';
    
    var parts = dateStr.split('-');
    var targetDate;
    
    if (parts.length === 3) {
        targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
        parts = dateStr.split('/');
        if (parts.length === 3) {
            targetDate = new Date(parts[2], parts[1] - 1, parts[0]);
        } else {
            return '';
        }
    }
    
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var diff = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
    
    if (diff <= 3) return 'date-red';
    if (diff <= 7) return 'date-yellow';
    return 'date-green';
}

// ===== EVIDENCIAS =====
let evidenceFiles = [];

function setupEvidenceListeners() {
    const input = document.getElementById('input-evidence');
    const dropZone = document.getElementById('evidence-drop');

    if (!input || !dropZone) return;

    input.addEventListener('change', (e) => {
        handleEvidenceFiles(e.target.files);
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ff9900';
        dropZone.style.background = '#fff8ed';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ddd';
        dropZone.style.background = '';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ddd';
        dropZone.style.background = '';
        handleEvidenceFiles(e.dataTransfer.files);
    });
}

function handleEvidenceFiles(files) {
    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            evidenceFiles.push({ name: file.name, data: e.target.result });
            renderEvidenceList();
        };
        reader.readAsDataURL(file);
    });
}

function renderEvidenceList() {
    const list = document.getElementById('evidence-list');
    if (!list) return;

    list.innerHTML = evidenceFiles.map((file, index) => `
        <div class="evidence-item">
            <img src="${file.data}" alt="${file.name}">
            <span>${file.name.substring(0, 15)}...</span>
            <span class="remove-evidence" onclick="removeModalEvidence(${index})">x</span>
        </div>
    `).join('');
}

function removeModalEvidence(index) {
    evidenceFiles.splice(index, 1);
    renderEvidenceList();
}

// ===== EVIDENCIAS NA TABELA =====
function getEvidences(itemId) {
    // Busca evidencias do objeto auditorias (vem do Sheets)
    const item = auditorias.find(a => a.id === itemId);
    if (item && item.evidencias) {
        const evStr = String(item.evidencias);
        if (evStr.length > 0) {
            return evStr.split('|').filter(url => url.length > 0);
        }
    }
    return [];
}

function uploadEvidence(itemId, files) {
    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                const maxSize = 600;
                let w = img.width;
                let h = img.height;
                if (w > maxSize || h > maxSize) {
                    if (w > h) { h = (h / w) * maxSize; w = maxSize; }
                    else { w = (w / h) * maxSize; h = maxSize; }
                }
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                const compressed = canvas.toDataURL('image/jpeg', 0.6);
                const base64Only = compressed.replace(/^data:image\/\w+;base64,/, '');

                try {
                    const response = await fetch(SHEETS_API_URL, {
                        method: 'POST',
                        body: JSON.stringify({
                            action: 'uploadImage',
                            data: { image: base64Only, fileName: file.name, itemId: itemId }
                        }),
                        headers: { 'Content-Type': 'text/plain' }
                    });
                    const result = await response.json();
                    if (result.success) {
                        // Atualizar localmente
                        const item = auditorias.find(a => a.id === itemId);
                        if (item) {
                            const existing = item.evidencias ? String(item.evidencias) : '';
                            item.evidencias = existing ? existing + '|' + result.url : result.url;
                        }
                        render();
                    } else {
                        alert('Erro ao subir imagem: ' + (result.error || 'desconhecido'));
                    }
                } catch (err) {
                    alert('Erro ao conectar com servidor.');
                    console.error(err);
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function viewEvidence(src) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:2000;cursor:pointer;';
    modal.onclick = () => modal.remove();
    const img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'max-width:90%;max-height:90%;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.5);';
    modal.appendChild(img);
    document.body.appendChild(modal);
}

async function removeEvidence(itemId, index) {
    if (!confirm('Deseja excluir esta evidência?')) return;

    const item = auditorias.find(a => a.id === itemId);
    if (!item || !item.evidencias) return;

    const evidences = String(item.evidencias).split('|').filter(url => url.length > 0);
    evidences.splice(index, 1);
    item.evidencias = evidences.join('|');

    // Atualizar apenas a coluna evidencias no Sheets
    if (useSheets) {
        try {
            await fetch(SHEETS_API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'updateEvidencias', data: { id: item.id, evidencias: item.evidencias } }),
                headers: { 'Content-Type': 'text/plain' }
            });
        } catch (err) {
            console.error('Erro ao remover evidência:', err);
        }
    }
    render();
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
