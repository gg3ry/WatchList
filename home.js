const toggleView = document.getElementById('toggleView');
const addSection = document.getElementById('addSection');
const listSection = document.getElementById('listSection');
const mediaForm = document.getElementById('mediaForm');
const mediaTable = document.getElementById('mediaTable');
const statusSelect = document.getElementById('status');
const typeSelect = document.getElementById('type');
const watchingInputs = document.getElementById('watchingInputs');
const searchBar = document.getElementById('searchBar');

let mediaData = [];
let sortState = { column: null, asc: true };
let searchQuery = "";

listSection.classList.add('active');
toggleView.checked = false;

toggleView.addEventListener('change', () => {
  if (toggleView.checked) {
   listSection.classList.remove('active');
    addSection.classList.add('active');
    
  } else {
    addSection.classList.remove('active');
    listSection.classList.add('active');
    loadMedia();
  }
});

statusSelect.addEventListener('change', () => {
  watchingInputs.style.display = statusSelect.value === 'watching' ? 'block' : 'none';
});

typeSelect.addEventListener('change', () => {
  const isMovie = typeSelect.value === 'movie';
  [...statusSelect.options].forEach(opt => {
    if (opt.value === 'watching') opt.disabled = isMovie;
  });
  if (isMovie && statusSelect.value === 'watching') statusSelect.value = 'false';
});

async function loadMedia() {
  const resUnwatched = await fetch('/api/media?type=unwatched');
  const unwatched = await resUnwatched.json();
  const resWatched = await fetch('/api/media?type=watched');
  const watched = await resWatched.json();
  const resWatching = await fetch('/api/media?type=watching');
  const watching = await resWatching.json();

  mediaData = [...watching, ...unwatched, ...watched];
  renderTable();
}

function highlight(text) {
  if (!searchQuery) return text;
  const regex = new RegExp(`(${searchQuery})`, 'gi');
  return text.replace(regex, '<span class="highlight">$1</span>');
}

function renderTable() {
  mediaTable.innerHTML = '';
  let filtered = [...mediaData];

  if (searchQuery) {
    filtered = filtered.filter(item => {
      const text = `${item.name} ${item.type} ${item.seen}`.toLowerCase();
      return text.includes(searchQuery.toLowerCase());
    });
  }

  if (sortState.column) {
    filtered.sort((a, b) => {
      let valA, valB;
      if (sortState.column === 'status') {
        valA = a.seen === 'watching' ? 0 : a.seen === false ? 1 : 2;
        valB = b.seen === 'watching' ? 0 : b.seen === false ? 1 : 2;
      } else {
        valA = a[sortState.column]?.toString().toLowerCase();
        valB = b[sortState.column]?.toString().toLowerCase();
      }
      if (valA < valB) return sortState.asc ? -1 : 1;
      if (valA > valB) return sortState.asc ? 1 : -1;
      return 0;
    });
  }

  document.querySelectorAll('th').forEach(th => th.classList.remove('sort-asc', 'sort-desc'));
  if (sortState.column) {
    const activeTh = document.querySelector(`th[data-column="${sortState.column}"]`);
    if (activeTh) activeTh.classList.add(sortState.asc ? 'sort-asc' : 'sort-desc');
  }

  filtered.forEach(item => {
    const statusText = item.seen === 'watching'
      ? `[👀] S${item.season || '?'}E${item.episode || '?'}`
      : item.seen === true
        ? '[✔] Watched'
        : '[❌] Unwatched';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${highlight(item.type)}</td>
      <td><div class="button-container"><a href="${item.url}" target="_blank">${highlight(item.name)}</a></div></td>
      <td>${highlight(statusText)}</td>
      <td>
        <button class="editBtn">Edit</button>
        <button class="deleteBtn">Delete</button>
      </td>
    `;

    row.querySelector('.editBtn').addEventListener('click', () => editRow(row, item));
    row.querySelector('.deleteBtn').addEventListener('click', async () => {
      await fetch(`/api/media/${item.id}`, { method: 'DELETE' });
      loadMedia();
    });

    mediaTable.appendChild(row);
  });
}

function editRow(row, item) {
  row.innerHTML = `
    <td>
      <select class="edit-type">
        <option value="movie" ${item.type === 'movie' ? 'selected' : ''}>Movie</option>
        <option value="tvshow" ${item.type === 'tvshow' ? 'selected' : ''}>TV Show</option>
        <option value="anime" ${item.type === 'anime' ? 'selected' : ''}>Anime</option>
      </select>
    </td>
    <td><input class="edit-name" value="${item.name}"></td>
    <td><input class="edit-url" value="${item.url}"></td>
    <td>
      <select class="edit-status">
        <option value="false" ${item.seen === false ? 'selected' : ''}>❌ Not Seen</option>
        <option value="true" ${item.seen === true ? 'selected' : ''}>✅ Seen</option>
        <option value="watching" ${item.seen === 'watching' ? 'selected' : ''}>👀 Watching</option>
      </select>
      <div class="watching-fields" style="${item.seen === 'watching' ? '' : 'display:none'}">
        <input type="number" class="edit-season" value="${item.season || ''}" placeholder="Season">
        <input type="number" class="edit-episode" value="${item.episode || ''}" placeholder="Episode">
      </div>
    </td>
    <td><button class="saveBtn">Save</button></td>
  `;

  const statusEl = row.querySelector('.edit-status');
  const watchingFields = row.querySelector('.watching-fields');
  const typeEl = row.querySelector('.edit-type');

  statusEl.addEventListener('change', () => {
    watchingFields.style.display = statusEl.value === 'watching' ? '' : 'none';
  });

  typeEl.addEventListener('change', () => {
    const isMovie = typeEl.value === 'movie';
    [...statusEl.options].forEach(opt => {
      if (opt.value === 'watching') opt.disabled = isMovie;
    });
    if (isMovie && statusEl.value === 'watching') statusEl.value = 'false';
  });

  row.querySelector('.saveBtn').addEventListener('click', async () => {
    const updated = {
      ...item,
      type: typeEl.value,
      name: row.querySelector('.edit-name').value.trim(),
      url: row.querySelector('.edit-url').value.trim(),
      seen: statusEl.value === 'true' ? true : statusEl.value === 'false' ? false : 'watching',
      season: statusEl.value === 'watching' ? parseInt(row.querySelector('.edit-season').value) || 1 : null,
      episode: statusEl.value === 'watching' ? parseInt(row.querySelector('.edit-episode').value) || 1 : null
    };

    await fetch(`/api/media/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    loadMedia();
  });
}

document.querySelectorAll('th[data-column]').forEach(th => {
  th.addEventListener('click', () => {
    const column = th.dataset.column;
    if (sortState.column === column) {
      sortState.asc = !sortState.asc;
    } else {
      sortState.column = column;
      sortState.asc = true;
    }
    renderTable();
  });
});

mediaForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const type = typeSelect.value.trim();
  const name = document.getElementById('name').value.trim();
  const url = document.getElementById('url').value.trim();
  const status = statusSelect.value;

  let seen = status === 'true' ? true : status === 'false' ? false : 'watching';
  let season = null, episode = null;
  if (seen === 'watching') {
    season = parseInt(document.getElementById('season').value) || 1;
    episode = parseInt(document.getElementById('episode').value) || 1;
  }

  await fetch('/api/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, name, url, seen, season, episode })
  });

  mediaForm.reset();
  watchingInputs.style.display = 'none';
  loadMedia();
});

searchBar.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderTable();
});

loadMedia();
// Initial hide/show logic
function updateWatchingInputs() {
  const isMovie = typeSelect.value === 'movie';
  const status = statusSelect.value;
  if (status === 'watching' && !isMovie) {
    watchingInputs.style.display = 'block';
  } else {
    watchingInputs.style.display = 'none';
  }
}

// Run on load
updateWatchingInputs();

// Show/hide season/episode on status change
statusSelect.addEventListener('change', updateWatchingInputs);

// Disable "watching" for movies
typeSelect.addEventListener('change', () => {
  const isMovie = typeSelect.value === 'movie';
  [...statusSelect.options].forEach(opt => {
    if (opt.value === 'watching') opt.disabled = isMovie;
  });
  if (isMovie && statusSelect.value === 'watching') statusSelect.value = 'false';
  updateWatchingInputs();
});
