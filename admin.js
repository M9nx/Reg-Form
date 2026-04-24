/**
 * Admin Dashboard for Team Submissions
 */

// ============================================
// SUPABASE CONFIG
// ============================================
const SUPABASE_URL = 'https://flqtbpynxiwpcydszxov.supabase.co';

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

async function sha256Hex(value) {
    const encoded = new TextEncoder().encode(value);
    const digest = await window.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

async function isValidAdminPassword(client, value) {
    if (!value || !client) return false;

    const { data, error } = await client
        .from('passwords')
        .select('password_hash')
        .eq('id', 1)
        .single();

    if (error) {
        throw error;
    }

    const expectedHash = String(data?.password_hash || '').trim().toLowerCase();
    if (!expectedHash) return false;

    const providedHash = (await sha256Hex(value)).toLowerCase();
    return providedHash === expectedHash;
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

    setButtonLoading(dom.connectBtn, true);

    try {
        adminClient = window.supabase.createClient(SUPABASE_URL, serviceKey);

        const passwordOk = await isValidAdminPassword(adminClient, adminPassword);
        if (!passwordOk) {
            adminClient = null;
            if (dom.adminPasswordInput) {
                dom.adminPasswordInput.value = '';
                dom.adminPasswordInput.focus();
            }
            showToast('Invalid admin password', 'error');
            return;
        }

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
        showToast('Connection failed: ' + (error?.message || 'Unknown error'), 'error');
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
