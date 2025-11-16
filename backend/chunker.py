# backend/chunker.py

import os
from pathlib import Path

# -----------------------------
# CONFIG
# -----------------------------
DATA_DIR = Path("backend/data")        # Folder containing .txt files
CHUNK_DIR = DATA_DIR / "chunks"       # Folder to save chunks
CHUNK_SIZE = 500                       # Number of characters per chunk

# Create chunks folder if it doesn't exist
CHUNK_DIR.mkdir(exist_ok=True)

# -----------------------------
# Find all .txt files
# -----------------------------
txt_files = list(DATA_DIR.glob("*.txt"))
if not txt_files:
    print("⚠️ No .txt files found in", DATA_DIR)
    exit()

print(f"📂 Found {len(txt_files)} text files: {[f.name for f in txt_files]}")

# -----------------------------
# Process each file
# -----------------------------
for txt_file in txt_files:
    with open(txt_file, "r", encoding="utf-8") as f:
        text = f.read().strip()
    
    if not text:
        print(f"⚠️ Skipping empty file: {txt_file.name}")
        continue

    # Split text into chunks
    chunks = [text[i:i+CHUNK_SIZE] for i in range(0, len(text), CHUNK_SIZE)]
    print(f"📄 {txt_file.name} → {len(chunks)} chunks created")

    # Save each chunk
    base_name = txt_file.stem  # filename without extension
    for idx, chunk in enumerate(chunks, start=1):
        chunk_file = CHUNK_DIR / f"{base_name}_chunk{idx}.txt"
        with open(chunk_file, "w", encoding="utf-8") as cf:
            cf.write(chunk)

print("🎯 All chunks saved in", CHUNK_DIR)
# from langchain.text_splitter import RecursiveCharacterTextSplitter
# from pathlib import Path

# DATA_DIR = Path("backend/data")
# CHUNK_DIR = DATA_DIR / "chunks"
# CHUNK_DIR.mkdir(exist_ok=True)

# txt_files = list(DATA_DIR.glob("*.txt"))

# splitter = RecursiveCharacterTextSplitter(
#     chunk_size=500,
#     chunk_overlap=50
# )

# for txt_file in txt_files:
#     text = txt_file.read_text(encoding="utf-8")
#     chunks = splitter.split_text(text)
    
#     for i, chunk in enumerate(chunks, start=1):
#         (CHUNK_DIR / f"{txt_file.stem}_chunk{i}.txt").write_text(chunk, encoding="utf-8")
