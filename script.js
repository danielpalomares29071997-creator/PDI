// === INÍCIO DO ARQUIVO script.js ===
// Código JavaScript do app (sem wrappers HTML)

// --- ESTADO DA APLICAÇÃO ---
let objectives = JSON.parse(localStorage.getItem('pdi_data')) || [];
let currentObjId = null;

// --- FUNÇÕES UTILITÁRIAS ---
const save = () => localStorage.setItem('pdi_data', JSON.stringify(objectives));
const today = () => new Date().toISOString().split('T')[0];
        
const calculateStats = (tasks) => {
    if (!tasks || tasks.length === 0) return { progress: 0, status: 'Abaixo do Esperado', completed: 0, total: 0 };
    const completed = tasks.filter(t => t.completedAt).length;
    const progress = (completed / tasks.length) * 100;
    
    let status = 'Abaixo do Esperado';
    if (progress >= 85) status = 'Padrão';
    if (progress === 100) status = 'Excede os Requisitos';
    
    return { progress, status, completed, total: tasks.length };
};

// --- NAVEGAÇÃO ---
function showScreen(screenName) {
    // Esconde todas
    ['dashboard', 'add-objective', 'details'].forEach(s => {
        const el = document.getElementById(`screen-${s}`);
        if (el) el.classList.add('hidden');
    });
    
    // Mostra a selecionada
    const target = document.getElementById(`screen-${screenName}`);
    if (target) target.classList.remove('hidden');

    // Lógica específica ao abrir
    const btn = document.getElementById('btnNewObjective');
    if (screenName === 'dashboard') {
        renderDashboard();
        if (btn) btn.classList.remove('hidden');
    } else if (btn) {
        btn.classList.add('hidden');
    }

        // Atualiza ícones Lucide (se disponível)
        if (globalThis.lucide && lucide.createIcons) lucide.createIcons();
}

// --- DASHBOARD ---
function renderDashboard() {
    const listEl = document.getElementById('objectivesList');
    if (!listEl) return;
    listEl.innerHTML = '';

    let totalTasks = 0, completedTasks = 0, lateTasks = 0;
    let lateObjs = 0;

    if (objectives.length === 0) {
        listEl.innerHTML = `<div class="card" style="text-align:center; color:#888; padding:3rem;">Nenhum objetivo cadastrado.</div>`;
    }

    objectives.forEach(obj => {
        const { progress, status, completed, total } = calculateStats(obj.tasks);
        
        // KPIs Globais
        totalTasks += total;
        completedTasks += completed;
        
        // Verifica atrasos
        const objLate = obj.dueDate && obj.dueDate < today() && progress < 100;
        if (objLate) lateObjs++;

        (obj.tasks || []).forEach(t => {
            if (!t.completedAt && t.dueDate && t.dueDate < today()) lateTasks++;
        });

        // Cores da barra
        let barClass = 'bg-red';
        if (progress >= 85) barClass = 'bg-yellow';
        if (progress === 100) barClass = 'bg-green';

        // Badge Class
        let badgeClass = 'badge-red';
        if (status === 'Padrão') badgeClass = 'badge-yellow';
        if (status === 'Excede os Requisitos') badgeClass = 'badge-green';

        // Renderiza Card
        const card = document.createElement('div');
        card.className = 'card objective-item';
        card.onclick = () => openObjective(obj.id);
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="font-bold" style="font-size:1.1rem">${obj.title}</h3>
                    <p class="text-sm text-gray">${obj.description || 'Sem descrição'}</p>
                    <div class="text-sm text-gray mt-2">
                        <i data-lucide="calendar" style="width:14px; vertical-align:middle"></i> 
                        Entrega: ${obj.dueDate || 'N/A'} • ${completed}/${total} Tarefas
                    </div>
                </div>
                <span class="badge ${badgeClass}">${status}</span>
            </div>
            <div class="progress-container">
                <div class="progress-header">
                    <span>Progresso</span>
                    <span>${progress.toFixed(0)}%</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill ${barClass}" style="width: ${progress}%"></div>
                </div>
            </div>
        `;
        listEl.appendChild(card);
    });

    // Atualiza KPIs no DOM
    const kpiTotal = document.getElementById('kpiTotal'); if (kpiTotal) kpiTotal.textContent = objectives.length;
    const kpiCompleted = document.getElementById('kpiCompleted'); if (kpiCompleted) kpiCompleted.textContent = completedTasks;
    const kpiPending = document.getElementById('kpiPending'); if (kpiPending) kpiPending.textContent = totalTasks - completedTasks;
    const kpiLate = document.getElementById('kpiLate'); if (kpiLate) kpiLate.textContent = `${lateTasks}`;
}

// --- ADICIONAR OBJETIVO ---
const formObjective = document.getElementById('formObjective');
if (formObjective) {
    formObjective.onsubmit = (e) => {
        e.preventDefault();
        const newObj = {
            id: crypto.randomUUID(),
            title: document.getElementById('objTitle').value,
            description: document.getElementById('objDescription').value,
            startDate: document.getElementById('objStart').value,
            dueDate: document.getElementById('objDue').value,
            tasks: []
        };
        objectives.push(newObj);
        save();
        e.target.reset();
        showScreen('dashboard');
    };
}

// --- DETALHES DO OBJETIVO ---
function openObjective(id) {
    currentObjId = id;
    const obj = objectives.find(o => o.id === id);
    if (!obj) return;

    // Preenche info
    const dt = document.getElementById('detailTitle'); if (dt) dt.textContent = obj.title;
    const dd = document.getElementById('detailDesc'); if (dd) dd.textContent = obj.description;
    
    updateDetailStats(obj);
    renderTasks(obj);
    resetTaskForm(); // Limpa form lateral
    
    showScreen('details');
}

function updateDetailStats(obj) {
    const { progress, status } = calculateStats(obj.tasks);
    
    // Atualiza Badge
    const badge = document.getElementById('detailBadge');
    if (badge) {
        badge.textContent = status;
        badge.className = 'badge'; // reset
        if (status === 'Padrão') badge.classList.add('badge-yellow');
        else if (status === 'Excede os Requisitos') badge.classList.add('badge-green');
        else badge.classList.add('badge-red');
    }

    // Atualiza Barra
    const perc = document.getElementById('detailPerc'); if (perc) perc.textContent = `${progress.toFixed(0)}%`;
    const bar = document.getElementById('detailBar');
    if (bar) {
        bar.style.width = `${progress}%`;
        bar.className = 'progress-bar-fill'; // reset
        if (progress >= 85) bar.classList.add('bg-yellow');
        if (progress === 100) bar.classList.add('bg-green');
        if (progress < 85) bar.classList.add('bg-red');
    }
}

// --- TAREFAS ---
function renderTasks(obj) {
    const list = document.getElementById('taskList'); if (!list) return;
    list.innerHTML = '';
    const taskCount = document.getElementById('taskCountBadge'); if (taskCount) taskCount.textContent = obj.tasks.length;

    if (!obj.tasks || obj.tasks.length === 0) {
        list.innerHTML = '<p class="text-gray text-sm italic">Nenhuma tarefa registrada.</p>';
        return;
    }

    obj.tasks.forEach(task => {
        const isCompleted = !!task.completedAt;
        const isLate = !isCompleted && task.dueDate && task.dueDate < today();

        const el = document.createElement('div');
        el.className = `task-item ${isCompleted ? 'completed' : ''}`;
        el.innerHTML = `
            <div class="task-check ${isCompleted ? 'checked' : ''}" onclick="toggleTask('${task.id}')">
                <i data-lucide="check" size="14"></i>
            </div>
            <div class="task-content">
                <div class="flex justify-between items-start">
                    <h4 class="task-title">${task.title}</h4>
                    <div class="task-actions">
                        <button class="icon-btn" onclick="editTask('${task.id}')"><i data-lucide="edit-2" size="16"></i></button>
                        <button class="icon-btn delete" onclick="deleteTask('${task.id}')"><i data-lucide="trash-2" size="16"></i></button>
                    </div>
                </div>
                <p class="text-sm text-gray">${task.details || ''}</p>
                <div class="flex gap-4 mt-2 text-sm text-gray" style="font-size:0.75rem">
                    <span>Criado: ${task.createdAt}</span>
                    ${task.dueDate ? `<span class="${isLate ? 'text-red font-bold' : ''}">Entrega: ${task.dueDate}</span>` : ''}
                    ${isCompleted ? `<span class="text-green font-bold">Concluído: ${task.completedAt}</span>` : ''}
                </div>
            </div>
        `;
        list.appendChild(el);
    });
        if (globalThis.lucide && lucide.createIcons) lucide.createIcons();
}

const formTask = document.getElementById('formTask');
if (formTask) {
    formTask.onsubmit = (e) => {
        e.preventDefault();
        const obj = objectives.find(o => o.id === currentObjId);
        if (!obj) return;
        const taskId = document.getElementById('taskId').value;

        const taskData = {
            title: document.getElementById('taskTitle').value,
            details: document.getElementById('taskDetails').value,
            createdAt: document.getElementById('taskCreated').value,
            dueDate: document.getElementById('taskDue').value,
            completedAt: document.getElementById('taskCompleted').value
        };

        if (taskId) {
            // Editar
            const index = obj.tasks.findIndex(t => t.id === taskId);
            if (index !== -1) {
                obj.tasks[index] = { ...obj.tasks[index], ...taskData };
            }
        } else {
            // Criar
            obj.tasks.push({ id: crypto.randomUUID(), ...taskData });
        }

        save();
        renderTasks(obj);
        updateDetailStats(obj);
        resetTaskForm();
    };
}

function toggleTask(taskId) {
    const obj = objectives.find(o => o.id === currentObjId);
    if (!obj) return;
    const task = obj.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    if (task.completedAt) {
        task.completedAt = '';
    } else {
        task.completedAt = today();
    }
    
    save();
    renderTasks(obj);
    updateDetailStats(obj);
}

function deleteTask(taskId) {
    if(!confirm('Excluir tarefa?')) return;
    const obj = objectives.find(o => o.id === currentObjId);
    if (!obj) return;
    obj.tasks = obj.tasks.filter(t => t.id !== taskId);
    save();
    renderTasks(obj);
    updateDetailStats(obj);
}

function editTask(taskId) {
    const obj = objectives.find(o => o.id === currentObjId);
    if (!obj) return;
    const task = obj.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDetails').value = task.details;
    document.getElementById('taskCreated').value = task.createdAt;
    document.getElementById('taskDue').value = task.dueDate;
    document.getElementById('taskCompleted').value = task.completedAt;
    
    const formTitle = document.getElementById('taskFormTitle'); if (formTitle) formTitle.textContent = "Editar Tarefa";
    const btnCancel = document.getElementById('btnCancelTask'); if (btnCancel) btnCancel.classList.remove('hidden');
}

function resetTaskForm() {
    const form = document.getElementById('formTask'); if (form) form.reset();
    const taskId = document.getElementById('taskId'); if (taskId) taskId.value = '';
    const taskCreated = document.getElementById('taskCreated'); if (taskCreated) taskCreated.value = today();
    const formTitle = document.getElementById('taskFormTitle'); if (formTitle) formTitle.textContent = "Nova Tarefa";
    const btnCancel = document.getElementById('btnCancelTask'); if (btnCancel) btnCancel.classList.add('hidden');
}

function deleteCurrentObjective() {
    if(confirm('Tem certeza? Isso apagará todas as tarefas deste objetivo.')) {
        objectives = objectives.filter(o => o.id !== currentObjId);
        save();
        showScreen('dashboard');
    }
}

// --- INICIALIZAÇÃO ---
renderDashboard();
if (globalThis.lucide && lucide.createIcons) lucide.createIcons();
// expor funções usadas via atributos onclick para satisfazer o linter (e manter compatibilidade)
globalThis.toggleTask = toggleTask;
globalThis.deleteTask = deleteTask;
globalThis.editTask = editTask;
globalThis.deleteCurrentObjective = deleteCurrentObjective;
// === FIM DO ARQUIVO script.js ===