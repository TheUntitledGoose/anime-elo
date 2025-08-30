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
if (loginBtn) loginBtn.addEventListener('click', () => authModal.classList.remove('hidden'));
if (closeModal) closeModal.addEventListener('click', () => authModal.classList.add('hidden'));

// --- Toggle Login/Register ---
if (toggleAuthBtn) toggleAuthBtn.addEventListener('click', () => {
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
if (authSubmitBtn) authSubmitBtn.addEventListener('click', async () => {
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
      window.location.href = '/profile.html'; // redirect to anime list page
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
    const homeBtn = document.getElementById('homeBtn');

    if (data.loggedIn) {
      loginBtn?.classList.add('hidden');
      profileBtn?.classList.remove('hidden');
      logoutBtn?.classList.remove('hidden');

      if (profileBtn) profileBtn.onclick = () => {
        window.location.href = `/profile.html?user=${encodeURIComponent(data.username)}`;
      };
      if (logoutBtn) logoutBtn.onclick = () => logoutUser();
      if (homeBtn) homeBtn.onclick = () => window.location.href = '/';
    } else {
      loginBtn?.classList.remove('hidden');
      profileBtn?.classList.add('hidden');
      logoutBtn?.classList.add('hidden');
    }
  } catch (err) {
    console.error('Error checking login status:', err);
  }
}

async function logoutUser() {
  try {
    await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/';
  } catch (err) {
    console.error('Logout failed:', err);
  }
}

// Function to create and display a user's anime list with enhanced styling
function createUserAnimeList(userData) {
  const container = document.createElement('div');
  container.classList.add('user-anime-list');

  // User header info with better styling
  const header = document.createElement('h3');
  header.textContent = `${userData.user}`;
  container.appendChild(header);

  const updatedAtSpan = document.createElement('span');
  updatedAtSpan.classList.add('small');
  updatedAtSpan.textContent = `(Last Updated: ${new Date(userData.updatedAt).toLocaleString()})`;
  container.appendChild(updatedAtSpan);

  // Create a more modern card-based layout for anime entries
  const animeListContainer = document.createElement('div');
  animeListContainer.style.display = 'grid';
  animeListContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
  animeListContainer.style.gap = '1rem';
  animeListContainer.style.marginTop = '1rem';

  // Handle case where animeList might be undefined
  if (userData.animeList && Array.isArray(userData.animeList)) {
    // Only display top 5 animes
    const top5Animes = userData.animeList.slice(0, 5);
    top5Animes.forEach(anime => {
      const animeCard = document.createElement('div');
      animeCard.classList.add('anime-card');

      const animeName = document.createElement('div');
      animeName.textContent = anime.name;
      animeName.style.fontWeight = 'bold';
      animeName.style.fontSize = '1.1rem';
      animeName.style.color = '#9a4fc7';
      animeName.style.marginBottom = '0.5rem';

      const eloValue = document.createElement('div');
      eloValue.textContent = `ELO: ${anime.elo}`;
      eloValue.style.fontWeight = 'bold';
      eloValue.style.fontSize = '1rem';

      animeCard.appendChild(animeName);
      animeCard.appendChild(eloValue);
      animeListContainer.appendChild(animeCard);
    });
  } else {
    // Handle case where there's no anime list
    const noAnimeMessage = document.createElement('div');
    noAnimeMessage.textContent = 'No anime data available';
    noAnimeMessage.style.textAlign = 'center';
    noAnimeMessage.style.padding = '1rem';
    animeListContainer.appendChild(noAnimeMessage);
  }

  container.appendChild(animeListContainer);
  return container;
}

// Example usage with fetched data - enhanced version for better display
async function loadLatestLeaderboard() {
  try {
    const response = await fetch('/leaderboard/latest');
    if (!response.ok) throw new Error('Failed to fetch leaderboard data');

    const data = await response.json();
    const leaderboardContainer = document.getElementById('leaderboard');

    // Clear previous content and show loading state
    leaderboardContainer.innerHTML = '<div style="text-align: center; padding: 2rem;"><p>Loading leaderboard...</p></div>';

    // Add generated user anime list with a delay to show loading state
    setTimeout(() => {
      leaderboardContainer.innerHTML = '';
      
      // Handle case where data is an array of user lists (multiple users)
      if (Array.isArray(data) && data.length > 0) {
        data.forEach(userData => {
          leaderboardContainer.appendChild(createUserAnimeList(userData));
        });
      } else if (data && typeof data === 'object') {
        // Single user data case
        leaderboardContainer.appendChild(createUserAnimeList(data));
      } else {
        leaderboardContainer.innerHTML = '<div style="text-align: center; padding: 2rem;"><p>No leaderboard data available</p></div>';
      }
    }, 500);
  } catch (err) {
    console.error(err);
    const leaderboardContainer = document.getElementById('leaderboard');
    leaderboardContainer.innerHTML = '<div style="text-align: center; padding: 2rem;"><p>Error loading leaderboard data. Please try again later.</p></div>';
  }
}

// Fetch latest leaderboard thingy
document.addEventListener('DOMContentLoaded', async () => {

  checkAuthStatus();

  if (document.getElementById('leaderboard')) loadLatestLeaderboard();

})
