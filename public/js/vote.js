async function getAnimeImageUrl(animeName) {
  try {
    const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(animeName)}&limit=1`);
    const data = await response.json();
    return data.data[0]?.images?.jpg?.image_url || null;
  } catch (error) {
    console.error('Error fetching image for', animeName, error);
    return null;
  }
}

async function loadPair() {
  const status = document.getElementById('status');
  status.textContent = 'Loading anime pair...';

  try {
    const res = await fetch('/vote/get-pair', { credentials: 'include' });
    const data = await res.json();

    if (data.error) {
      status.textContent = data.error;
      return;
    }

    const { animeA, animeB } = data;
    const animeAEl = document.getElementById('animeA');
    const animeBEl = document.getElementById('animeB');

    // Text content
    animeAEl.textContent = animeA.name;
    animeBEl.textContent = animeB.name;

    // Add overlay for text visibility
    animeAEl.style.position = animeBEl.style.position = 'relative';
    animeAEl.style.color = animeBEl.style.color = 'white';
    animeAEl.style.textShadow = animeBEl.style.textShadow = '0 0 5px black';
    animeAEl.style.backgroundSize = animeBEl.style.backgroundSize = 'cover';
    animeAEl.style.backgroundPosition = animeBEl.style.backgroundPosition = 'center';

    // Optional: set a min height for visuals
    // Make the buttons responsive by adjusting heights based on screen size
    if (window.innerWidth <= 480) {
      animeAEl.style.minHeight = animeBEl.style.minHeight = '100px';
      animeAEl.style.fontSize = animeBEl.style.fontSize = '1.2rem';
    } else {
      animeAEl.style.minHeight = animeBEl.style.minHeight = '444px';
      animeAEl.style.fontSize = animeBEl.style.fontSize = '1.5rem';
    }
    animeAEl.style.border = animeBEl.style.border = 'none';
    // For mobile, adjust min width to be more responsive
    if (window.innerWidth <= 480) {
      animeAEl.style.minWidth = animeBEl.style.minWidth = '90%';
    } else {
      animeAEl.style.minWidth = animeBEl.style.minWidth = '250px';
    }
    // animeAEl.style.display = animeBEl.style.display = 'flex';
    animeAEl.style.alignItems = animeBEl.style.alignItems = 'center';
    animeAEl.style.justifyContent = animeBEl.style.justifyContent = 'center';

    // Remove any existing skip button to avoid duplicates
    const existingSkipButton = document.getElementById('skipButton');
    if (existingSkipButton) {
      existingSkipButton.remove();
    }

    // Add skip button functionality
    const skipButton = document.createElement('button');
    skipButton.id = 'skipButton';
    skipButton.textContent = 'Skip (Haven\'t Seen)';
    skipButton.onclick = () => submitSkip();
    skipButton.style.padding = '10px 20px';

    // Add the skip button after the vote buttons
    const container = document.getElementById('voteContainer');
    container.parentNode.insertBefore(skipButton, container.nextSibling)

    // Load images
    const [imageA, imageB] = await Promise.all([
      getAnimeImageUrl(animeA.name),
      getAnimeImageUrl(animeB.name)
    ]);

    if (imageA) {
      animeAEl.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${imageA})`;
    }

    if (imageB) {
      animeBEl.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${imageB})`;
    }

    // Set click handlers
    document.getElementById('animeA').onclick = () => submitVote(animeA.name, animeB.name);
    document.getElementById('animeB').onclick = () => submitVote(animeB.name, animeA.name);

    status.textContent = '';
  } catch (err) {
    console.error(err);
    status.textContent = 'Failed to load anime pair.';
  }
}

async function submitVote(winner, loser) {
  const status = document.getElementById('status');
  status.textContent = 'Submitting vote...';

  try {
    const res = await fetch('/vote/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ winner, loser })
    });
    const data = await res.json();

    if (data.error) {
      status.textContent = data.error;
      return;
    }

    status.textContent = `You voted for ${winner}!`;

    // Load next pair automatically
    setTimeout(loadPair, 800);
  } catch (err) {
    console.error(err);
    status.textContent = 'Failed to submit vote.';
  }
}

async function submitSkip() {
  const status = document.getElementById('status');
  status.textContent = 'Skipping vote...';

  try {
    const res = await fetch('/vote/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ skip: true })
    });
    const data = await res.json();

    if (data.error) {
      status.textContent = data.error;
      return;
    }

    status.textContent = 'Vote skipped!';

    // Load next pair automatically
    setTimeout(loadPair, 800);
  } catch (err) {
    console.error(err);
    status.textContent = 'Failed to skip vote.';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', loadPair);
