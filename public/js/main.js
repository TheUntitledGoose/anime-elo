const loginBtn = document.getElementById('loginBtn');
const authModal = document.getElementById('authModal');
const closeModal = document.getElementById('closeModal');

const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authTitle = document.getElementById('authTitle');
const toggleAuthBtn = document.getElementById('toggleAuthBtn');
const toggleAuthText = document.getElementById('toggleAuthText');

let isLogin = true; // toggle login/register


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
  if (!username || !password) return console.log('Username and password required', false);

  authSubmitBtn.disabled = true;

  const url = isLogin ? '/auth/login' : '/auth/register';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include'
  });
  const data = await res.json();

  if (res.ok) {
    console.log(isLogin ? `Logged in as ${data.username}` : `Registered as ${data.username}`);
    setTimeout(() => {
      window.location.href = '/add-list.html'; // redirect to anime list page
    }, 500);
  } else {
    authSubmitBtn.disabled = false;
    console.log(data.error, false);
  }
});

async function checkAuthStatus() {
  try {
    const res = await fetch('/auth/me', { credentials: 'include' });
    const data = await res.json();

    const loginBtn = document.getElementById('loginBtn');
    const profileBtn = document.getElementById('profileBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    console.log(data);

    if (data.loggedIn) {
      loginBtn.classList.add('hidden');
      profileBtn.classList.remove('hidden');
      logoutBtn.classList.remove('hidden');

      profileBtn.onclick = () => {
        window.location.href = `/profile.html?user=${encodeURIComponent(data.username)}`;
      };
      logoutBtn.onclick = () => logoutUser();
    } else {
      loginBtn.classList.remove('hidden');
      profileBtn.classList.add('hidden');
      logoutBtn.classList.add('hidden');
    }
  } catch (err) {
    console.error('Error checking login status:', err);
  }
}


async function logoutUser() {
  try {
    await fetch('/logout', { method: 'POST', credentials: 'include' });
    location.reload();
  } catch (err) {
    console.error('Logout failed:', err);
  }
}

// Function to create and display a user's anime list
function createUserAnimeList(userData) {
  const container = document.createElement('div');
  container.classList.add('user-anime-list');

  // User header info
  const header = document.createElement('h3');
  header.textContent = `${userData.user}`;
  container.appendChild(header);

  const span = document.createElement('span');
  span.classList.add('small');
  span.textContent = `(Last Updated: ${new Date(userData.updatedAt).toLocaleString()})`;
  container.appendChild(span)

  // Anime List
  const list = document.createElement('ul');
  userData.animeList.forEach(anime => {
    const item = document.createElement('p');
    item.textContent = `${anime.name} — Elo: ${anime.elo}`;
    list.appendChild(item);
  });
  container.appendChild(list);

  return container;
}

// Example usage with fetched data
async function loadLatestLeaderboard() {
  try {
    const response = await fetch('/leaderboard/latest');
    if (!response.ok) throw new Error('Failed to fetch leaderboard data');

    const data = await response.json();
    const leaderboardContainer = document.getElementById('leaderboard');

    // Clear previous content
    leaderboardContainer.innerHTML = '';

    // Add generated user anime list
    leaderboardContainer.appendChild(createUserAnimeList(data));
  } catch (err) {
    console.error(err);
    alert('Error loading leaderboard data.');
  }
}

// Fetch latest leaderboard thingy
document.addEventListener('DOMContentLoaded', async () => {

  checkAuthStatus();

  loadLatestLeaderboard();

})