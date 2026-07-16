# 🚀 Installation Guide

## Quick Install

### Option 1: VSIX Package (Recommended)

1. Download the latest `.vsix` file from releases
2. Open VS Code
3. Extensions panel (Ctrl+Shift+X)
4. Click "..." menu → "Install from VSIX"
5. Select the downloaded file

### Option 2: Development Build

```bash
# Clone repository
git clone https://github.com/molszewski9412-source/project-brain.git
cd project-brain

# Install dependencies
npm install

# Compile
npm run compile

# Open in VS Code
code .

# Press F5 to debug (development mode)
```

---

## Requirements

| Requirement | Version | Notes |
|-------------|---------|-------|
| VS Code | 1.125.0+ | [Download](https://code.visualstudio.com/) |
| Node.js | 18+ | [Download](https://nodejs.org/) |
| Ollama | Latest | [Download](https://ollama.ai/) |
| npm | 9+ | Included with Node.js |

---

## Ollama Setup

### Install Ollama

**macOS/Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows:**
Download from [ollama.ai](https://ollama.ai/download)

### Start Ollama

```bash
ollama serve
```

### Download AI Models

```bash
# General purpose (recommended)
ollama pull llama3

# Code-specialized
ollama pull codellama

# For better results (larger model)
ollama pull mixtral
```

### Verify Installation

```bash
ollama list
```

You should see your downloaded models listed.

---

## Configuration

### VS Code Settings

Open VS Code settings (Ctrl+,) and add:

```json
{
  "projectBrain.ollamaUrl": "http://localhost:11434",
  "projectBrain.model": "llama3"
}
```

### Environment Variables (Optional)

```bash
# Linux/macOS
export OLLAMA_URL=http://localhost:11434
export PROJECT_BRAIN_MODEL=llama3

# Windows (PowerShell)
$env:OLLAMA_URL="http://localhost:11434"
$env:PROJECT_BRAIN_MODEL="llama3"
```

---

## Troubleshooting

### "Ollama is not running"

**Solution:**
```bash
ollama serve
```

Keep it running in the background.

### "Model not found"

**Solution:**
```bash
ollama pull llama3
```

### "Connection refused"

1. Check if Ollama is running
2. Verify URL in settings
3. Try: `curl http://localhost:11434`

### Extension not loading

1. Reload VS Code (Ctrl+Shift+P → "Reload Window")
2. Check Developer Tools (Help → Toggle Developer Tools)
3. Check console for errors

---

## First Time Setup

### 1. Initialize Project

1. Open your project in VS Code
2. Press Ctrl+Shift+P
3. Type "Project Brain: Initialize Project"
4. Press Enter

### 2. Analyze with AI

1. Press Ctrl+Shift+P
2. Type "Project Brain: Analyze Project"
3. Wait for AI analysis (30-60 seconds)

### 3. Start Using

- Open Kanban: Ctrl+Shift+P → "Project Brain: Open Kanban"
- Add modules, create ideas, let AI help!

---

## Updating

### From VSIX

1. Download new .vsix
2. Extensions panel → Project Brain
3. Click "Update"

### From Source

```bash
git pull
npm install
npm run compile
```

---

## Uninstallation

### Remove Extension

1. Extensions panel (Ctrl+Shift+X)
2. Find "Project Brain"
3. Click "Uninstall"
4. Reload VS Code

### Remove Project Data

```bash
rm -rf .projectbrain/
```

**Warning:** This deletes all your project data!

---

## Docker Support

### Using Ollama in Docker

```bash
# Pull Ollama image
docker pull ollama/ollama

# Run with GPU support
docker run -d --gpus all \
  -v ollama:/root/.ollama \
  -p 11434:11434 \
  ollama/ollama

# Pull model
docker exec ollama ollama pull llama3
```

### VS Code Dev Container

The project includes `.devcontainer/` configuration:

1. Install VS Code Remote - Containers extension
2. Open project in container
3. All dependencies auto-installed

---

## CI/CD Integration

### GitHub Actions

Add to your workflow:

```yaml
- name: Setup Project Brain
  uses: molszewski9412/project-brain-action@v1
  with:
    ollama-url: ${{ secrets.OLLAMA_URL }}
```

---

## Support

- **Documentation:** [docs/](docs/)
- **Issues:** [GitHub Issues](https://github.com/molszewski9412-source/project-brain/issues)
- **Discussions:** [GitHub Discussions](https://github.com/molszewski9412-source/project-brain/discussions)

---

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Storage | 500 MB | 1 GB |
| GPU | None | NVIDIA GPU (for faster AI) |

---

## Performance Tips

1. **Use local models** - Faster than cloud APIs
2. **Use smaller models** - For simple tasks
3. **Limit concurrent requests** - Reduces memory usage
4. **Clear context** - When switching projects

---

**Need help?** Open an issue on GitHub! 🚀
