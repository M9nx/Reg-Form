/**
 * Team Registration App with Supabase
 */

// ============================================
// SUPABASE CONFIG
// ============================================
const SUPABASE_URL = 'https://flqtbpynxiwpcydszxov.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZscXRicHlueGl3cGN5ZHN6eG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDI2MzAsImV4cCI6MjA4NjkxODYzMH0.hz4OE0Np2i8k1p1LR25TXRvbvrUuNtjxnLOh5MfcsBw';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const STORAGE_KEY = 'team_submission_v1';

// ============================================
// STATE
// ============================================
const MEMBER_MIN_WORDS_MESSAGE = 'Please enter full name (at least 3 names)';

let state = {
    isLoading: false,
    members: [],
    maxMembers: 6,
    minMembers: 5
};

// ============================================
// DOM
// ============================================
const $ = id => document.getElementById(id);

let dom = {};

// ============================================
// SECURITY & VALIDATION
// ============================================
const MEMBER_NAME_REGEX = /^[A-Za-z\s]+$/;

function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input
        .trim()
        .replace(/[<>\"'`\\]/g, '')
        .replace(/[\x00-\x1F\x7F]/g, '')
        .substring(0, 100);
}

function sanitizeName(input) {
    if (typeof input !== 'string') return '';
    return input
        .trim()
        .replace(/[^A-Za-z ]/g, '')
        .replace(/\s+/g, ' ')
        .substring(0, 50);
}


function normalizeMemberName(name) {
    return sanitizeName(name).toLowerCase();
}

function validateMemberName(name) {
    const sanitized = sanitizeName(name);
    const words = sanitized.split(' ').filter(w => w.length > 0);

    if (words.length < 3) {
        return { valid: false, error: MEMBER_MIN_WORDS_MESSAGE };
    }
    if (!MEMBER_NAME_REGEX.test(sanitized)) {
        return { valid: false, error: 'Use letters and spaces only' };
    }
    return { valid: true, sanitized };
}


function isDuplicateMember(list, candidate) {
    const key = normalizeMemberName(candidate);
    return list.some(m => normalizeMemberName(m) === key);
}

function validateMembersArray(members, fieldKey) {
    const seen = new Set();

    for (const member of members) {
        const validation = validateMemberName(member);
        if (!validation.valid) {
            handleValidationError(validation, fieldKey);
            return false;
        }

        const key = normalizeMemberName(member);
        if (seen.has(key)) {
            showFieldError(fieldKey, 'Duplicate member names are not allowed');
            return false;
        }
        seen.add(key);
    }

    return true;
}

function validateForm() {
    let isValid = true;
    clearErrors();

    const teamName = sanitizeInput(dom.teamName.value);
    dom.teamName.value = teamName;

    if (!teamName) {
        showFieldError('team-name', 'Project name is required');
        isValid = false;
    }


    if (state.members.length < state.minMembers) {
        showFieldError('member', `Add at least ${state.minMembers} member`);
        isValid = false;
    }
    if (state.members.length > state.maxMembers) {
        showFieldError('member', `Maximum ${state.maxMembers} members allowed`);
        isValid = false;
    }

    if (!validateMembersArray(state.members, 'member')) {
        isValid = false;
    }

    return isValid;
}

function showFieldError(field, message) {
    const errorEl = dom[field + 'Error'] || $(field + '-error');
    const inputEl = dom[field] || dom[field + 'Input'] || $(field) || $(field + '-input');
    if (errorEl) errorEl.textContent = message;
    if (inputEl) inputEl.classList.add('error');
}

function clearFieldError(field) {
    const errorEl = dom[field + 'Error'] || $(field + '-error');
    const inputEl = dom[field] || dom[field + 'Input'] || $(field) || $(field + '-input');
    if (errorEl) errorEl.textContent = '';
    if (inputEl) inputEl.classList.remove('error');
}

function clearErrors() {
    clearFieldError('team-name');
    clearFieldError('member');
}

function handleValidationError(validation, fieldKey) {
    showFieldError(fieldKey, validation.error);
    if (validation.error === MEMBER_MIN_WORDS_MESSAGE) {
        showToast(validation.error, 'error');
    }
}

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

function setLoading(loading) {
    state.isLoading = loading;
    setButtonLoading(dom.submitBtn, loading);
}

function addMember() {
    const input = dom.memberInput.value.trim();
    if (!input) return;

    const validation = validateMemberName(input);
    if (!validation.valid) {
        handleValidationError(validation, 'member');
        return;
    }

    const sanitized = validation.sanitized;
    if (isDuplicateMember(state.members, sanitized)) {
        showFieldError('member', 'This member is already added');
        return;
    }

    if (state.members.length >= state.maxMembers) {
        showFieldError('member', `Maximum ${state.maxMembers} members allowed`);
        return;
    }

    state.members.push(sanitized);
    dom.memberInput.value = '';
    clearFieldError('member');
    renderMembersList();
}

function removeMember(index) {
    state.members.splice(index, 1);
    renderMembersList();
}

function renderMembersList() {
    dom.membersList.innerHTML = state.members
        .map((member, i) => `
            <div class="member-item">
                <span>${escapeHtml(member)}</span>
                <button type="button" class="btn-remove" data-member-index="${i}" aria-label="Remove member ${i + 1}">
                    ✕
                </button>
            </div>
        `)
        .join('');
}

function handleMembersListClick(event) {
    const removeButton = event.target.closest('.btn-remove[data-member-index]');
    if (!removeButton || !dom.membersList.contains(removeButton)) return;

    const index = Number(removeButton.dataset.memberIndex);
    if (!Number.isInteger(index) || index < 0 || index >= state.members.length) return;

    removeMember(index);
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

function showTeamSuccess(details) {
    const members = Array.isArray(details.members) ? details.members : [];
    const actionLabel = details.action === 'updated' ? 'Updated' : 'Submitted';
    const timeLabel = details.action === 'updated' ? 'Updated at' : 'Submitted at';
    const timeValue = formatTimestamp(details.timestamp);
    const editLink = `edit.html?token=${encodeURIComponent(details.token || '')}`;

    dom.stepForm.classList.add('hidden');
    dom.stepSuccess.classList.remove('hidden');

    dom.teamDetails.innerHTML = `
        <div class="detail-note">${escapeHtml(actionLabel)} successfully. You can edit this submission anytime using the token on the Edit page.</div>
        <div class="detail-row">
            <span class="detail-label">Project Name</span>
            <span class="detail-value">${escapeHtml(details.teamName)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Team Token</span>
            <span class="detail-value token-display" id="team-token">${escapeHtml(details.token)}</span>
            <button type="button" id="copy-token-btn" class="btn-copy" title="Copy token">📋</button>
        </div>
        <div class="detail-row">
            <span class="detail-label">Members (${members.length})</span>
            <span class="detail-value">${members.map(m => escapeHtml(m)).join(', ')}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">${escapeHtml(timeLabel)}</span>
            <span class="detail-value">${escapeHtml(timeValue)}</span>
        </div>
        <div class="button-row success-actions">
            <a class="btn-secondary" href="${editLink}">Edit this submission</a>
        </div>
    `;

    document.getElementById('copy-token-btn')?.addEventListener('click', () => {
        navigator.clipboard.writeText(details.token);
        showToast('Token copied!', 'success');
    });
}

function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };
    return text.replace(/[&<>"'`=/]/g, char => htmlEscapes[char]);
}

// ============================================
// ERROR HANDLING
// ============================================
function getTeamErrorMessage(error) {
    const msg = (error?.message || '').toLowerCase();
    const code = String(error?.code || '');

    if (msg.includes('team_name_exists')) {
        return 'Project name already exists. Please choose another.';
    }
    if (msg.includes('member_name_exists')) {
        return 'One or more member names are already taken.';
    }
    if (msg.includes('duplicate member names')) {
        return 'Duplicate member names are not allowed.';
    }
    if (msg.includes('member count')) {
        return 'Teams must have between 5 and 6 members.';
    }
    if (msg.includes('row-level security') || msg.includes('violates row-level security policy')) {
        return 'Submission is temporarily unavailable. Please try again in a moment.';
    }

    if (code === '23505' || msg.includes('unique') || msg.includes('duplicate')) {
        if (msg.includes('team_name')) return 'Project name already exists. Please choose another.';
        if (msg.includes('member_name')) return 'One or more member names are already taken.';
        return 'Duplicate values detected. Please review your inputs.';
    }

    return error?.message || 'Something went wrong. Please try again.';
}

function formatTimestamp(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
}

function saveSubmission(details) {
    if (!details || !details.token) return;
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(details));
    } catch (error) {
        console.warn('Failed to save submission session:', error);
    }
}

function loadSavedSubmission() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        if (!parsed.token || !parsed.teamName || !Array.isArray(parsed.members)) return null;
        return parsed;
    } catch (error) {
        console.warn('Failed to load submission session:', error);
        try {
            sessionStorage.removeItem(STORAGE_KEY);
        } catch (removeError) {
            console.warn('Failed to clear submission session:', removeError);
        }
        return null;
    }
}


// ============================================
// API CALLS
// ============================================
async function createTeam() {
    if (!validateForm()) return;

    setLoading(true);

    try {
        const teamName = dom.teamName.value.trim();
        const members = [...state.members];

        const { data, error } = await supabaseClient
            .rpc('create_team_with_members', {
                p_team_name: teamName,
                p_members: members
            });

        if (error) throw error;

        const details = {
            teamName,
            members,
            token: data.token,
            timestamp: new Date().toISOString(),
            action: 'created'
        };

        saveSubmission(details);
        showTeamSuccess(details);
        showToast('Team created successfully!', 'success');

    } catch (error) {
        console.error('Create team error:', error);
        showToast(getTeamErrorMessage(error), 'error');
    } finally {
        setLoading(false);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
function initEventListeners() {
    dom.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (state.isLoading) return;
        await createTeam();
    });

    dom.addMemberBtn.addEventListener('click', addMember);
    dom.membersList.addEventListener('click', handleMembersListClick);
    dom.memberInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addMember();
        }
    });

    dom.teamName.addEventListener('input', () => clearFieldError('team-name'));
    dom.memberInput.addEventListener('input', () => clearFieldError('member'));
}

// ============================================
// INIT
// ============================================
function init() {
    dom = {
        stepForm: $('step-form'),
        stepSuccess: $('step-success'),
        form: $('registration-form'),
        teamName: $('team-name'),
        memberInput: $('member-input'),
        addMemberBtn: $('add-member-btn'),
        membersList: $('members-list'),
        submitBtn: $('submit-btn'),
        teamDetails: $('team-details'),
        toast: $('toast')
    };

    initEventListeners();

    const saved = loadSavedSubmission();
    if (saved) {
        showTeamSuccess(saved);
        return;
    }

    dom.teamName?.focus();
}

// Start
document.addEventListener('DOMContentLoaded', init);
