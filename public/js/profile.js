document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const username = params.get('username');

  if (!username) {
    alert('No username specified.');
    window.location.href = '/';
    return;
  }

  try {
    const res = await fetch(`/leaderboard/user/${encodeURIComponent(username)}`);
    const data = await res.json();

    if (data.error) {
      alert(data.error);
      window.location.href = '/';
      return;
    }

    document.getElementById('username').textContent = `${data.user}'s Anime List`;
    document.getElementById('lastUpdated').textContent = `Last Updated: ${new Date(data.updatedAt).toLocaleString()}`;

    const tableBody = document.querySelector('#animeTable tbody');
    tableBody.innerHTML = '';
    data.animeList.forEach((anime, i) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${i + 1}</td>
        <td>${anime.name}</td>
        <td>${anime.elo}</td>
      `;
      tableBody.appendChild(row);
    });
  } catch (err) {
    console.error('Error loading profile:', err);
    alert('Failed to load profile');
  }
});
