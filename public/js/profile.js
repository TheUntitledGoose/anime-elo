document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Check if a user query parameter is provided (for viewing other users' profiles)
    const urlParams = new URLSearchParams(window.location.search);
    const targetUsername = urlParams.get('user');

    let userName;
    let authData;

    if (targetUsername) {
      // Viewing another user's profile - no authentication required for this view
      userName = targetUsername;
      // We don't need to fetch auth info when viewing another user's profile
    } else {
      // Fetch the currently logged-in user
      const authRes = await fetch('/auth/me', { credentials: 'include' });
      authData = await authRes.json();

      if (!authData.loggedIn) {
        alert('You must be logged in to view your profile.');
        window.location.href = '/';
        return;
      }

      userName = authData.username;
    }

    // Fetch the user's anime list
    const res = await fetch(`/leaderboard/user/${encodeURIComponent(userName)}`, { credentials: 'include' });
    const data = await res.json();

    if (data.error) {
      alert(data.error);
      window.location.href = '/';
      return;
    }

    // Populate profile info

    const updatedDate = data.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A';

    document.getElementById('username').textContent = `${userName}'s Anime List`;
    document.getElementById('lastUpdated').textContent = `Last Updated: ${updatedDate}`;

    const tableBody = document.querySelector('#animeTable tbody');
    tableBody.innerHTML = '';
    
    // Handle case where animeList might be undefined or not an array
    if (data.animeList && Array.isArray(data.animeList)) {
      data.animeList.forEach((anime, i) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${i + 1}</td>
          <td>${anime.name}</td>
          <td>${anime.elo}</td>
          <td><button class="deleteBtn" data-name="${anime.name}">DELETE</button></td>
        `;
        tableBody.appendChild(row);
      });
    } else {
      // Handle case where there's no anime list
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="4" style="text-align: center;">No anime data available</td>`;
      tableBody.appendChild(row);
    }

    // Add event listeners for delete buttons (only if viewing own profile)
    if (!targetUsername) {
      document.querySelectorAll('.deleteBtn').forEach(btn => {
        btn.onclick = async () => {
          const animeName = btn.dataset.name;
          if (!confirm(`Delete "${animeName}" from your list?`)) return;

          try {
            const res = await fetch('/profile/anime', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ name: animeName })
            });
            const result = await res.json();
            if (result.ok) {
              // Reload profile after deletion
              btn.closest('tr').remove(); // remove row from table immediately
            }
          } catch (err) {
            console.error('Failed to delete anime:', err);
            alert('Failed to delete anime');
          }
        };
      });
    } else {
      // Hide delete buttons when viewing another user's profile
      document.querySelectorAll('.deleteBtn').forEach(btn => {
        btn.style.display = 'none';
      });
      // Hide the add list button as well for other users
      document.getElementById('addListBtn')?.style.setProperty('display', 'none');
      // Hide battle arena button for other users
      document.getElementById('voteBtn')?.style.setProperty('display', 'none');
    }

    // Setup navigation buttons based on context (own profile vs other user's profile)
    const homeBtn = document.getElementById('homeBtn');
    const voteBtn = document.getElementById('voteBtn');
    const addListBtn = document.getElementById('addListBtn');
    
    if (targetUsername) {
      // When viewing another user's profile, hide the battle arena button and make home button work properly
      if (voteBtn) voteBtn.style.display = 'none';
      // Home button should still work to go back to index page
      if (homeBtn) {
        homeBtn.onclick = () => window.location.href = '/';
      }
    } else {
      // When viewing own profile, set up proper event handlers for buttons
      if (homeBtn) {
        homeBtn.onclick = () => window.location.href = '/';
      }
      if (voteBtn) {
        voteBtn.onclick = () => window.location.href = '/vote.html';
      }
      if (addListBtn) {
        addListBtn.onclick = () => window.location.href = '/add-list.html';
      }
    }

  } catch (err) {
    console.error('Error loading profile:', err);
    alert('Failed to load profile');
  }
});
