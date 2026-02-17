/**
 * Registration App with Supabase Auth + OTP
 */

// ============================================
// SUPABASE CONFIG
// ============================================
const SUPABASE_URL = 'https://flqtbpynxiwpcydszxov.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZscXRicHlueGl3cGN5ZHN6eG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDI2MzAsImV4cCI6MjA4NjkxODYzMH0.hz4OE0Np2i8k1p1LR25TXRvbvrUuNtjxnLOh5MfcsBw';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// STATE
// ============================================
let state = {
    otpSent: false,
    isLoading: false,
    countdownTimer: null,
    secondsLeft: 0
};

// ============================================
// DOM
// ============================================
const $ = id => document.getElementById(id);

let dom = {};

// ============================================
// SECURITY & VALIDATION
// ============================================

// Strict patterns - only allow safe characters
const FULL_NAME_REGEX = /^[A-Za-z ]{3,50}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const OTP_REGEX = /^\d{8}$/;

// Sanitize input - remove any potentially dangerous characters
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input
        .trim()
        .replace(/[<>\"'`\\]/g, '') // Remove XSS characters
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .substring(0, 100); // Limit length
}

// Sanitize name specifically - only letters and spaces
function sanitizeName(input) {
    if (typeof input !== 'string') return '';
    return input
        .trim()
        .replace(/[^A-Za-z ]/g, '') // Only allow letters and spaces
        .replace(/\s+/g, ' ') // Normalize spaces
        .substring(0, 50);
}

// Sanitize email
function sanitizeEmail(input) {
    if (typeof input !== 'string') return '';
    return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9.@_%+-]/g, '') // Only valid email chars
        .substring(0, 100);
}

// Sanitize OTP - only digits
function sanitizeOtp(input) {
    if (typeof input !== 'string') return '';
    return input.replace(/\D/g, '').substring(0, 8);
}

function validateForm() {
    let isValid = true;
    clearErrors();
    
    // Sanitize inputs first
    const name = sanitizeName(dom.fullName.value);
    const email = sanitizeEmail(dom.email.value);
    
    // Update fields with sanitized values
    dom.fullName.value = name;
    dom.email.value = email;
    
    if (!name) {
        showFieldError('name', 'Full name is required');
        isValid = false;
    } else if (!FULL_NAME_REGEX.test(name)) {
        showFieldError('name', 'Use English letters only, 3-50 characters');
        isValid = false;
    }
    
    if (!email) {
        showFieldError('email', 'Email is required');
        isValid = false;
    } else if (!EMAIL_REGEX.test(email)) {
        showFieldError('email', 'Enter a valid email address');
        isValid = false;
    }
    
    if (state.otpSent) {
        const otp = sanitizeOtp(dom.otp.value);
        dom.otp.value = otp; // Update with sanitized value
        if (!otp) {
            showFieldError('otp', 'Enter the verification code');
            isValid = false;
        } else if (!OTP_REGEX.test(otp)) {
            showFieldError('otp', 'Code must be 8 digits');
            isValid = false;
        }
    }
    
    return isValid;
}

function showFieldError(field, message) {
    const errorEl = dom[field + 'Error'];
    const inputEl = dom[field];
    if (errorEl) errorEl.textContent = message;
    if (inputEl) inputEl.classList.add('error');
}

function clearErrors() {
    dom.nameError.textContent = '';
    dom.emailError.textContent = '';
    dom.otpError.textContent = '';
    dom.fullName.classList.remove('error');
    dom.email.classList.remove('error');
    dom.otp.classList.remove('error');
}

// ============================================
// UI HELPERS
// ============================================
function setLoading(loading) {
    state.isLoading = loading;
    dom.submitBtn.disabled = loading;
    
    if (loading) {
        dom.btnText.classList.add('hidden');
        dom.btnSpinner.classList.remove('hidden');
    } else {
        dom.btnText.classList.remove('hidden');
        dom.btnSpinner.classList.add('hidden');
    }
}

function showOtpField() {
    state.otpSent = true;
    dom.otpSection.classList.remove('hidden');
    dom.resendSection.classList.remove('hidden');
    dom.timerBadge.classList.remove('hidden');
    
    // Lock fields
    dom.fullName.classList.add('locked');
    dom.fullName.readOnly = true;
    dom.email.classList.add('locked');
    dom.email.readOnly = true;
    
    // Update button text
    dom.btnText.textContent = 'Verify & Register';
    
    // Focus OTP
    dom.otp.focus();
    
    // Start countdown
    startCountdown();
}

function startCountdown() {
    state.secondsLeft = 60;
    dom.countdown.textContent = state.secondsLeft;
    dom.timerBadge.classList.remove('expired');
    dom.resendBtn.disabled = true;
    
    if (state.countdownTimer) {
        clearInterval(state.countdownTimer);
    }
    
    state.countdownTimer = setInterval(() => {
        state.secondsLeft--;
        dom.countdown.textContent = state.secondsLeft;
        
        if (state.secondsLeft <= 0) {
            clearInterval(state.countdownTimer);
            state.countdownTimer = null;
            dom.timerBadge.classList.add('expired');
            dom.resendBtn.disabled = false;
        }
    }, 1000);
}

function showToast(message, type = 'info') {
    if (!dom.toast) {
        console.error('Toast element not found');
        alert(message);
        return;
    }
    
    dom.toast.textContent = message || 'Something happened';
    dom.toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        dom.toast.classList.remove('show');
    }, 4000);
}

function showSuccess(data) {
    dom.stepForm.classList.add('hidden');
    dom.stepSuccess.classList.remove('hidden');
    
    dom.registrationDetails.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">Course</span>
            <span class="detail-value">CCNA Certification</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Student Name</span>
            <span class="detail-value">${escapeHtml(data.full_name)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Email</span>
            <span class="detail-value">${escapeHtml(data.email)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Enrolled</span>
            <span class="detail-value">${new Date(data.created_at).toLocaleDateString()}</span>
        </div>
    `;
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
function getErrorMessage(error) {
    const msg = error.message || '';
    const code = error.code || '';
    
    if (code === '23505' || msg.includes('duplicate') || msg.includes('unique')) {
        if (msg.includes('email')) return 'This email is already enrolled in the CCNA course.';
        if (msg.includes('full_name')) return 'This name is already registered for the course.';
        return 'You are already enrolled in the CCNA course.';
    }
    
    if (msg.includes('Invalid login credentials') || msg.includes('Token has expired')) {
        return 'Invalid or expired code. Please try again.';
    }
    if (msg.includes('Email rate limit')) {
        return 'Too many attempts. Wait a few minutes.';
    }
    
    return msg || 'Something went wrong. Please try again.';
}

// ============================================
// API CALLS
// ============================================
async function sendOtp() {
    console.log('sendOtp called');
    
    if (!validateForm()) {
        console.log('Validation failed');
        return;
    }
    
    setLoading(true);
    
    try {
        const email = sanitizeEmail(dom.email.value);
        const name = sanitizeName(dom.fullName.value);
        
        console.log('Checking if already registered...');
        
        // Normalize values
        dom.email.value = email;
        dom.fullName.value = name;
        
        // Check if email already registered
        const { data: existingEmail } = await supabaseClient
            .from('registrations')
            .select('email')
            .eq('email', email)
            .maybeSingle();
        
        if (existingEmail) {
            showToast('This email is already enrolled in the CCNA course!', 'error');
            showFieldError('email', 'This email is already registered');
            setLoading(false);
            return;
        }
        
        // Check if name already registered
        const { data: existingName } = await supabaseClient
            .from('registrations')
            .select('full_name')
            .ilike('full_name', name)
            .maybeSingle();
        
        if (existingName) {
            showToast('This name is already registered for the course!', 'error');
            showFieldError('name', 'This name is already registered');
            setLoading(false);
            return;
        }
        
        console.log('Sending OTP to:', email);
        
        const { data, error } = await supabaseClient.auth.signInWithOtp({
            email: email,
            options: { 
                shouldCreateUser: true,
                data: { full_name: name }
            }
        });
        
        console.log('OTP response:', { data, error });
        
        if (error) throw error;
        
        showOtpField();
        showToast('Verification code sent to your email!', 'success');
        
    } catch (error) {
        console.error('Send OTP error:', error);
        showToast(getErrorMessage(error), 'error');
    } finally {
        setLoading(false);
    }
}

async function resendOtp() {
    dom.resendBtn.disabled = true;
    
    try {
        const email = dom.email.value.trim().toLowerCase();
        
        const { error } = await supabaseClient.auth.signInWithOtp({
            email: email,
            options: { shouldCreateUser: true }
        });
        
        if (error) throw error;
        
        dom.otp.value = '';
        startCountdown();
        showToast('New code sent!', 'success');
        dom.otp.focus();
        
    } catch (error) {
        console.error('Resend error:', error);
        showToast(getErrorMessage(error), 'error');
        dom.resendBtn.disabled = false;
    }
}

async function verifyAndRegister() {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
        const email = dom.email.value.trim().toLowerCase();
        const name = dom.fullName.value.trim().replace(/\s+/g, ' ');
        const token = dom.otp.value.trim();
        
        // Verify OTP
        const { data: authData, error: authError } = await supabaseClient.auth.verifyOtp({
            email: email,
            token: token,
            type: 'email'
        });
        
        if (authError) throw authError;
        
        if (!authData.session) {
            throw new Error('Verification failed. Please try again.');
        }
        
        // Check existing registration
        const { data: existing } = await supabaseClient
            .from('registrations')
            .select('*')
            .eq('email', email)
            .maybeSingle();
        
        if (existing) {
            showSuccess(existing);
            showToast('You are already enrolled in the CCNA course!', 'success');
            return;
        }
        
        // Create registration
        const { data: regData, error: regError } = await supabaseClient
            .from('registrations')
            .insert({ full_name: name, email: email })
            .select()
            .single();
        
        if (regError) throw regError;
        
        showSuccess(regData);
        showToast('CCNA course registration successful!', 'success');
        
    } catch (error) {
        console.error('Verify error:', error);
        showToast(getErrorMessage(error), 'error');
    } finally {
        setLoading(false);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
function initEventListeners() {
    // Form submit
    dom.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (state.isLoading) return;
        
        if (state.otpSent) {
            await verifyAndRegister();
        } else {
            await sendOtp();
        }
    });
    
    // Resend button
    dom.resendBtn.addEventListener('click', resendOtp);
    
    // OTP input - auto verify on 8 digits
    dom.otp.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
        
        if (e.target.value.length === 8 && !state.isLoading) {
            verifyAndRegister();
        }
    });
    
    // Clear error on input
    dom.fullName.addEventListener('input', () => {
        dom.fullName.classList.remove('error');
        dom.nameError.textContent = '';
    });
    
    dom.email.addEventListener('input', () => {
        dom.email.classList.remove('error');
        dom.emailError.textContent = '';
    });
    
    dom.otp.addEventListener('input', () => {
        dom.otp.classList.remove('error');
        dom.otpError.textContent = '';
    });
}

// ============================================
// INIT
// ============================================
async function init() {
    console.log('Initializing app...');
    
    // Initialize DOM elements
    dom = {
        stepForm: $('step-form'),
        stepSuccess: $('step-success'),
        form: $('registration-form'),
        fullName: $('full-name'),
        email: $('email'),
        otp: $('otp'),
        otpSection: $('otp-section'),
        submitBtn: $('submit-btn'),
        resendSection: $('resend-section'),
        resendBtn: $('resend-btn'),
        timerBadge: $('timer-badge'),
        countdown: $('countdown'),
        nameError: $('name-error'),
        emailError: $('email-error'),
        otpError: $('otp-error'),
        registrationDetails: $('registration-details'),
        toast: $('toast')
    };
    
    // Debug: Check all DOM elements
    for (const [key, el] of Object.entries(dom)) {
        if (!el) console.error(`DOM element missing: ${key}`);
    }
    
    // Get button elements
    dom.btnText = dom.submitBtn?.querySelector('.btn-text');
    dom.btnSpinner = dom.submitBtn?.querySelector('.btn-spinner');
    
    if (!dom.btnText) console.error('Button text element missing');
    if (!dom.btnSpinner) console.error('Button spinner element missing');
    
    console.log('DOM initialized:', dom);
    
    initEventListeners();
    
    // Check existing session
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (session) {
            const { data: reg } = await supabaseClient
                .from('registrations')
                .select('*')
                .eq('email', session.user.email)
                .maybeSingle();
            
            if (reg) {
                showSuccess(reg);
                showToast('Welcome back!', 'success');
            }
        }
    } catch (err) {
        console.error('Session check error:', err);
    }
    
    dom.fullName?.focus();
    console.log('App ready');
}

// Start
document.addEventListener('DOMContentLoaded', init);
