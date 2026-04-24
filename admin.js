/**
 * Admin Dashboard for Team Submissions
 */

// ============================================
// SUPABASE CONFIG
// ============================================
const SUPABASE_URL = 'https://flqtbpynxiwpcydszxov.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZscXRicHlueGl3cGN5ZHN6eG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDI2MzAsImV4cCI6MjA4NjkxODYzMH0.hz4OE0Np2i8k1p1LR25TXRvbvrUuNtjxnLOh5MfcsBw';

const ROUTES = Object.freeze({
    registration: 'index.html',
    edit: 'edit.html',
    admin: 'admin.html'
});

// ============================================
// DOM
// ============================================
const $ = id => document.getElementById(id);

const dom = {
    authSection: $('auth-section'),
    dashboardSection: $('dashboard-section'),
    adminPasswordInput: $('admin-password'),
    serviceKeyInput: $('service-key'),
    connectBtn: $('connect-btn'),
    refreshBtn: $('refresh-btn'),
    exportBtn: $('export-btn'),
    disconnectBtn: $('disconnect-btn'),
    totalTeams: $('total-teams'),
    totalMembers: $('total-members'),
    teamsTable: $('teams-table'),
    toast: $('toast')
};

let adminClient = null;
const publicClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let state = {
    teams: [],
    isLoading: false
};

// ============================================
// UI HELPERS
// ============================================
function setButtonLoading(button, loading) {
    if (!button) return;
    const textEl = button.querySelector('.btn-text');
    const spinnerEl = button.querySelector('.btn-spinner');

    button.disabled = loading;

    if (loading) {
        textEl?.classList.add('hidden');
        spinnerEl?.classList.remove('hidden');
    } else {
        textEl?.classList.remove('hidden');
        spinnerEl?.classList.add('hidden');
    }
}

function showToast(message, type = 'info') {
    if (!dom.toast) {
        alert(message);
        return;
    }

    dom.toast.textContent = message || 'Something happened';
    dom.toast.className = `toast ${type} show`;

    setTimeout(() => {
        dom.toast.classList.remove('show');
    }, 4000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function parseJwtPayload(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    try {
        const payload = parts[1]
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        const pad = payload.length % 4;
        const normalized = pad ? payload + '='.repeat(4 - pad) : payload;
        return JSON.parse(atob(normalized));
    } catch {
        return null;
    }
}

function getApiKeyRole(token) {
    const payload = parseJwtPayload(token);
    return String(payload?.role || '').toLowerCase();
}

async function sha256Hex(value) {
    const encoded = new TextEncoder().encode(value);
    const digest = await window.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

async function isValidAdminPassword(value) {
    if (!value) return false;
    const passwordHash = await sha256Hex(value);

    const { data, error } = await publicClient.rpc('verify_admin_password_hash', {
        p_password_hash: passwordHash
    });

    if (error) {
        const msg = String(error?.message || '');
        if (msg.includes('Could not find the function')) {
            const legacy = await publicClient.rpc('verify_admin_password', {
                p_password: value
            });
            if (legacy.error) throw legacy.error;
            return Boolean(legacy.data);
        }
        throw error;
    }

    return Boolean(data);
}

function applyNamedRoutes() {
    document.querySelectorAll('[data-route-name]').forEach((el) => {
        const routeName = el.dataset.routeName;
        const target = ROUTES[routeName];
        if (!target) return;
        if (el.tagName === 'A') {
            el.setAttribute('href', target);
        }
    });
}

function updateStats() {
    const totalTeams = state.teams.length;
    const totalMembers = state.teams.reduce((sum, team) => {
        const members = team.team_members || [];
        return sum + members.length;
    }, 0);

    if (dom.totalTeams) dom.totalTeams.textContent = totalTeams;
    if (dom.totalMembers) dom.totalMembers.textContent = totalMembers;
}

function renderTable() {
    if (!dom.teamsTable) return;

    dom.teamsTable.innerHTML = state.teams.map((team, index) => {
        const members = (team.team_members || [])
            .map(m => m.member_name)
            .join(', ');

        return `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(team.team_name)}</td>
                <td>${escapeHtml(members || '-')}</td>
            </tr>
        `;
    }).join('');
}

// ============================================
// API CALLS
// ============================================
async function connect() {
    const adminPassword = (dom.adminPasswordInput?.value || '').trim();
    if (!adminPassword) {
        showToast('Please enter the admin password', 'error');
        return;
    }

    const serviceKey = dom.serviceKeyInput.value.trim();
    if (!serviceKey) {
        showToast('Please enter the service role key', 'error');
        return;
    }

    const keyRole = getApiKeyRole(serviceKey);
    if (keyRole !== 'service_role') {
        showToast('Please use the Supabase service_role key (not anon key)', 'error');
        return;
    }

    setButtonLoading(dom.connectBtn, true);

    try {
        const passwordOk = await isValidAdminPassword(adminPassword);
        if (!passwordOk) {
            if (dom.adminPasswordInput) {
                dom.adminPasswordInput.value = '';
                dom.adminPasswordInput.focus();
            }
            showToast('Invalid admin password', 'error');
            return;
        }

        adminClient = window.supabase.createClient(SUPABASE_URL, serviceKey);

        const { error } = await adminClient
            .from('teams')
            .select('id')
            .limit(1);

        if (error) throw error;

        dom.authSection.classList.add('hidden');
        dom.dashboardSection.classList.remove('hidden');
        await loadData();
        showToast('Connected successfully', 'success');
    } catch (error) {
        console.error('Connect error:', error);
        const message = String(error?.message || 'Unknown error');
        if (message.includes('Could not find the function')) {
            showToast('Connection failed: run supabase db push, then refresh page', 'error');
            return;
        }
        showToast('Connection failed: ' + message, 'error');
    } finally {
        setButtonLoading(dom.connectBtn, false);
    }
}

async function loadData() {
    if (!adminClient) return;

    try {
        const { data, error } = await adminClient
            .from('teams')
            .select('team_name, created_at, team_members(member_name)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        state.teams = data || [];
        updateStats();
        renderTable();
    } catch (error) {
        console.error('Load error:', error);
        showToast('Failed to load teams: ' + (error?.message || 'Unknown error'), 'error');
    }
}

function toCsvValue(value) {
    const safeValue = String(value || '').replace(/"/g, '""');
    return `"${safeValue}"`;
}

async function exportCSV() {
    if (!adminClient) return;

    try {
        if (!state.teams.length) {
            await loadData();
        }

        const headers = ['Project Name', 'Members'];
        const rows = state.teams.map(team => {
            const members = (team.team_members || [])
                .map(m => m.member_name)
                .join(', ');
            return [toCsvValue(team.team_name), toCsvValue(members)];
        });

        const csv = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `teams_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        showToast('Export ready', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Export failed: ' + (error?.message || 'Unknown error'), 'error');
    }
}

function disconnect() {
    adminClient = null;
    state.teams = [];
    if (dom.adminPasswordInput) dom.adminPasswordInput.value = '';
    dom.serviceKeyInput.value = '';
    dom.dashboardSection.classList.add('hidden');
    dom.authSection.classList.remove('hidden');
}

// ============================================
// EVENT LISTENERS
// ============================================
function init() {
    applyNamedRoutes();
    dom.connectBtn.addEventListener('click', connect);
    dom.refreshBtn.addEventListener('click', loadData);
    dom.exportBtn.addEventListener('click', exportCSV);
    dom.disconnectBtn.addEventListener('click', disconnect);
    dom.adminPasswordInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') connect();
    });
    dom.serviceKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') connect();
    });
}

init();
