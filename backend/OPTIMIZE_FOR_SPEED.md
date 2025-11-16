# Optimizing AI Mentor for Slower Systems

## Problem
If your system is slow, LLM responses can take a very long time or timeout. This guide helps you optimize for speed.

## Solution: Use Smaller, Faster Models

### Recommended Fast Models (in order of speed):

1. **tinyllama** (637MB) - ⚡ FASTEST
   ```bash
   ollama pull tinyllama
   ```

2. **llama3.2:1b** (1.3GB) - ⚡ Very Fast
   ```bash
   ollama pull llama3.2:1b
   ```

3. **phi3:mini** (2.3GB) - ⚡ Fast
   ```bash
   ollama pull phi3:mini
   ```

4. **llama3.2:3b** (2GB) - ⚡ Medium
   ```bash
   ollama pull llama3.2:3b
   ```

### Slower Models (better quality but slower):

- **llama2** (3.8GB) - Current default
- **mistral** (4.1GB)
- **llama3** (4.7GB)

## How It Works

The backend automatically detects and uses the fastest available model. It tries models in this order:
1. llama3.2:1b
2. phi3:mini
3. tinyllama
4. llama3.2:3b
5. llama2 (fallback)

## Steps to Optimize

1. **Pull a faster model:**
   ```bash
   ollama pull llama3.2:1b
   ```

2. **Restart the backend:**
   - Stop the backend (Ctrl+C)
   - Start it again:
   ```bash
   uvicorn backend.app:app --reload
   ```

3. **Check which model is being used:**
   - Look at the backend terminal - it will say "Using model: llama3.2:1b"

## Performance Tips

- **Smaller models = Faster responses** but slightly lower quality
- **Larger models = Better quality** but slower responses
- For most educational questions, smaller models work great!

## Timeout Settings

- Frontend timeout: 100 seconds
- Backend timeout: 90 seconds
- These are optimized for slower systems

