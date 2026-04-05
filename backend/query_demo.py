from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_ollama import ChatOllama
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from pathlib import Path

# 🔥 New modules (personalized mentor)
from planner import generate_daily_plan
from activity_logger import log_activity, get_recent_activity
from patterns import detect_learning_patterns


# ----------------------------
# Vector store path
# ----------------------------
VECTOR_STORE_PATH = Path("backend/data/faiss_index")


# ----------------------------
# Load FAISS
# ----------------------------
def load_vector_store():
    if not VECTOR_STORE_PATH.exists():
        raise FileNotFoundError(
            f"Vector store not found at {VECTOR_STORE_PATH}. Run embed_and_index.py first."
        )

    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )

    vectorstore = FAISS.load_local(
        str(VECTOR_STORE_PATH),
        embeddings,
        allow_dangerous_deserialization=True,
    )

    return vectorstore


# ----------------------------
# Ollama LLM
# ----------------------------
def get_llm():
    return ChatOllama(
        model="llama2",  # change to mistral, llama3 etc.
        temperature=0.7,
        base_url="http://localhost:11434",
    )


# ----------------------------
# Intent detection
# ----------------------------
def detect_intent(query: str, llm):
    prompt = f"""
    You are an intent classifier for a personalized AI learning mentor.

    Classify the query into ONE of these:
    concept, planning, quiz, revision, motivation, roadmap, general.

    Query: {query}

    Return only the label.
    """
    response = llm.invoke(prompt)
    return response.content.strip().lower()


# ----------------------------
# Motivation
# ----------------------------
def motivation_module(activity, llm):
    prompt = f"""
    Encourage and motivate the student.

    Recent activity:
    {activity}

    Be supportive and positive.
    """
    return llm.invoke(prompt).content


# ----------------------------
# Adaptive Quiz
# ----------------------------
def quiz_module(activity, llm):
    from patterns import detect_weak_topics

    weak_topics = detect_weak_topics(activity, llm)

    prompt = f"""
    Generate a personalized quiz focusing on these weak topics:

    {weak_topics}

    Adjust difficulty:
    - Easy if student struggles
    - Harder if improving

    Include explanations.
    """

    return llm.invoke(prompt).content
# ----------------------------
# Concept (RAG)
# ----------------------------
def concept_module(query, activity, llm, vectorstore):
    prompt_template = """
    You are a personalized AI mentor.

    Student recent learning:
    {activity}

    Use the provided context to answer.

    Always:
    1. Give a short explanation.
    2. Provide a real-world example.
    3. Suggest the next learning step.
    4. Be encouraging.

    Context: {context}

    Question: {question}

    Answer:
    """

    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["context", "question", "activity"],
    )

    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    rag_chain = (
        {
            "context": retriever | format_docs,
            "question": RunnablePassthrough(),
            "activity": lambda _: activity,
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    source_docs = retriever.invoke(query)
    answer = rag_chain.invoke(query)

    return answer, source_docs


# ----------------------------
# Main Query Function
# ----------------------------
def query_with_llm(query: str, session_id: str = "default"):
    vectorstore = load_vector_store()
    llm = get_llm()

    # 1️⃣ Detect user intent
    intent = detect_intent(query, llm)

    # 2️⃣ Get recent student activity
    activity = get_recent_activity(session_id)

    # 3️⃣ Log user query
    log_activity(session_id, {"type": "chat", "query": query})

    # 🔥 PLANNING
    if intent == "planning":
        plan = generate_daily_plan(activity, llm)
        log_activity(session_id, {"type": "plan", "content": plan})
        return {"result": plan, "source_documents": []}

    # 🔥 QUIZ
    if intent == "quiz":
        quiz = quiz_module(activity, llm)
        log_activity(session_id, {"type": "quiz_generated", "content": quiz})
        return {"result": quiz, "source_documents": []}

    # 🔥 MOTIVATION
    if intent == "motivation":
        msg = motivation_module(activity, llm)
        log_activity(session_id, {"type": "motivation", "content": msg})
        return {"result": msg, "source_documents": []}
    
    #Roadmap
    if intent == "roadmap":
        from planner import generate_learning_roadmap
        roadmap = generate_learning_roadmap(activity, llm)
        log_activity(session_id, {"type": "roadmap_generated", "content": roadmap})
        return {"result": roadmap, "source_documents": []}
    # 🔥 DEFAULT → RAG concept learning
    answer, source_docs = concept_module(query, activity, llm, vectorstore)

    # Log response
    log_activity(session_id, {"type": "response", "answer": answer})

    return {"result": answer, "source_documents": source_docs}


# ----------------------------
# CLI Demo
# ----------------------------
if __name__ == "__main__":
    print("🚀 Personalized AI Mentor")
    print("=" * 50)

    session_id = "demo_user"

    while True:
        user_query = input("\nAsk a question (or 'quit'): ").strip()

        if user_query.lower() in ["quit", "exit", "q"]:
            print("Goodbye!")
            break

        if not user_query:
            continue

        try:
            result = query_with_llm(user_query, session_id)

            print(f"\nAnswer:\n{result['result']}")
            print(f"\nSources used: {len(result['source_documents'])}")

        except Exception as e:
            print(f"Error: {e}")