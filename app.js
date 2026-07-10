// State Management & LocalStorage
let state = {
    bikes: [],
    logs: [],
    issueTitles: [],
    currentSection: 'dashboard-section',
    viewMode: 'list' // 'grid' veya 'list'
};

const defaultIssueTitles = [
    "Korna çalmıyor / bozuk",
    "Ön fren çalışmıyor",
    "Arka fren çalışmıyor",
    "Lastik patlak (Ön)",
    "Lastik patlak (Arka)",
    "Zincir koptu / atıyor",
    "Vites geçişleri sorunlu",
    "Batarya şarj olmuyor",
    "Gidon yalpalaması / gevşek",
    "Pedal kırıldı / gevşek"
];

// Mock Data (First time users)
const mockBikes = [];

const mockLogs = [];

// Load data from LocalStorage or load mock data
function initApp() {
    const isResetFresh = localStorage.getItem('bisicab_reset_fresh_v2');
    if (!isResetFresh) {
        state.bikes = [];
        state.logs = [];
        state.issueTitles = [...defaultIssueTitles];
        saveToLocalStorage();
        localStorage.setItem('bisicab_reset_fresh_v2', 'true');
    } else {
        const savedBikes = localStorage.getItem('bisicab_bikes');
        const savedLogs = localStorage.getItem('bisicab_logs');
        const savedTitles = localStorage.getItem('bisicab_issue_titles');
        
        state.bikes = savedBikes ? JSON.parse(savedBikes) : [];
        state.logs = savedLogs ? JSON.parse(savedLogs) : [];
        state.issueTitles = savedTitles ? JSON.parse(savedTitles) : [...defaultIssueTitles];
    }
    
    setupEventListeners();
    handleRoutingFromHash();
    renderAll();
}

function saveToLocalStorage() {
    localStorage.setItem('bisicab_bikes', JSON.stringify(state.bikes));
    localStorage.setItem('bisicab_logs', JSON.stringify(state.logs));
    localStorage.setItem('bisicab_issue_titles', JSON.stringify(state.issueTitles));
}

// Helpers
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '';
    if (type === 'success') {
        icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'error') {
        icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    } else {
        icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }
    
    toast.innerHTML = `${icon}<span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('tr-TR', options);
}

function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays === 1) return 'Dün';
    return `${diffDays} gün önce`;
}

// Open and Close Modals
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active-modal');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active-modal');
    }
}

// UI Rendering Functions
function renderAll() {
    renderStats();
    renderTimeline();
    renderBikesGrid();
    renderLogsList();
    populateBikeSelects();
    populateIssueTitlesSelect();
}

function renderStats() {
    const total = state.bikes.length;
    const active = state.bikes.filter(b => b.status === 'Kullanılabilir').length;
    const maintenance = state.bikes.filter(b => b.status === 'Bakımda').length;
    const broken = state.bikes.filter(b => b.status === 'Arızalı').length;
    const resolvedLogsCount = state.logs.filter(l => l.status === 'Cozuldu').length;
    
    // Set Dashboard Stats Numbers
    document.getElementById('stat-total-bikes').textContent = total;
    document.getElementById('stat-active-bikes').textContent = active;
    document.getElementById('stat-maintenance-bikes').textContent = maintenance;
    document.getElementById('stat-broken-bikes').textContent = broken;
    document.getElementById('stat-resolved-logs').textContent = resolvedLogsCount;
    
    // Percentages
    const activePct = total > 0 ? Math.round((active / total) * 100) : 0;
    const maintenancePct = total > 0 ? Math.round((maintenance / total) * 100) : 0;
    const brokenPct = total > 0 ? Math.round((broken / total) * 100) : 0;
    
    // Set percentages labels
    document.getElementById('active-percentage').textContent = `${activePct}%`;
    document.getElementById('maintenance-percentage').textContent = `${maintenancePct}%`;
    document.getElementById('broken-percentage').textContent = `${brokenPct}%`;
    
    // Set progress bars width
    document.getElementById('active-progress-bar').style.width = `${activePct}%`;
    document.getElementById('maintenance-progress-bar').style.width = `${maintenancePct}%`;
    document.getElementById('broken-progress-bar').style.width = `${brokenPct}%`;
}

function renderTimeline() {
    const timelineContainer = document.getElementById('recent-logs-timeline');
    timelineContainer.innerHTML = '';
    
    // Sort logs by date descending and get recent 5 logs
    const recentLogs = [...state.logs]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
        
    if (recentLogs.length === 0) {
        timelineContainer.innerHTML = '<p style="color: var(--color-text-muted); font-size: 0.9rem;">Henüz işlem kaydı bulunmuyor.</p>';
        return;
    }
    
    recentLogs.forEach(log => {
        const bike = state.bikes.find(b => b.id === log.bikeId);
        const bikeModel = bike ? `Bisiklet ${bike.model}` : 'Bilinmeyen Bisiklet';
        
        let statusText = '';
        if (log.status === 'Bildirildi') statusText = 'Arıza Bildirildi';
        else if (log.status === 'Onariliyor') statusText = 'Onarıma Alındı';
        else if (log.status === 'Cozuldu') statusText = 'Arıza Giderildi';
        
        let priorityClass = 'low';
        if (log.priority === 'Yuksek') priorityClass = 'high';
        else if (log.priority === 'Orta') priorityClass = 'medium';
        else if (log.priority === 'Kritik') priorityClass = 'critical';
        
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
            <div class="timeline-dot ${priorityClass}"></div>
            <div class="timeline-content">
                <span class="timeline-time">${formatRelativeTime(log.date)}</span>
                <span class="timeline-title">${log.title}</span>
                <span class="timeline-desc"><strong>${bikeModel}</strong> | ${statusText}</span>
            </div>
        `;
        timelineContainer.appendChild(item);
    });
}
function renderBikesGrid() {
    const container = document.getElementById('bikes-grid');
    container.innerHTML = '';
    
    if (state.viewMode === 'list') {
        container.classList.add('list-view');
    } else {
        container.classList.remove('list-view');
    }
    
    // Filtre butonları arasından sadece durum filtresini bulmak için [data-filter] seçildi
    const activeFilter = document.querySelector('#bisikletler-section .filter-btn[data-filter].active').dataset.filter;
    const searchQuery = document.getElementById('global-search').value.toLowerCase().trim();
    
    let filteredBikes = state.bikes.filter(bike => {
        // Durum filtresi
        if (activeFilter !== 'all' && bike.status !== activeFilter) return false;
        
        // Arama filtresi
        if (searchQuery !== '') {
            const matchModel = bike.model.toLowerCase().includes(searchQuery);
            const matchDesc = bike.desc.toLowerCase().includes(searchQuery);
            if (!matchModel && !matchDesc) return false;
        }
        return true;
    });
    
    // Bisikletleri numaralarına göre sırala (1, 2, 3...)
    filteredBikes.sort((a, b) => parseInt(a.model) - parseInt(b.model));
    
    if (filteredBikes.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                <h3>Bisiklet Bulunamadı</h3>
                <p>Arama veya filtre kriterlerinize uygun bisiklet kaydı bulunmuyor.</p>
            </div>
        `;
        return;
    }
    
    filteredBikes.forEach(bike => {
        // Bu bisiklete ait aktif arızaları getir
        const activeLogs = state.logs.filter(l => l.bikeId === bike.id && l.status !== 'Cozuldu');
        const totalLogs = state.logs.filter(l => l.bikeId === bike.id).length;
        
        const card = document.createElement('div');
        card.className = 'bike-card';
        
        if (state.viewMode === 'list') {
            // Aktif arızaları tag haline getirme
            let tagsHtml = '';
            if (activeLogs.length > 0) {
                tagsHtml = activeLogs.map(l => {
                    let priorityTagClass = '';
                    if (l.priority === 'Dusuk') priorityTagClass = 'priority-dusuk';
                    else if (l.priority === 'Orta') priorityTagClass = 'priority-orta';
                    else if (l.priority === 'Yuksek') priorityTagClass = 'priority-orta';
                    else if (l.priority === 'Kritik') priorityTagClass = 'priority-kritik';
                    
                    return `<span class="bike-tag ${priorityTagClass}" title="${l.desc}">${l.title}</span>`;
                }).join('');
            } else {
                tagsHtml = '<span class="bike-tag no-issue">Arıza Yok</span>';
            }
            
            card.innerHTML = `
                <div class="bike-card-image">
                    <svg viewBox="0 0 100 100">
                        <circle cx="30" cy="65" r="18" />
                        <circle cx="70" cy="65" r="18" />
                        <line x1="30" y1="65" x2="48" y2="42" />
                        <line x1="48" y1="42" x2="68" y2="42" />
                        <line x1="70" y1="65" x2="62" y2="35" />
                        <line x1="30" y1="65" x2="52" y2="65" />
                        <line x1="52" y1="65" x2="62" y2="35" />
                        <line x1="48" y1="42" x2="38" y2="65" />
                        <line x1="62" y1="35" x2="68" y2="35" />
                        <line x1="48" y1="42" x2="46" y2="38" />
                        <line x1="42" y1="38" x2="50" y2="38" />
                    </svg>
                </div>
                <div class="bike-card-body">
                    <div>
                        <div class="bike-title">Bisiklet ${bike.model}</div>
                    </div>
                    <div>
                        <span class="badge ${bike.status.toLowerCase() === 'kullanılabilir' ? 'aktif' : (bike.status.toLowerCase() === 'bakımda' ? 'bakimda' : 'arizali')}" style="position: static; display: inline-flex;">
                            <span class="badge-dot"></span>${bike.status}
                        </span>
                    </div>
                    <div class="bike-tags-list">
                        ${tagsHtml}
                    </div>
                    <div class="bike-card-footer">
                        <button class="btn btn-secondary btn-quick-report" data-id="${bike.id}">Arıza Bildir</button>
                        <button class="btn btn-secondary btn-edit-bike" data-id="${bike.id}">Düzenle</button>
                        ${bike.status !== 'Kullanılabilir' && activeLogs.length > 0 ? 
                            `<button class="btn btn-primary btn-quick-resolve" data-bike-id="${bike.id}">Kapat</button>` : 
                            `<button class="btn btn-danger btn-delete-bike" data-id="${bike.id}">Sil</button>`
                        }
                    </div>
                </div>
            `;
        } else {
            card.innerHTML = `
                <div class="bike-card-image">
                    <span class="badge ${bike.status.toLowerCase() === 'kullanılabilir' ? 'aktif' : (bike.status.toLowerCase() === 'bakımda' ? 'bakimda' : 'arizali')}">
                        <span class="badge-dot"></span>${bike.status}
                    </span>
                    <svg viewBox="0 0 100 100">
                        <circle cx="30" cy="65" r="18" />
                        <circle cx="70" cy="65" r="18" />
                        <line x1="30" y1="65" x2="48" y2="42" />
                        <line x1="48" y1="42" x2="68" y2="42" />
                        <line x1="70" y1="65" x2="62" y2="35" />
                        <line x1="30" y1="65" x2="52" y2="65" />
                        <line x1="52" y1="65" x2="62" y2="35" />
                        <line x1="48" y1="42" x2="38" y2="65" />
                        <line x1="62" y1="35" x2="68" y2="35" />
                        <line x1="48" y1="42" x2="46" y2="38" />
                        <line x1="42" y1="38" x2="50" y2="38" />
                    </svg>
                </div>
                <div class="bike-card-body">
                    <div class="bike-title">Bisiklet ${bike.model}</div>
                    
                    <div class="bike-meta">
                        <div class="meta-item">
                            <span class="meta-label">Arıza Kaydı</span>
                            <span class="meta-value">${totalLogs} adet (${activeLogs.length} aktif)</span>
                        </div>
                    </div>
                    
                    <div style="font-size: 0.8rem; color: var(--color-text-muted); line-height: 1.4; flex: 1;">
                        ${bike.desc || 'Açıklama girilmemiş.'}
                    </div>
                    
                    <div class="bike-card-footer">
                        <button class="btn btn-secondary btn-quick-report" data-id="${bike.id}">Arıza Bildir</button>
                        <button class="btn btn-secondary btn-edit-bike" data-id="${bike.id}">Düzenle</button>
                        ${bike.status !== 'Kullanılabilir' && activeLogs.length > 0 ? 
                            `<button class="btn btn-primary btn-quick-resolve" data-bike-id="${bike.id}">Onarımı Kapat</button>` : 
                            `<button class="btn btn-danger btn-delete-bike" data-id="${bike.id}">Kayıt Sil</button>`
                        }
                    </div>
                </div>
            `;
        }
        container.appendChild(card);
    });
}
function renderLogsList() {
    const container = document.getElementById('logs-list');
    container.innerHTML = '';
    
    const activeFilter = document.querySelector('#arizalar-section .filter-btn.active').dataset.logFilter;
    const priorityFilter = document.getElementById('log-priority-filter').value;
    const searchQuery = document.getElementById('global-search').value.toLowerCase().trim();
    
    let filteredLogs = state.logs.filter(log => {
        // Status filter
        if (activeFilter !== 'all' && log.status !== activeFilter) return false;
        
        // Priority filter
        if (priorityFilter !== 'all' && log.priority !== priorityFilter) return false;
        
        // Search query
        if (searchQuery !== '') {
            const bike = state.bikes.find(b => b.id === log.bikeId);
            const bikeModel = bike ? bike.model.toLowerCase() : '';
            const matchTitle = log.title.toLowerCase().includes(searchQuery);
            const matchDesc = log.desc.toLowerCase().includes(searchQuery);
            const matchReporter = log.reporter.toLowerCase().includes(searchQuery);
            if (!matchTitle && !matchDesc && !matchReporter && !bikeModel.includes(searchQuery)) return false;
        }
        return true;
    });
    
    // Sort log list: Bildirildi (first) -> Onariliyor -> Cozuldu, then newer first
    const statusWeight = { 'Bildirildi': 0, 'Onariliyor': 1, 'Cozuldu': 2 };
    filteredLogs.sort((a, b) => {
        if (statusWeight[a.status] !== statusWeight[b.status]) {
            return statusWeight[a.status] - statusWeight[b.status];
        }
        return new Date(b.date) - new Date(a.date);
    });
    
    if (filteredLogs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                <h3>Arıza Kaydı Bulunamadı</h3>
                <p>Aradığınız kriterlere uygun arıza veya bakım kaydı bulunmuyor.</p>
            </div>
        `;
        return;
    }
    
    filteredLogs.forEach(log => {
        const bike = state.bikes.find(b => b.id === log.bikeId);
        const bikeModel = bike ? `Bisiklet ${bike.model}` : 'Bilinmeyen Bisiklet';
        
        let actionButtons = '';
        if (log.status === 'Bildirildi') {
            actionButtons = `
                <button class="btn btn-secondary btn-log-action" data-action="repair" data-id="${log.id}">Onarıma Al</button>
                <button class="btn btn-primary btn-log-action" data-action="resolve" data-id="${log.id}">Çözümle</button>
            `;
        } else if (log.status === 'Onariliyor') {
            actionButtons = `
                <button class="btn btn-primary btn-log-action" data-action="resolve" data-id="${log.id}">Çözümle</button>
            `;
        }
        
        const item = document.createElement('div');
        item.className = 'log-item';
        item.innerHTML = `
            <div class="log-status-indicator ${log.status}" title="${log.status}"></div>
            <div class="log-details">
                <div class="log-header-row">
                    <span class="log-title">${log.title}</span>
                    <span class="log-bike-name">${bikeModel}</span>
                    <span class="log-priority-badge ${log.priority}">${log.priority === 'Dusuk' ? 'Düşük' : (log.priority === 'Orta' ? 'Orta' : (log.priority === 'Yuksek' ? 'Yüksek' : 'Kritik'))}</span>
                </div>
                ${log.desc ? `<div class="log-description">${log.desc}</div>` : ''}
                <div class="log-meta-info">
                    <span>Bildiren: <strong>${log.reporter}</strong></span>
                    <span>Tarih: <strong>${formatDate(log.date)}</strong></span>
                    ${log.status === 'Cozuldu' ? `
                        <span>Çözüm Tarihi: <strong>${formatDate(log.resolveDate)}</strong></span>
                    ` : ''}
                </div>
                ${log.status === 'Cozuldu' && log.resolveNotes ? `
                    <div style="margin-top: 0.5rem; padding: 0.5rem 0.75rem; background: rgba(16, 185, 129, 0.05); border-left: 2px solid var(--status-aktif); border-radius: 4px; font-size: 0.8rem; color: var(--color-text-muted);">
                        <strong>Çözüm Notu:</strong> ${log.resolveNotes}
                    </div>
                ` : ''}
            </div>
            <div class="log-actions">
                ${actionButtons}
            </div>
        `;
        container.appendChild(item);
    });
}

function populateBikeSelects() {
    const select = document.getElementById('log-bike-id');
    select.innerHTML = '<option value="" disabled selected>Fiziksel bisiklet seçin...</option>';
    
    // Sort active bikes first
    const sortedBikes = [...state.bikes].sort((a, b) => {
        if (a.status === b.status) return parseInt(a.model) - parseInt(b.model);
        return a.status === 'Kullanılabilir' ? -1 : 1;
    });
    
    sortedBikes.forEach(bike => {
        const option = document.createElement('option');
        option.value = bike.id;
        option.textContent = `Bisiklet ${bike.model} (Durum: ${bike.status})`;
        select.appendChild(option);
    });
}

function populateIssueTitlesSelect() {
    const select = document.getElementById('log-title');
    if (!select) return;
    
    select.innerHTML = '<option value="" disabled selected>Arıza başlığını seçin...</option>';
    
    state.issueTitles.forEach(title => {
        const option = document.createElement('option');
        option.value = title;
        option.textContent = title;
        select.appendChild(option);
    });
    
    // Yeni başlık ekleme seçeneği
    const newOption = document.createElement('option');
    newOption.value = 'NEW_TITLE';
    newOption.textContent = '+ Yeni Arıza Başlığı Ekle...';
    select.appendChild(newOption);
}

// Router Sim
function handleRoutingFromHash() {
    const hash = window.location.hash || '#dashboard';
    let targetSectionId = 'dashboard-section';
    
    if (hash === '#bisikletler') targetSectionId = 'bisikletler-section';
    else if (hash === '#arizalar') targetSectionId = 'arizalar-section';
    
    switchSection(targetSectionId);
}

function switchSection(sectionId) {
    state.currentSection = sectionId;
    
    // Update active section DOM
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active-section');
    });
    document.getElementById(sectionId).classList.add('active-section');
    
    // Update Sidebar Navigation state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.target === sectionId) {
            item.classList.add('active');
        }
    });
    
    // Reset global search bar on section change
    document.getElementById('global-search').value = '';
    
    // Re-render to apply reset searches
    renderAll();
}

// Setup Event Listeners
function setupEventListeners() {
    // Sidebar SPA clicks
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const targetSection = item.dataset.target;
            switchSection(targetSection);
            
            // Close mobile sidebar if open
            document.getElementById('sidebar').classList.remove('mobile-open');
        });
    });
    
    // Mobile menu toggle click
    document.getElementById('mobile-menu-toggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('mobile-open');
    });
    
    // Link to go to logs from Dashboard
    document.getElementById('btn-go-to-logs').addEventListener('click', () => {
        window.location.hash = '#arizalar';
        switchSection('arizalar-section');
    });
    
    // Open Add Bike Modal
    document.getElementById('btn-open-add-bike').addEventListener('click', () => {
        openModal('add-bike-modal');
    });
    
    // Open Add Maintenance Log Modal
    document.getElementById('btn-open-add-log').addEventListener('click', () => {
        openModal('add-log-modal');
    });
    
    // Watch log-title dropdown for 'NEW_TITLE' selection
    document.getElementById('log-title').addEventListener('change', (e) => {
        const newTitleGroup = document.getElementById('group-log-new-title');
        const newTitleInput = document.getElementById('log-new-title');
        
        if (e.target.value === 'NEW_TITLE') {
            newTitleGroup.style.display = 'flex';
            newTitleInput.required = true;
            newTitleInput.focus();
        } else {
            newTitleGroup.style.display = 'none';
            newTitleInput.required = false;
            newTitleInput.value = '';
        }
    });
    
    // Close Modal via close buttons
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(btn.dataset.close);
        });
    });
    
    // Close Modal by clicking overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal(overlay.id);
            }
        });
    });
    
    // Global Search Event
    document.getElementById('global-search').addEventListener('input', () => {
        if (state.currentSection === 'dashboard-section') {
            // If in dashboard, search filters the bike list (redirects to bikes list or filters)
            // Let's filter both pages in the background
            renderBikesGrid();
            renderLogsList();
        } else if (state.currentSection === 'bisikletler-section') {
            renderBikesGrid();
        } else if (state.currentSection === 'arizalar-section') {
            renderLogsList();
        }
    });
    
    // Bike Section Filter Clicks (Status Filters)
    document.querySelectorAll('#bisikletler-section .filter-btn[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#bisikletler-section .filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderBikesGrid();
        });
    });
    
    // Bike Section View Mode Toggles
    const btnViewGrid = document.getElementById('btn-view-grid');
    const btnViewList = document.getElementById('btn-view-list');
    
    if (btnViewGrid && btnViewList) {
        btnViewGrid.addEventListener('click', () => {
            btnViewGrid.classList.add('active');
            btnViewList.classList.remove('active');
            state.viewMode = 'grid';
            renderBikesGrid();
        });
        
        btnViewList.addEventListener('click', () => {
            btnViewList.classList.add('active');
            btnViewGrid.classList.remove('active');
            state.viewMode = 'list';
            renderBikesGrid();
        });
    }
    

    
    // Maintenance Log Filter Clicks
    document.querySelectorAll('#arizalar-section .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#arizalar-section .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderLogsList();
        });
    });
    
    document.getElementById('log-priority-filter').addEventListener('change', () => {
        renderLogsList();
    });
    
    // Form Submission: Add Bike
    document.getElementById('add-bike-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const modelInputVal = document.getElementById('bike-model').value.trim();
        let model = '';
        if (!modelInputVal) {
            // Auto-generate next sequential number
            const numbers = state.bikes.map(b => parseInt(b.model)).filter(n => !isNaN(n));
            const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
            model = (maxNum + 1).toString();
        } else {
            const modelNum = parseInt(modelInputVal);
            if (isNaN(modelNum) || modelNum <= 0) {
                showToast('Lütfen geçerli bir bisiklet numarası girin (1, 2, 3...)!', 'error');
                return;
            }
            model = modelNum.toString();
        }
        
        const status = document.getElementById('bike-status').value;
        const desc = document.getElementById('bike-desc').value.trim();
        
        // Validation: Unique Number Check
        const isModelExists = state.bikes.some(b => b.model === model);
        if (isModelExists) {
            showToast(`Sistemde zaten ${model} numaralı bir bisiklet kayıtlı!`, 'error');
            return;
        }
        
        const newBike = {
            id: 'b_' + Date.now(),
            model,
            status,
            desc
        };
        
        state.bikes.push(newBike);
        saveToLocalStorage();
        
        // Reset form
        document.getElementById('add-bike-form').reset();
        
        closeModal('add-bike-modal');
        showToast(`Bisiklet ${model} başarıyla kaydedildi.`, 'success');
        
        renderAll();
    });
    
    // Form Submission: Edit Bike Details
    document.getElementById('edit-bike-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const bikeId = document.getElementById('edit-bike-id').value;
        const bike = state.bikes.find(b => b.id === bikeId);
        if (!bike) return;

        const modelInputVal = document.getElementById('edit-bike-model').value.trim();
        let model = bike.model; // default to original
        if (modelInputVal) {
            const modelNum = parseInt(modelInputVal);
            if (isNaN(modelNum) || modelNum <= 0) {
                showToast('Lütfen geçerli bir bisiklet numarası girin (1, 2, 3...)!', 'error');
                return;
            }
            model = modelNum.toString();
        }
        const status = document.getElementById('edit-bike-status').value;
        const desc = document.getElementById('edit-bike-desc').value.trim();
        
        // Validation: Unique Number Check (except self)
        const isModelExists = state.bikes.some(b => b.model === model && b.id !== bikeId);
        if (isModelExists) {
            showToast(`Sistemde zaten ${model} numaralı bir bisiklet kayıtlı!`, 'error');
            return;
        }
        
        bike.model = model;
        bike.status = status;
        bike.desc = desc;
        
        saveToLocalStorage();
        closeModal('edit-bike-modal');
        showToast(`Bisiklet ${model} başarıyla güncellendi.`, 'success');
        renderAll();
    });
    
    // Form Submission: Add Maintenance Log
    document.getElementById('add-log-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const bikeId = document.getElementById('log-bike-id').value;
        const selectTitle = document.getElementById('log-title').value;
        const priority = document.getElementById('log-priority').value;
        const reporter = document.getElementById('log-reporter').value.trim();
        const desc = '';
        
        if (!bikeId) {
            showToast('Lütfen arızalı bisikleti seçin!', 'error');
            return;
        }
        
        let title = '';
        if (selectTitle === 'NEW_TITLE') {
            const newTitleInput = document.getElementById('log-new-title');
            title = newTitleInput.value.trim();
            
            if (!title) {
                showToast('Lütfen yeni arıza başlığını girin!', 'error');
                return;
            }
            
            // Eğer sistemde bu başlık zaten yoksa listeye kaydet (harf duyarsız kontrol)
            const exists = state.issueTitles.some(t => t.toLowerCase() === title.toLowerCase());
            if (!exists) {
                state.issueTitles.push(title);
            }
        } else {
            title = selectTitle;
        }
        
        const newLog = {
            id: 'l_' + Date.now(),
            bikeId,
            title,
            desc,
            priority,
            status: 'Bildirildi',
            reporter,
            date: new Date().toISOString(),
            resolveNotes: '',
            resolveCost: null,
            resolveDate: null
        };
        
        state.logs.push(newLog);
        
        // Automatically set the bike's status to "Arızalı" (unless priority is low, then maybe "Bakımda")
        const bike = state.bikes.find(b => b.id === bikeId);
        if (bike) {
            if (priority === 'Kritik' || priority === 'Yuksek') {
                bike.status = 'Arızalı';
            } else {
                bike.status = 'Bakımda';
            }
        }
        
        saveToLocalStorage();
        
        // Reset form and hide dynamic input
        document.getElementById('add-log-form').reset();
        document.getElementById('group-log-new-title').style.display = 'none';
        document.getElementById('log-new-title').required = false;
        
        closeModal('add-log-modal');
        showToast('Arıza kaydı oluşturuldu, bisiklet durumu güncellendi.', 'success');
        
        renderAll();
    });
    
    // Form Submission: Resolve Maintenance Log
    document.getElementById('resolve-log-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        let logId = document.getElementById('resolve-log-id').value;
        if (!logId) {
            logId = document.getElementById('resolve-log-select').value;
        }
        
        const resolveNotes = document.getElementById('resolve-notes').value.trim();
        
        const log = state.logs.find(l => l.id === logId);
        if (log) {
            log.status = 'Cozuldu';
            log.resolveNotes = resolveNotes;
            log.resolveDate = new Date().toISOString();
            
            // If the bike has no more unresolved logs, return it to 'Kullanılabilir'
            const hasMoreActiveLogs = state.logs.some(l => l.bikeId === log.bikeId && l.id !== logId && l.status !== 'Cozuldu');
            if (!hasMoreActiveLogs) {
                const bike = state.bikes.find(b => b.id === log.bikeId);
                if (bike) {
                    bike.status = 'Kullanılabilir';
                }
            }
            
            saveToLocalStorage();
            
            closeModal('resolve-log-modal');
            showToast('Arıza giderildi ve kayıt başarıyla kapatıldı.', 'success');
            
            // Reset form and hide dynamic group
            document.getElementById('resolve-log-form').reset();
            document.getElementById('group-resolve-log-select').style.display = 'none';
            document.getElementById('resolve-log-select').required = false;
            
            renderAll();
        }
    });
    
    // Event delegation: Bicycle Cards Action Buttons
    document.getElementById('bikes-grid').addEventListener('click', (e) => {
        // Quick Report Issue
        if (e.target.classList.contains('btn-quick-report')) {
            const bikeId = e.target.dataset.id;
            openModal('add-log-modal');
            document.getElementById('log-bike-id').value = bikeId;
        }
        
        // Quick Resolve Issue (if card has active repairing)
        if (e.target.classList.contains('btn-quick-resolve')) {
            const bikeId = e.target.dataset.bikeId;
            openResolveModal(null, bikeId);
        }
        
        // Edit Bicycle Details
        if (e.target.classList.contains('btn-edit-bike')) {
            const bikeId = e.target.dataset.id;
            openEditBikeModal(bikeId);
        }
        
        // Delete Bicycle Record
        if (e.target.classList.contains('btn-delete-bike')) {
            const bikeId = e.target.dataset.id;
            const bike = state.bikes.find(b => b.id === bikeId);
            
            if (confirm(`Bisiklet ${bike.model} kaydını silmek istediğinize emin misiniz?`)) {
                // Remove bike
                state.bikes = state.bikes.filter(b => b.id !== bikeId);
                // Clean its logs
                state.logs = state.logs.filter(l => l.bikeId !== bikeId);
                
                saveToLocalStorage();
                showToast('Bisiklet kaydı ve bağlı arıza geçmişi silindi.', 'info');
                renderAll();
            }
        }
    });
    
    // Event delegation: Maintenance Log Actions
    document.getElementById('logs-list').addEventListener('click', (e) => {
        if (!e.target.classList.contains('btn-log-action')) return;
        
        const logId = e.target.dataset.id;
        const action = e.target.dataset.action;
        const log = state.logs.find(l => l.id === logId);
        
        if (!log) return;
        
        if (action === 'repair') {
            log.status = 'Onariliyor';
            
            // Update bike status to maintenance
            const bike = state.bikes.find(b => b.id === log.bikeId);
            if (bike) {
                bike.status = 'Bakımda';
            }
            
            saveToLocalStorage();
            showToast('Arıza kaydı onarıma alındı, bisiklet durumu "Bakımda" olarak güncellendi.', 'info');
            renderAll();
        } else if (action === 'resolve') {
            openResolveModal(logId);
        }
    });
}

function openResolveModal(logId, bikeId = null) {
    const selectGroup = document.getElementById('group-resolve-log-select');
    const selectEl = document.getElementById('resolve-log-select');
    const hiddenIdEl = document.getElementById('resolve-log-id');
    const infoTextEl = document.getElementById('resolve-log-info-text');
    
    if (logId) {
        // Specific log resolution
        const log = state.logs.find(l => l.id === logId);
        if (!log) return;
        
        const bike = state.bikes.find(b => b.id === log.bikeId);
        const bikeModel = bike ? `Bisiklet ${bike.model}` : 'Bilinmeyen Bisiklet';
        
        hiddenIdEl.value = logId;
        selectGroup.style.display = 'none';
        selectEl.required = false;
        
        infoTextEl.innerHTML = `
            <strong>${bikeModel}</strong> bisikletine ait <em>"${log.title}"</em> başlıklı arıza kaydını kapatmak üzeresiniz.
            Bisiklet, bağlı başka arıza kaydı yoksa otomatik olarak <strong>"Kullanılabilir"</strong> durumuna getirilecektir.
        `;
    } else if (bikeId) {
        // Bike resolution (user can choose which log of the bike to resolve)
        const bike = state.bikes.find(b => b.id === bikeId);
        if (!bike) return;
        
        const activeLogs = state.logs.filter(l => l.bikeId === bikeId && l.status !== 'Cozuldu');
        if (activeLogs.length === 0) return;
        
        hiddenIdEl.value = ''; // We will read logId from selectEl instead
        selectGroup.style.display = 'flex';
        selectEl.required = true;
        
        // Populate active logs dropdown
        selectEl.innerHTML = '';
        activeLogs.forEach(log => {
            const opt = document.createElement('option');
            opt.value = log.id;
            opt.textContent = `${log.title} (${log.priority === 'Dusuk' ? 'Düşük' : (log.priority === 'Orta' ? 'Orta' : (log.priority === 'Yuksek' ? 'Yüksek' : 'Kritik'))})`;
            selectEl.appendChild(opt);
        });
        
        infoTextEl.innerHTML = `
            <strong>Bisiklet ${bike.model}</strong> için çözülen arıza kaydını seçip onarım notlarını girin.
        `;
    }
    
    // Clear previous input
    document.getElementById('resolve-notes').value = '';
    
    openModal('resolve-log-modal');
}

function openEditBikeModal(bikeId) {
    const bike = state.bikes.find(b => b.id === bikeId);
    if (!bike) return;
    
    document.getElementById('edit-bike-id').value = bike.id;
    document.getElementById('edit-bike-model').value = bike.model;
    document.getElementById('edit-bike-status').value = bike.status;
    document.getElementById('edit-bike-desc').value = bike.desc;
    
    openModal('edit-bike-modal');
}

// Listen for window hash changes (browser back/forward button support)
window.addEventListener('hashchange', handleRoutingFromHash);

// Start Application on Load
window.addEventListener('DOMContentLoaded', initApp);
