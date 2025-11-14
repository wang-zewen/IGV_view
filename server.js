const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');

const app = express();
const port = config.port;

// Enable CORS for all routes (required for IGV.js to load files)
app.use(cors({
  origin: '*',
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Range', 'Content-Type', 'Accept'],
  exposedHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges']
}));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data directory exists
if (!fs.existsSync(config.dataDir)) {
  console.log(`Creating data directory: ${config.dataDir}`);
  fs.mkdirSync(config.dataDir, { recursive: true });
}

// Helper function to check if file extension is allowed
function isAllowedFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return config.allowedExtensions.includes(ext);
}

// Helper function to recursively list files
function listFiles(dir, baseDir = dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);

    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      const relativePath = path.relative(baseDir, filePath);

      if (stat.isDirectory()) {
        results.push({
          name: file,
          path: relativePath,
          type: 'directory',
          size: 0
        });
        // Recursively list subdirectories
        results = results.concat(listFiles(filePath, baseDir));
      } else if (isAllowedFile(file)) {
        results.push({
          name: file,
          path: relativePath,
          type: 'file',
          size: stat.size,
          modified: stat.mtime
        });
      }
    });
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err.message);
  }

  return results;
}

// API endpoint to list available files
app.get('/api/files', (req, res) => {
  try {
    const files = listFiles(config.dataDir);
    res.json({
      dataDir: config.dataDir,
      files: files
    });
  } catch (err) {
    console.error('Error listing files:', err);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// API endpoint to browse a specific directory
app.get('/api/browse', (req, res) => {
  const subPath = req.query.path || '';
  const fullPath = path.join(config.dataDir, subPath);

  // Security check: ensure path is within data directory
  if (!fullPath.startsWith(config.dataDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Directory not found' });
    }

    const stat = fs.statSync(fullPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'Not a directory' });
    }

    const items = fs.readdirSync(fullPath).map(name => {
      const itemPath = path.join(fullPath, name);
      const itemStat = fs.statSync(itemPath);
      const relativePath = path.relative(config.dataDir, itemPath);

      return {
        name: name,
        path: relativePath,
        type: itemStat.isDirectory() ? 'directory' : 'file',
        size: itemStat.size,
        modified: itemStat.mtime,
        allowed: itemStat.isDirectory() || isAllowedFile(name)
      };
    }).filter(item => item.allowed);

    res.json({
      currentPath: subPath,
      items: items
    });
  } catch (err) {
    console.error('Error browsing directory:', err);
    res.status(500).json({ error: 'Failed to browse directory' });
  }
});

// Serve data files with proper headers for range requests
app.get('/data/*', (req, res) => {
  const requestedPath = req.params[0];
  const filePath = path.join(config.dataDir, requestedPath);

  // Security check: ensure path is within data directory
  if (!filePath.startsWith(config.dataDir)) {
    return res.status(403).send('Access denied');
  }

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  // Check if file extension is allowed
  if (!isAllowedFile(filePath)) {
    return res.status(403).send('File type not allowed');
  }

  try {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Set appropriate content type
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.bam': 'application/octet-stream',
      '.bai': 'application/octet-stream',
      '.cram': 'application/octet-stream',
      '.crai': 'application/octet-stream',
      '.vcf': 'text/plain',
      '.bed': 'text/plain',
      '.gff': 'text/plain',
      '.gff3': 'text/plain',
      '.gtf': 'text/plain',
      '.fa': 'text/plain',
      '.fasta': 'text/plain',
      '.json': 'application/json',
      '.xml': 'application/xml'
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Handle range requests (required for BAM files)
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;

      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType
      });

      file.pipe(res);
    } else {
      // Send entire file
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      });

      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error('Error serving file:', err);
    res.status(500).send('Error reading file');
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    dataDir: config.dataDir,
    version: '1.0.0'
  });
});

// Start server
app.listen(port, () => {
  console.log('=====================================');
  console.log('  IGV.js Server Started');
  console.log('=====================================');
  console.log(`Server running at: http://localhost:${port}`);
  console.log(`Data directory: ${config.dataDir}`);
  console.log('');
  console.log('Place your genomics files in the data directory,');
  console.log('then open your browser to view them in IGV.js');
  console.log('=====================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
