document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Fetch the currently logged-in user
    const authRes = await fetch('/auth/me', { credentials: 'include' });
    const authData = await authRes.json();

    if (!authData.loggedIn) {
      alert('You must be logged in to view your profile.');
      window.location.href = '/';
      return;
    }

    const userName = authData.username;

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

    // Add event listeners for delete buttons
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

  } catch (err) {
    console.error('Error loading profile:', err);
    alert('Failed to load profile');
  }
});
