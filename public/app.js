// IGV.js Web Application
let igvBrowser = null;
let availableFiles = [];
let selectedFile = null;
let availableGenomes = [];

// Initialize IGV Browser
async function initIGV() {
    const genomeSelector = document.getElementById('genome-selector');
    const selectedValue = genomeSelector.value;

    if (igvBrowser) {
        // Remove existing browser
        igvBrowser.remove();
        igvBrowser = null;
    }

    let options;

    // Check if this is a custom local genome
    if (selectedValue.startsWith('custom:')) {
        const genomePath = selectedValue.replace('custom:', '');
        const genome = availableGenomes.find(g => g.path === genomePath);

        if (!genome) {
            showError('未找到所选基因组文件');
            return;
        }

        const baseUrl = window.location.origin;
        const fastaUrl = `${baseUrl}/data/${genome.path}`;
        const indexUrl = genome.hasIndex ? `${fastaUrl}.fai` : undefined;

        options = {
            reference: {
                id: genome.displayName,
                name: genome.displayName,
                fastaURL: fastaUrl,
                indexURL: indexUrl
            },
            locus: 'all',
            tracks: []
        };

        console.log('Loading custom genome:', genome.displayName);
    } else {
        // Use built-in genome
        options = {
            genome: selectedValue,
            locus: selectedValue === 'hg38' || selectedValue === 'hg19' ? 'chr1:155,000,000-155,500,000' : 'chr1:1-1000000',
            tracks: []
        };

        console.log('Loading built-in genome:', selectedValue);
    }

    try {
        igvBrowser = await igv.createBrowser(document.getElementById('igv-div'), options);
        console.log('IGV Browser initialized successfully');
        hideInfoBox();
    } catch (error) {
        console.error('Error initializing IGV:', error);
        showError('初始化 IGV 失败: ' + error.message);
    }
}

// Load available genomes from server
async function loadGenomes() {
    try {
        const response = await fetch('/api/genomes');
        const data = await response.json();
        availableGenomes = data.genomes;

        // Update genome selector with custom genomes
        const genomeSelector = document.getElementById('genome-selector');

        // Remove any previously added custom genomes
        const customOptions = genomeSelector.querySelectorAll('option[data-custom="true"]');
        customOptions.forEach(opt => opt.remove());

        // Add separator and custom genomes if any exist
        if (availableGenomes.length > 0) {
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.textContent = '--- 本地基因组 ---';
            genomeSelector.appendChild(separator);

            availableGenomes.forEach(genome => {
                const option = document.createElement('option');
                option.value = 'custom:' + genome.path;
                option.textContent = `${genome.displayName}${genome.hasIndex ? '' : ' (无索引)'}`;
                option.setAttribute('data-custom', 'true');
                genomeSelector.appendChild(option);
            });

            console.log(`Found ${availableGenomes.length} custom genome(s)`);
        }
    } catch (error) {
        console.error('Error loading genomes:', error);
    }
}

// Load available files from server
async function loadFiles() {
    const fileBrowser = document.getElementById('file-browser');
    fileBrowser.innerHTML = '<div class="loading">加载中...</div>';

    try {
        const response = await fetch('/api/files');
        const data = await response.json();

        availableFiles = data.files;
        displayFiles(availableFiles);

        // Load available genomes
        await loadGenomes();

        // Initialize IGV if not already done
        if (!igvBrowser) {
            await initIGV();
        }
    } catch (error) {
        console.error('Error loading files:', error);
        fileBrowser.innerHTML = '<div class="error">加载文件失败: ' + error.message + '</div>';
    }
}

// Display files in the sidebar
function displayFiles(files) {
    const fileBrowser = document.getElementById('file-browser');

    if (files.length === 0) {
        fileBrowser.innerHTML = `
            <div class="info-box">
                <p>未找到数据文件。</p>
                <p style="margin-top: 0.5rem;">请将基因组数据文件放置在:<br><code>${window.location.origin}/data/</code></p>
            </div>
        `;
        return;
    }

    // Group files by directory
    const fileTree = {};
    files.forEach(file => {
        if (file.type === 'file') {
            const dir = file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : 'root';
            if (!fileTree[dir]) {
                fileTree[dir] = [];
            }
            fileTree[dir].push(file);
        }
    });

    let html = '';

    // Display files grouped by directory
    Object.keys(fileTree).sort().forEach(dir => {
        html += `<div style="margin-bottom: 1.5rem;">`;
        html += `<div style="font-weight: 600; color: #666; margin-bottom: 0.5rem; font-size: 0.85rem;">📂 ${dir}</div>`;

        fileTree[dir].forEach(file => {
            const icon = getFileIcon(file.name);
            const size = formatFileSize(file.size);
            html += `
                <div class="file-item" onclick="selectFile('${file.path}')">
                    <div class="file-icon">${icon}</div>
                    <div class="file-info">
                        <div class="file-name">${file.name}</div>
                        <div class="file-meta">${size}</div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
    });

    fileBrowser.innerHTML = html;
}

// Get appropriate icon for file type
function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'bam': '📊',
        'bai': '🔍',
        'vcf': '🧬',
        'gz': '📦',
        'bed': '📋',
        'gff': '📄',
        'gff3': '📄',
        'gtf': '📄',
        'fa': '🧬',
        'fasta': '🧬',
        'fai': '🔍',
        'bw': '📈',
        'bigwig': '📈',
        'wig': '📈'
    };
    return icons[ext] || '📄';
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Select a file
function selectFile(filePath) {
    // Remove previous selection
    document.querySelectorAll('.file-item').forEach(item => {
        item.classList.remove('selected');
    });

    // Add selection to clicked item
    event.currentTarget.classList.add('selected');

    selectedFile = availableFiles.find(f => f.path === filePath);
    document.getElementById('add-track-btn').disabled = false;

    console.log('Selected file:', selectedFile);
}

// Add selected track to IGV
async function addSelectedTrack() {
    if (!selectedFile || !igvBrowser) {
        return;
    }

    try {
        const trackConfig = createTrackConfig(selectedFile);
        await igvBrowser.loadTrack(trackConfig);
        console.log('Track loaded:', selectedFile.name);

        // Show success message
        showMessage('成功加载轨道: ' + selectedFile.name);

        // Clear selection
        selectedFile = null;
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.getElementById('add-track-btn').disabled = true;

    } catch (error) {
        console.error('Error loading track:', error);
        showError('加载轨道失败: ' + error.message);
    }
}

// Create track configuration based on file type
function createTrackConfig(file) {
    const baseUrl = window.location.origin;
    const fileUrl = `${baseUrl}/data/${file.path}`;
    const ext = file.name.split('.').pop().toLowerCase();

    const config = {
        name: file.name,
        url: fileUrl
    };

    // Set track type based on file extension
    if (file.name.endsWith('.bam')) {
        config.type = 'alignment';
        config.format = 'bam';
        // Look for index file
        const indexFile = availableFiles.find(f => f.path === file.path + '.bai');
        if (indexFile) {
            config.indexURL = `${baseUrl}/data/${indexFile.path}`;
        }
    } else if (file.name.endsWith('.vcf.gz')) {
        config.type = 'variant';
        config.format = 'vcf';
        // Look for index file
        const indexFile = availableFiles.find(f => f.path === file.path + '.tbi');
        if (indexFile) {
            config.indexURL = `${baseUrl}/data/${indexFile.path}`;
        }
    } else if (file.name.endsWith('.vcf')) {
        config.type = 'variant';
        config.format = 'vcf';
    } else if (file.name.endsWith('.bed')) {
        config.type = 'annotation';
        config.format = 'bed';
    } else if (file.name.endsWith('.gff') || file.name.endsWith('.gff3')) {
        config.type = 'annotation';
        config.format = 'gff3';
    } else if (file.name.endsWith('.gtf')) {
        config.type = 'annotation';
        config.format = 'gtf';
    } else if (file.name.endsWith('.bw') || file.name.endsWith('.bigwig') || file.name.endsWith('.bigWig')) {
        config.type = 'wig';
        config.format = 'bigwig';
    } else if (file.name.endsWith('.wig')) {
        config.type = 'wig';
        config.format = 'wig';
    }

    return config;
}

// Show error message
function showError(message) {
    const infoBox = document.getElementById('info-box');
    infoBox.className = 'error';
    infoBox.innerHTML = `<strong>错误:</strong> ${message}`;
    infoBox.style.display = 'block';
}

// Show success message
function showMessage(message) {
    const infoBox = document.getElementById('info-box');
    infoBox.className = 'info-box';
    infoBox.innerHTML = `<p>✓ ${message}</p>`;
    infoBox.style.display = 'block';

    // Hide after 3 seconds
    setTimeout(() => {
        infoBox.style.display = 'none';
    }, 3000);
}

// Hide info box
function hideInfoBox() {
    const infoBox = document.getElementById('info-box');
    infoBox.style.display = 'none';
}

// Handle genome change
document.getElementById('genome-selector').addEventListener('change', async () => {
    await initIGV();
});

// Initialize on page load
window.addEventListener('load', () => {
    loadFiles();
});
