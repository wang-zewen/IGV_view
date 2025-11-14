#!/bin/bash

# IGV.js One-Click Deployment Script
# This script deploys IGV.js without requiring root privileges

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "  IGV.js Deployment Script"
echo "======================================"
echo ""

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if Node.js is installed
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed!"
    echo ""
    echo "Please install Node.js first:"
    echo "  Option 1: Use nvm (recommended for users without root):"
    echo "    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "    source ~/.bashrc"
    echo "    nvm install --lts"
    echo ""
    echo "  Option 2: Download from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js $NODE_VERSION is installed"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed!"
    exit 1
fi

NPM_VERSION=$(npm --version)
print_success "npm $NPM_VERSION is installed"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Create data directory
DATA_DIR="${HOME}/igv_data"
if [ ! -d "$DATA_DIR" ]; then
    echo ""
    echo "Creating data directory at $DATA_DIR..."
    mkdir -p "$DATA_DIR"
    print_success "Data directory created at $DATA_DIR"
else
    print_info "Data directory already exists at $DATA_DIR"
fi

# Create example directory structure
mkdir -p "$DATA_DIR/genomes"
mkdir -p "$DATA_DIR/tracks"
mkdir -p "$DATA_DIR/annotations"

# Create a simple README in data directory
cat > "$DATA_DIR/README.txt" << 'EOF'
IGV Data Directory
==================

Place your genomics files in this directory:

- genomes/    : Reference genome files (.fa, .fasta, .fai)
- tracks/     : Track files (.bam, .bai, .vcf, .vcf.gz, .bed, .bw, etc.)
- annotations/: Annotation files (.gff, .gff3, .gtf)

Supported file formats:
- BAM/CRAM alignment files (with index files .bai/.crai)
- VCF variant files (with index .tbi if compressed)
- BED annotation files
- BigWig/Wig coverage files
- GFF/GTF gene annotation files
- FASTA reference genomes (with .fai index)

Example file structure:
  igv_data/
    ├── genomes/
    │   ├── hg38.fa
    │   └── hg38.fa.fai
    └── tracks/
        ├── sample1.bam
        ├── sample1.bam.bai
        ├── variants.vcf.gz
        └── variants.vcf.gz.tbi
EOF

print_success "Example directory structure created in $DATA_DIR"

# Find an available port
find_available_port() {
    local port=8080
    while lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; do
        port=$((port + 1))
    done
    echo $port
}

AVAILABLE_PORT=$(find_available_port)

# Create start script
cat > "$SCRIPT_DIR/start.sh" << EOF
#!/bin/bash
cd "$SCRIPT_DIR"
PORT=$AVAILABLE_PORT npm start
EOF

chmod +x "$SCRIPT_DIR/start.sh"

# Create stop script
cat > "$SCRIPT_DIR/stop.sh" << 'EOF'
#!/bin/bash
PID=$(lsof -ti:8080) 2>/dev/null
if [ -n "$PID" ]; then
    kill $PID
    echo "Server stopped (PID: $PID)"
else
    echo "No server running on port 8080"
fi
EOF

chmod +x "$SCRIPT_DIR/stop.sh"

# Print success message
echo ""
echo "======================================"
print_success "Deployment completed successfully!"
echo "======================================"
echo ""
echo "Data directory: $DATA_DIR"
echo "Server port: $AVAILABLE_PORT"
echo ""
echo "Next steps:"
echo "  1. Place your IGV files in $DATA_DIR"
echo "  2. Start the server:"
echo "     ./start.sh"
echo "  3. Open your browser and visit:"
echo "     http://localhost:$AVAILABLE_PORT"
echo ""
echo "To stop the server, run:"
echo "  ./stop.sh"
echo ""
echo "For custom configuration, edit config.js"
echo "======================================"
