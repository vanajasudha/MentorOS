import os
import PyPDF2

def extract_text_from_pdf(pdf_path):
    """Extract text from a given PDF file."""
    text = ""
    with open(pdf_path, "rb") as file:
        reader = PyPDF2.PdfReader(file)
        for page_num, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text += page_text
            else:
                print(f"⚠️ No text found on page {page_num + 1} of {pdf_path}")
    return text

def save_text_to_file(text, output_path):
    """Save extracted text into a .txt file."""
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text)

def process_all_pdfs(data_folder="backend/data"):
    """Process all PDFs in the folder."""
    print("🔍 Looking for PDFs in:", os.path.abspath(data_folder))

    files = os.listdir(data_folder)
    print("📂 Found files:", files)

    for filename in files:
        if filename.endswith(".pdf"):
            pdf_path = os.path.join(data_folder, filename)
            txt_path = os.path.splitext(pdf_path)[0] + ".txt"

            print(f"\n📘 Processing: {filename} ...")
            try:
                text = extract_text_from_pdf(pdf_path)
                save_text_to_file(text, txt_path)
                print(f"✅ Saved extracted text to {txt_path}")
            except Exception as e:
                print(f"❌ Error processing {filename}: {e}")

if __name__== "__main__":
    process_all_pdfs()
    print("\n🎯 Done extracting all PDFs!")
