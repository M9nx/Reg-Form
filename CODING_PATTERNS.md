# Registration Form - Coding Patterns & Architecture

## Project Overview
- **Type**: Full-stack web application (Vanilla JS + Supabase backend)
- **Tech Stack**: HTML5, CSS3, JavaScript (ES6+), Supabase (PostgreSQL + Auth)
- **Size**: ~574 lines JS, ~350 lines CSS, ~127 lines HTML
- **Purpose**: CCNA Course Registration with OTP email verification

---

## Architecture Overview

```
Registration Form (Frontend)
    └── Supabase Client SDK
        ├── Authentication (OTP via Email)
        └── Database (PostgreSQL)
            └── registrations table
```

### Key Features
- Email OTP verification
- Form validation & sanitization
- Multi-step form (Email → OTP → Confirmation)
- Admin CSV export
- Mobile responsive
- Dark theme UI with gradient effects

---

## JavaScript Patterns

### 1. **Module Structure**
The app is divided into logical sections with clear comments:
```javascript
// ============================================
// SUPABASE CONFIG
// ============================================
const SUPABASE_URL = '...';
const SUPABASE_ANON_KEY = '...';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// STATE MANAGEMENT
// ============================================
let state = {
    otpSent: false,
    isLoading: false,
    countdownTimer: null,
    secondsLeft: 0
};

// ============================================
// DOM HELPERS
// ============================================
const $ = id => document.getElementById(id);
```

**Pattern**: Clear separation using comment headers. Single global state object.

### 2. **Input Sanitization**
Strict sanitization functions for security (prevent XSS):
```javascript
function sanitizeInput(input) {
    // Remove XSS characters, control chars, limit length
    return input
        .trim()
        .replace(/[<>\"'`\\]/g, '')
        .replace(/[\x00-\x1F\x7F]/g, '')
        .substring(0, 100);
}

function sanitizeName(input) {
    // Only letters and spaces
    return input.trim().replace(/[^A-Za-z ]/g, '').replace(/\s+/g, ' ');
}
```

**Pattern**: Type-specific sanitization functions. Input whitelisting (allow specific chars) rather than blacklisting.

### 3. **Validation Pattern**
```javascript
function validateForm() {
    let isValid = true;
    clearErrors();
    
    // Sanitize first
    const name = sanitizeName(dom.fullName.value);
    const email = sanitizeEmail(dom.email.value);
    
    // Update with sanitized values
    dom.fullName.value = name;
    dom.email.value = email;
    
    // Validate against regex patterns
    if (!name) {
        showFieldError('name', 'Full name is required');
        isValid = false;
    } else if (!FULL_NAME_REGEX.test(name)) {
        showFieldError('name', 'Use English letters only, 3-50 characters');
        isValid = false;
    }
    
    return isValid;
}
```

**Pattern**: 
1. Sanitize input
2. Update DOM with sanitized values
3. Test against regex patterns
4. Show errors, return validity flag

### 4. **State Management Pattern**
```javascript
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
```

**Pattern**: Single state mutation function. UI updates follow state changes.

### 5. **Async Operations Pattern**
Uses async/await for Supabase calls with error handling:
```javascript
async function signUp() {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
        const { data, error } = await supabaseClient.auth.signInWithOtp({
            email: dom.email.value
        });
        
        if (error) {
            showFieldError('email', error.message);
        } else {
            showOtpField();
            showToast('Verification code sent to your email');
        }
    } catch (err) {
        showToast('An error occurred: ' + err.message, 'error');
    } finally {
        setLoading(false);
    }
}
```

**Pattern**: Try-catch-finally. Error handling via `.error` property. User-facing toast messages.

### 6. **Event Delegation**
```javascript
document.getElementById('registration-form').addEventListener('submit', handleFormSubmit);
document.getElementById('resend-btn').addEventListener('click', handleResendClick);
```

**Pattern**: Attach listeners to form/container elements rather than individual inputs.

### 7. **Regex Patterns for Validation**
```javascript
const FULL_NAME_REGEX = /^[A-Za-z ]{3,50}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const OTP_REGEX = /^\d{8}$/;
```

**Pattern**: Constants at top. Strict, specific patterns (no overly permissive matching).

---

## CSS Patterns

### 1. **Design Token System (CSS Variables)**
```css
:root {
    /* Dark Theme Colors */
    --bg-primary: #0a0a0f;
    --bg-secondary: #12121a;
    --accent: #8b5cf6;
    
    /* Status Colors */
    --success: #10b981;
    --error: #ef4444;
    --warning: #f59e0b;
    
    /* Sizing */
    --radius: 16px;
    --radius-sm: 10px;
}
```

**Pattern**: Centralized color palette. Semantic naming (not color names like `--purple`).

### 2. **Component-Based Styling**
```css
.card { }
.card-header { }
.form-group { }
.btn-primary { }
.btn-link { }
.error { }
.hidden { }
```

**Pattern**: BEM-like naming. Reusable utility classes (`hidden`, `error`, `locked`).

### 3. **State Classes**
```css
input.error { border-color: var(--error); }
input.locked { opacity: 0.6; cursor: not-allowed; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
.hidden { display: none; }
```

**Pattern**: CSS classes mirror application state. Easy toggle with `classList.add/remove`.

### 4. **Animation Patterns**
```css
@keyframes float {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(20px, 20px); }
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

/* Applied to SVG spinner */
<animateTransform attributeName="transform" type="rotate" 
    from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
```

**Pattern**: CSS animations for non-interactive elements, SVG animations for inline graphics.

### 5. **Responsive Design**
```css
@media (max-width: 640px) {
    .container { width: 100%; }
    .card { padding: 20px; }
    h1 { font-size: 24px; }
}
```

**Pattern**: Mobile-first approach. Viewport meta tag + CSS media queries.

---

## HTML Patterns

### 1. **Accessibility Attributes**
```html
<input 
    type="email" 
    id="email" 
    placeholder="you@example.com"
    autocomplete="email"  <!-- Browser can suggest saved emails -->
>

<input 
    type="text" 
    id="otp" 
    placeholder="00000000"
    inputmode="numeric"   <!-- Mobile shows number keyboard -->
    autocomplete="one-time-code"  <!-- Browser can capture SMS OTP -->
>
```

**Pattern**: Semantic input types + autocomplete hints + inputmode for mobile UX.

### 2. **Form Structure**
```html
<form id="registration-form" method="POST" action="#">
    <div class="form-group">
        <label for="full-name">Full Name</label>
        <input type="text" id="full-name" />
        <span class="field-hint">Helper text</span>
        <span class="field-error" id="name-error"></span>
    </div>
</form>
```

**Pattern**: Label-input pair with hint and error containers. Error elements pre-rendered as empty spans.

### 3. **Content Security Policy**
```html
<meta http-equiv="Content-Security-Policy" 
    content="default-src 'self'; 
             script-src 'self' https://cdn.jsdelivr.net; 
             style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
             connect-src 'self' https://*.supabase.co;">
```

**Pattern**: Strict CSP. External assets from CDNs only. Database calls to Supabase only.

### 4. **Inline SVG Icons**
```html
<!-- Instead of image tags for icons -->
<div class="logo">
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="10" fill="#6366f1"/>
        <path d="M12 20L18 26L28 14" stroke="white" stroke-width="3"/>
    </svg>
</div>
```

**Pattern**: Inline SVGs for styling control + animations. No additional HTTP requests.

---

## Supabase Integration Patterns

### 1. **Client Initialization**
```javascript
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

**Pattern**: Single global client instance. Keys loaded from HTML script tag (CDN).

### 2. **OTP Authentication Flow**
```javascript
// Step 1: Send OTP
const { data, error } = await supabaseClient.auth.signInWithOtp({
    email: email
});

// Step 2: Verify OTP
const { data, error } = await supabaseClient.auth.verifyOtp({
    email: email,
    token: otp,
    type: 'email'
});

// Step 3: Insert into database (automatically includes auth context)
const { data, error } = await supabaseClient
    .from('registrations')
    .insert([{ full_name, email }]);
```

**Pattern**: Supabase functions return `{ data, error }` tuples. No exceptions for API errors.

### 3. **Row Level Security (RLS)**
Database policies restrict access:
- Only authenticated users can INSERT
- Users can only insert their own email
- Users can only SELECT their own records

**Pattern**: Database enforces rules, not frontend. Frontend assumes policies exist.

---

## UI/UX Patterns

### 1. **Multi-Step Form Flow**
```javascript
function showOtpField() {
    state.otpSent = true;
    dom.otpSection.classList.remove('hidden');
    dom.resendSection.classList.remove('hidden');
    dom.fullName.classList.add('locked');  // Disable previous step
    dom.email.classList.add('locked');
    dom.btnText.textContent = 'Verify & Register';  // Update button text
}
```

**Pattern**: Progress tracked in state. UI updated via class toggles. Previous fields locked.

### 2. **Countdown Timer**
```javascript
function startCountdown() {
    state.secondsLeft = 60;
    state.countdownTimer = setInterval(() => {
        state.secondsLeft--;
        dom.countdown.textContent = state.secondsLeft;
        if (state.secondsLeft <= 0) {
            clearInterval(state.countdownTimer);
            dom.resendBtn.disabled = false;
        }
    }, 1000);
}
```

**Pattern**: Timer stored in state. DOM updated each tick. Cleanup on completion.

### 3. **Toast Notifications**
```javascript
function showToast(message, type = 'success') {
    dom.toast.textContent = message;
    dom.toast.className = `toast ${type}`;
    dom.toast.classList.remove('hidden');
    setTimeout(() => dom.toast.classList.add('hidden'), 4000);
}
```

**Pattern**: Single toast element reused. Auto-hide after 4 seconds. Type-based styling.

### 4. **Loading States**
Button shows spinner while loading:
```html
<button type="submit" id="submit-btn" class="btn-primary">
    <span class="btn-text">Send Verification Code</span>
    <svg class="btn-spinner hidden"><!-- spinner SVG --></svg>
</button>
```

```javascript
if (loading) {
    dom.btnText.classList.add('hidden');
    dom.btnSpinner.classList.remove('hidden');
}
```

**Pattern**: Both elements pre-rendered. Toggle visibility with hidden class.

---

## Security Patterns

### 1. **Input Sanitization**
- Whitelist approach (only allow specific characters)
- Remove XSS vectors (`<`, `>`, quotes, backticks)
- Limit string length
- Trim whitespace

### 2. **Validation Layers**
- Client-side regex validation
- Server-side RLS policies
- Email verification via OTP
- Unique constraints on database

### 3. **Key Management**
- Anon key (public, RLS protected) used in frontend
- Service role key (private, no RLS) used only in admin page
- Keys stored in JavaScript constants (loaded from HTML)

### 4. **CORS & CSP**
- Content Security Policy meta tag restricts script sources
- Connect-src restricted to Supabase domain only
- No inline scripts (except CSP meta tag)

---

## Error Handling Patterns

### 1. **Field-Level Errors**
```javascript
function showFieldError(field, message) {
    const errorEl = dom[field + 'Error'];
    if (errorEl) errorEl.textContent = message;
    if (inputEl) inputEl.classList.add('error');
}

// Usage
if (error.message.includes('duplicate')) {
    showFieldError('email', 'This email is already registered');
}
```

**Pattern**: Specific error messages. Error element linked to input field.

### 2. **Toast for General Errors**
```javascript
showToast('An error occurred: ' + err.message, 'error');
```

**Pattern**: System errors shown as toast. User-friendly error handling.

---

## Performance Patterns

### 1. **No Build Step**
- Vanilla JS (no bundler)
- CSS inline via `<style>` tag or separate file
- Assets from CDN (Supabase JS SDK, Google Fonts)

### 2. **Lazy Loading**
- Fonts preconnect: `<link rel="preconnect">`
- Icons as inline SVG (no image requests)
- Third-party scripts defer loading

### 3. **DOM Optimization**
- Single toast element reused
- Pre-rendered error spans (updated, not created)
- Event delegation (form listener vs. individual inputs)

---

## Testing Considerations

### Manual Testing Checklist
- [ ] Form validation (invalid names, emails, OTPs)
- [ ] OTP countdown (starts, counts down, expires)
- [ ] Duplicate prevention (email & name)
- [ ] Mobile responsiveness (640px, 320px viewports)
- [ ] Accessibility (keyboard navigation, screen readers)
- [ ] Dark theme appearance

---

## File Organization

```
/
├── index.html          # Main form page
├── admin.html          # CSV export (service role)
├── app.js              # Frontend logic (573 lines)
├── style.css           # Styling (~350 lines)
├── README.md           # Setup instructions
├── CNAME               # GitHub Pages custom domain
└── supabase/
    └── migrations/
        └── 20260217_create_registrations.sql  # DB schema
```

---

## Key Takeaways for Development

1. **Separation of Concerns**: HTML (structure), CSS (design), JS (logic)
2. **Security First**: Sanitize inputs, validate server-side via RLS
3. **Progressive Enhancement**: Works without JavaScript (basic structure)
4. **Mobile-First**: Responsive design, touch-friendly inputs
5. **Accessibility**: Semantic HTML, ARIA attributes, keyboard support
6. **State Management**: Single state object, predictable updates
7. **Error Handling**: Specific field errors, general toast messages
8. **No Dependencies**: Vanilla JS + Supabase SDK only
