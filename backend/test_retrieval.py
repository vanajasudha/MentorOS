# Simple test script to verify document retrieval works
from query_demo import query_documents

print("Testing document retrieval (no LLM needed)...")
print("=" * 50)

# Test query
test_query = "What is machine learning?"
print(f"\nQuery: {test_query}")
print("\nRetrieving relevant documents...")

try:
    docs = query_documents(test_query, k=3)
    print(f"\nFound {len(docs)} relevant documents:\n")
    
    for i, doc in enumerate(docs, 1):
        print(f"Document {i}:")
        print(f"Source: {doc.metadata.get('source', 'Unknown')}")
        print(f"Content preview: {doc.page_content[:200]}...")
        print("-" * 50)
    
    print("\nSUCCESS: Document retrieval is working!")
    print("\nNote: To test full RAG with LLM, you need to:")
    print("1. Install Ollama from https://ollama.ai")
    print("2. Run: ollama pull llama2")
    print("3. Then run: python query_demo.py")
    
except Exception as e:
    print(f"\nERROR: {e}")

