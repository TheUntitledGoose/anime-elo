const loginBtn = document.getElementById('loginBtn');
const authModal = document.getElementById('authModal');
const closeModal = document.getElementById('closeModal');

const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authTitle = document.getElementById('authTitle');
const toggleAuthBtn = document.getElementById('toggleAuthBtn');
const toggleAuthText = document.getElementById('toggleAuthText');
const messageDiv = document.getElementById('message');

let isLogin = true; // toggle login/register

const showMessage = (msg, success=true) => {
  messageDiv.textContent = msg;
  messageDiv.style.color = success ? 'green' : 'red';
}

// --- Modal Toggle ---
loginBtn.addEventListener('click', () => authModal.classList.remove('hidden'));
closeModal.addEventListener('click', () => authModal.classList.add('hidden'));

// --- Toggle Login/Register ---
toggleAuthBtn.addEventListener('click', () => {
  isLogin = !isLogin;
  authTitle.textContent = isLogin ? 'Login' : 'Register';
  authSubmitBtn.textContent = isLogin ? 'Login' : 'Register';
  toggleAuthText.innerHTML = isLogin 
    ? `Don't have an account? <button id="toggleAuthBtn">Register</button>` 
    : `Already have an account? <button id="toggleAuthBtn">Login</button>`;

  // Re-bind toggle button inside updated HTML
  document.getElementById('toggleAuthBtn').addEventListener('click', () => toggleAuthBtn.click());
});

// --- Auth Submit ---
authSubmitBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if (!username || !password) return showMessage('Username and password required', false);

  const url = isLogin ? '/auth/login' : '/auth/register';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();

  if (res.ok) {
    showMessage(isLogin ? `Logged in as ${data.username}` : `Registered as ${data.username}`);
    setTimeout(() => {
      window.location.href = '/add-list.html'; // redirect to anime list page
    }, 500);
  } else {
    showMessage(data.error, false);
  }
});
