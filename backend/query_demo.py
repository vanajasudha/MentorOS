# backend/query_demo.py

from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_ollama import ChatOllama
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from pathlib import Path
import os

VECTOR_STORE_PATH = Path("backend/data/faiss_index")

def load_vector_store():
    """Load the FAISS vector store."""
    if not VECTOR_STORE_PATH.exists():
        raise FileNotFoundError(f"Vector store not found at {VECTOR_STORE_PATH}. Please run embed_and_index.py first.")
    
    # Use the same local embeddings model
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={'device': 'cpu'},
        encode_kwargs={'normalize_embeddings': True}
    )
    vectorstore = FAISS.load_local(str(VECTOR_STORE_PATH), embeddings, allow_dangerous_deserialization=True)
    return vectorstore

def query_documents(query: str, k: int = 3):
    """Query the vector store and return relevant documents."""
    vectorstore = load_vector_store()
    docs = vectorstore.similarity_search(query, k=k)
    return docs

def query_with_llm(query: str, chat_history: list = None):
    """Query using RAG with LLM."""
    vectorstore = load_vector_store()
    
    # Use local Ollama LLM (no API needed!)
    # Make sure Ollama is running and you have a model downloaded
    # Run: ollama pull llama2 (or mistral, or any other model)
    try:
        llm = ChatOllama(
            model="llama2",  # Change to "mistral", "llama3", etc. based on what you have
            temperature=0.7,
            base_url="http://localhost:11434"  # Default Ollama URL
        )
    except Exception as e:
        raise Exception(f"Could not connect to Ollama. Make sure Ollama is installed and running. Error: {e}")
    
    # Create a prompt template
    prompt_template = """Use the following pieces of context to answer the question at the end.
    If you don't know the answer, just say that you don't know, don't try to make up an answer.

    Context: {context}

    Question: {question}
    
    Answer:"""
    
    prompt = PromptTemplate(
        template=prompt_template, input_variables=["context", "question"]
    )
    
    # Create retriever
    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
    
    # Create RAG chain using LangChain 1.0 style
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)
    
    rag_chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
    
    # Get source documents
    source_docs = retriever.invoke(query)
    
    # Get answer
    answer = rag_chain.invoke(query)
    
    return {
        "result": answer,
        "source_documents": source_docs
    }

if __name__ == "__main__":
    print("AI Mentor Query Demo")
    print("=" * 50)
    print("\nNote: This requires Ollama to be installed and running.")
    print("If you haven't installed Ollama yet, see LOCAL_SETUP.md")
    print("=" * 50)
    
    while True:
        user_query = input("\nAsk a question (or 'quit' to exit): ").strip()
        
        if user_query.lower() in ["quit", "exit", "q"]:
            print("Goodbye!")
            break
        
        if not user_query:
            continue
        
        try:
            result = query_with_llm(user_query)
            print(f"\nAnswer:\n{result['result']}")
            print(f"\nSources: {len(result['source_documents'])} documents used")
        except Exception as e:
            print(f"Error: {e}")
            print("\nTroubleshooting:")
            print("1. Make sure Ollama is installed: https://ollama.ai")
            print("2. Make sure Ollama is running: ollama serve")
            print("3. Download a model: ollama pull llama2")

