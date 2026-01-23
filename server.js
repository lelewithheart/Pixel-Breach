// Pixel Breach - Local Map Review Server
// Run with: node server.js
// Access game at: http://localhost:3000
// Access admin at: http://localhost:3000/admin

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const BASE_DIR = __dirname;
const UNVERIFIED_DIR = path.join(BASE_DIR, 'maps', 'unverified');
const COMMUNITY_DIR = path.join(BASE_DIR, 'maps', 'community');

// Ensure directories exist
if (!fs.existsSync(UNVERIFIED_DIR)) fs.mkdirSync(UNVERIFIED_DIR, { recursive: true });
if (!fs.existsSync(COMMUNITY_DIR)) fs.mkdirSync(COMMUNITY_DIR, { recursive: true });

// MIME types
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon'
};

// Parse JSON body from request
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(e);
            }
        });
    });
}

// Get list of maps from a directory
function getMapsFromDir(dir) {
    if (!fs.existsSync(dir)) return [];
    
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    return files.map(filename => {
        const filePath = path.join(dir, filename);
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            return {
                filename,
                name: data.metadata?.name || filename.replace('.json', ''),
                author: data.metadata?.author || 'Unknown',
                description: data.metadata?.description || '',
                difficulty: data.metadata?.difficulty || 'medium',
                createdAt: data.metadata?.createdAt || null,
                enemyCount: data.entities?.enemies?.length || 0,
                hostageCount: data.entities?.civilians?.length || 0
            };
        } catch (e) {
            return { filename, name: filename, error: true };
        }
    });
}

// API Routes
async function handleAPI(req, res, pathname) {
    res.setHeader('Content-Type', 'application/json');
    
    // GET /api/unverified - List unverified maps
    if (req.method === 'GET' && pathname === '/api/unverified') {
        const maps = getMapsFromDir(UNVERIFIED_DIR);
        res.end(JSON.stringify({ success: true, maps }));
        return;
    }
    
    // GET /api/community - List community maps
    if (req.method === 'GET' && pathname === '/api/community') {
        const maps = getMapsFromDir(COMMUNITY_DIR);
        res.end(JSON.stringify({ success: true, maps }));
        return;
    }
    
    // GET /api/map/:type/:filename - Get specific map data
    if (req.method === 'GET' && pathname.startsWith('/api/map/')) {
        const parts = pathname.split('/');
        const type = parts[3]; // 'unverified' or 'community'
        const filename = decodeURIComponent(parts[4]);
        
        const dir = type === 'unverified' ? UNVERIFIED_DIR : COMMUNITY_DIR;
        const filePath = path.join(dir, filename);
        
        if (!fs.existsSync(filePath)) {
            res.statusCode = 404;
            res.end(JSON.stringify({ success: false, error: 'Map not found' }));
            return;
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        res.end(content);
        return;
    }
    
    // POST /api/submit - Submit a new map for review
    if (req.method === 'POST' && pathname === '/api/submit') {
        try {
            const body = await parseBody(req);
            const mapData = body.mapData;
            
            if (!mapData || !mapData.grid) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: 'Invalid map data' }));
                return;
            }
            
            // Generate filename
            const name = mapData.metadata?.name || 'Untitled';
            const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30);
            const timestamp = Date.now();
            const filename = `${safeName}-${timestamp}.json`;
            
            // Add submission timestamp
            mapData.metadata = mapData.metadata || {};
            mapData.metadata.submittedAt = new Date().toISOString();
            
            // Save to unverified folder
            const filePath = path.join(UNVERIFIED_DIR, filename);
            fs.writeFileSync(filePath, JSON.stringify(mapData, null, 2));
            
            console.log(`[SUBMIT] New map submitted: ${filename}`);
            res.end(JSON.stringify({ success: true, filename, message: 'Map submitted for review!' }));
        } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: e.message }));
        }
        return;
    }
    
    // POST /api/accept/:filename - Accept a map (move to community)
    if (req.method === 'POST' && pathname.startsWith('/api/accept/')) {
        const filename = decodeURIComponent(pathname.split('/')[3]);
        const srcPath = path.join(UNVERIFIED_DIR, filename);
        const destPath = path.join(COMMUNITY_DIR, filename);
        
        if (!fs.existsSync(srcPath)) {
            res.statusCode = 404;
            res.end(JSON.stringify({ success: false, error: 'Map not found' }));
            return;
        }
        
        // Read, add approval info, and move
        const content = fs.readFileSync(srcPath, 'utf8');
        const mapData = JSON.parse(content);
        mapData.metadata = mapData.metadata || {};
        mapData.metadata.approvedAt = new Date().toISOString();
        mapData.metadata.status = 'approved';
        
        fs.writeFileSync(destPath, JSON.stringify(mapData, null, 2));
        fs.unlinkSync(srcPath);
        
        console.log(`[ACCEPT] Map approved: ${filename}`);
        res.end(JSON.stringify({ success: true, message: 'Map approved and added to community levels!' }));
        return;
    }
    
    // POST /api/deny/:filename - Deny a map (delete it)
    if (req.method === 'POST' && pathname.startsWith('/api/deny/')) {
        const filename = decodeURIComponent(pathname.split('/')[3]);
        const filePath = path.join(UNVERIFIED_DIR, filename);
        
        if (!fs.existsSync(filePath)) {
            res.statusCode = 404;
            res.end(JSON.stringify({ success: false, error: 'Map not found' }));
            return;
        }
        
        fs.unlinkSync(filePath);
        console.log(`[DENY] Map rejected: ${filename}`);
        res.end(JSON.stringify({ success: true, message: 'Map rejected and deleted.' }));
        return;
    }
    
    // POST /api/delete-community/:filename - Delete a community map
    if (req.method === 'POST' && pathname.startsWith('/api/delete-community/')) {
        const filename = decodeURIComponent(pathname.split('/')[3]);
        const filePath = path.join(COMMUNITY_DIR, filename);
        
        if (!fs.existsSync(filePath)) {
            res.statusCode = 404;
            res.end(JSON.stringify({ success: false, error: 'Map not found' }));
            return;
        }
        
        fs.unlinkSync(filePath);
        console.log(`[DELETE] Community map removed: ${filename}`);
        res.end(JSON.stringify({ success: true, message: 'Community map deleted.' }));
        return;
    }
    
    // 404 for unknown API routes
    res.statusCode = 404;
    res.end(JSON.stringify({ success: false, error: 'API endpoint not found' }));
}

// Serve static files
function serveStatic(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.statusCode = 404;
                res.end('404 Not Found');
            } else {
                res.statusCode = 500;
                res.end('500 Internal Server Error');
            }
            return;
        }
        
        res.setHeader('Content-Type', contentType);
        res.end(content);
    });
}

// Main request handler
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let pathname = url.pathname;
    
    console.log(`${req.method} ${pathname}`);
    
    // API routes
    if (pathname.startsWith('/api/')) {
        await handleAPI(req, res, pathname);
        return;
    }
    
    // Admin panel
    if (pathname === '/admin' || pathname === '/admin/') {
        pathname = '/admin.html';
    }
    
    // Default to index.html
    if (pathname === '/') {
        pathname = '/index.html';
    }
    
    // Serve static files
    const filePath = path.join(BASE_DIR, pathname);
    
    // Security: prevent directory traversal
    if (!filePath.startsWith(BASE_DIR)) {
        res.statusCode = 403;
        res.end('403 Forbidden');
        return;
    }
    
    serveStatic(res, filePath);
});

server.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║          PIXEL BREACH - Map Review Server              ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║  🎮 Game:      http://localhost:${PORT}                    ║`);
    console.log(`║  🔧 Admin:     http://localhost:${PORT}/admin              ║`);
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log('║  Press Ctrl+C to stop the server                       ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');
});
