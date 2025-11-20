const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static(__dirname));

// File paths
const watchedFile = path.join(__dirname, '/data/watched.json');
const unwatchedFile = path.join(__dirname, '/data/unwatched.json');
const watchingFile = path.join(__dirname, '/data/watching.json');

// Utility to read JSON file
function readJSON(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) reject(err);
      else resolve(JSON.parse(data || '[]'));
    });
  });
}

// Utility to write JSON file
function writeJSON(filePath, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Get media list
app.get('/api/media', async (req, res) => {
  const type = req.query.type || 'unwatched';
  let filePath;

  if (type === 'watched') filePath = watchedFile;
  else if (type === 'watching') filePath = watchingFile;
  else filePath = unwatchedFile;

  try {
    const data = await readJSON(filePath);
    res.json(data);
  } catch (err) {
    console.error("Error reading data:", err);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Add media
app.post('/api/media', async (req, res) => {
  try {
    const { type = 'movie', name, url, seen = false, season = null, episode = null } = req.body;

    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }

    let filePath;
    if (seen === true) filePath = watchedFile;
    else if (seen === 'watching') filePath = watchingFile;
    else filePath = unwatchedFile;

    const data = await readJSON(filePath);
    const newItem = { id: Date.now(), type, name, url, seen, season, episode };
    data.push(newItem);
    await writeJSON(filePath, data);

    res.json(newItem);
  } catch (err) {
    console.error("Error adding media:", err);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Update media
app.put('/api/media/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { type, name, url, seen, season, episode } = req.body;
  const files = [watchedFile, unwatchedFile, watchingFile];

  try {
    let updatedItem = null;

    for (const file of files) {
      const data = await readJSON(file);
      const index = data.findIndex(item => item.id === id);

      if (index !== -1) {
        const currentItem = data[index];
        const needsMove =
          (file === watchedFile && seen !== true) ||
          (file === unwatchedFile && seen !== false) ||
          (file === watchingFile && seen !== 'watching');

        if (needsMove) {
          data.splice(index, 1);
          await writeJSON(file, data);

          let targetFile;
          if (seen === true) targetFile = watchedFile;
          else if (seen === false) targetFile = unwatchedFile;
          else if (seen === 'watching') targetFile = watchingFile;

          const targetData = await readJSON(targetFile);
          const newItem = { id, type, name, url, seen, season, episode };
          targetData.push(newItem);
          await writeJSON(targetFile, targetData);
          updatedItem = newItem;
        } else {
          data[index] = { id, type, name, url, seen, season, episode };
          await writeJSON(file, data);
          updatedItem = data[index];
        }
        break;
      }
    }

    if (!updatedItem) return res.status(404).json({ error: 'Item not found' });
    res.json(updatedItem);
  } catch (err) {
    console.error("Error updating media:", err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete media
app.delete('/api/media/:id', async (req, res) => {
  const id = Number(req.params.id);
  const files = [watchedFile, unwatchedFile, watchingFile];

  try {
    for (const file of files) {
      const data = await readJSON(file);
      const index = data.findIndex(item => item.id === id);

      if (index !== -1) {
        data.splice(index, 1);
        await writeJSON(file, data);
        return res.json({ success: true });
      }
    }

    res.status(404).json({ error: 'Item not found' });
  } catch (err) {
    console.error("Error deleting media:", err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

app.listen(PORT, () => console.log(`Server started --> http://localhost:${PORT}`));
