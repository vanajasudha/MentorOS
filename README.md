# 🎓 AI Mentor - Context-Aware Learning Assistant

A comprehensive AI-powered chatbot that acts as a personal mentor for college students. Upload course materials, ask questions, generate quizzes, and get intelligent summaries.

## ✨ Features

- 📚 **Document Upload**: Upload PDF course materials (textbooks, lecture notes, etc.)
- 💬 **Intelligent Chat**: Ask questions about your course content with context-aware responses
- 🎯 **Quiz Generation**: Automatically generate practice quizzes on any topic
- 📄 **Smart Summaries**: Get concise summaries of complex topics
- 🧠 **Session Memory**: The AI remembers your conversation history
- 📊 **Progress Tracking**: Track your learning activities and quiz scores
- 🔄 **RAG Implementation**: Retrieval-Augmented Generation for accurate answers

## 🛠️ Tech Stack

### Backend
- **Python 3.10+**
- **FastAPI**: Modern web framework for building APIs
- **LangChain**: Framework for LLM applications
- **OpenAI GPT-3.5/4**: Language model
- **FAISS**: Vector database for document embeddings
- **PyPDF2**: PDF text extraction

### Frontend
- **React 18**: UI library
- **Vite**: Fast build tool
- **Tailwind CSS**: Utility-first CSS framework
- **Modern ES6+**: JavaScript features

## 📁 Project Structure

```
ai_mentor/
├── backend/
│   ├── data/
│   │   ├── *.pdf              # Your PDF files
│   │   ├── *.txt              # Extracted text
│   │   ├── chunks/            # Text chunks for embeddings
│   │   └── faiss_index/       # Vector store
│   ├── sessions/              # Session data storage
│   ├── progress/              # User progress tracking
│   ├── ingest.py              # PDF to text extraction
│   ├── chunker.py             # Text chunking
│   ├── embed_and_index.py     # Create embeddings & vector store
│   ├── query_demo.py          # Query testing script
│   ├── app.py                 # FastAPI main application
│   └── requirements.txt       # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatBox.jsx    # Chat interface
│   │   │   ├── FileUpload.jsx # PDF upload component
│   │   │   └── QuizSection.jsx # Quiz & summary generator
│   │   ├── styles/
│   │   │   └── globals.css    # Global styles
│   │   ├── App.jsx            # Main application
│   │   └── main.jsx           # Entry point
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- OpenAI API key

### 1. Backend Setup

```bash
# Navigate to project root
cd ai_mentor

# Create and activate virtual environment (if not already done)
python -m venv venv

# On Windows:
venv\Scripts\activate

# On Mac/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r backend/requirements.txt
```

### 2. Configure OpenAI API Key

Create a `.env` file in the `backend/` directory:

```bash
# backend/.env
OPENAI_API_KEY=your_openai_api_key_here
```

**Get your API key from:** https://platform.openai.com/api-keys

### 3. Process Existing PDFs (Optional)

If you already have PDFs in `backend/data/`, process them:

```bash
# Extract text from PDFs
python backend/ingest.py

# Create text chunks
python backend/chunker.py

# Generate embeddings and create vector store
python backend/embed_and_index.py
```

### 4. Start the Backend Server

```bash
# Start FastAPI server
uvicorn backend.app:app --reload

# Server will run at: http://localhost:8000
```

### 5. Frontend Setup

Open a new terminal:

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Frontend will open at: http://localhost:3000
```

## 📖 Usage Guide

### 1. Upload Course Materials

1. Click the **"Upload"** tab
2. Drag & drop or select a PDF file
3. Click **"Upload & Process"**
4. Wait for processing to complete

### 2. Chat with AI Mentor

1. Click the **"Chat"** tab
2. Type your question about the course material
3. Get intelligent, context-aware responses
4. The AI remembers your conversation history

### 3. Generate Quizzes

1. Click the **"Study Tools"** tab
2. Enter a topic (e.g., "Machine Learning Algorithms")
3. Select number of questions
4. Click **"Generate Quiz"**
5. Answer questions and submit for instant feedback

### 4. Get Summaries

1. In the **"Study Tools"** tab
2. Enter a topic
3. Click **"Get Summary"**
4. Receive a comprehensive summary based on your materials

## 🔧 API Endpoints

### Backend API (http://localhost:8000)

- `GET /` - API status and endpoint list
- `POST /upload-pdf` - Upload and process PDF files
- `POST /query` - Ask questions (with session memory)
- `POST /generate-quiz` - Generate practice quizzes
- `POST /generate-summary` - Get topic summaries
- `POST /progress` - Update user progress
- `GET /session/{session_id}` - Get session information
- `GET /sessions` - List all active sessions

### API Documentation

Visit http://localhost:8000/docs for interactive API documentation (Swagger UI)

## 🧪 Testing the Backend

Test the query system directly:

```bash
python backend/query_demo.py
```

This will open an interactive prompt where you can test queries.

## 📝 How It Works

### RAG (Retrieval-Augmented Generation) Pipeline

1. **Document Ingestion**: PDFs are converted to text
2. **Chunking**: Text is split into manageable chunks
3. **Embedding**: Chunks are converted to vector embeddings using OpenAI
4. **Vector Storage**: Embeddings stored in FAISS for fast retrieval
5. **Query Processing**: User questions are embedded and similar chunks retrieved
6. **Response Generation**: LLM generates answers using retrieved context

### Session Management

- Each user gets a unique session ID (stored in browser localStorage)
- Conversation history is maintained per session
- Progress and activities are tracked
- Sessions persist across page refreshes

## 🎯 Key Features Explained

### Context-Aware Chat
- Uses RAG to find relevant information from your documents
- Maintains conversation context for follow-up questions
- Falls back to general knowledge when documents don't contain the answer

### Quiz Generation
- Creates multiple-choice questions based on your materials
- Provides explanations for correct answers
- Tracks quiz scores for progress monitoring

### Intelligent Summaries
- Retrieves relevant sections from your documents
- Generates structured summaries with key concepts
- Shows sources used for transparency

### Progress Tracking
- Records all activities (queries, quizzes, summaries)
- Maintains session history
- Can be extended for detailed analytics

## 🔒 Security Notes

- Never commit your `.env` file or API keys
- Keep your `OPENAI_API_KEY` secure
- For production, add proper authentication
- Use environment variables for sensitive data

## 🐛 Troubleshooting

### Backend won't start
- Check if Python virtual environment is activated
- Verify all dependencies are installed: `pip install -r backend/requirements.txt`
- Ensure OpenAI API key is set in `.env` file

### Frontend won't start
- Verify Node.js is installed: `node --version`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check for port conflicts (default: 3000)

### Vector store not found
- Make sure you've run the processing steps:
  1. `python backend/ingest.py`
  2. `python backend/chunker.py`
  3. `python backend/embed_and_index.py`

### No response from AI
- Check backend server is running
- Verify OpenAI API key is valid
- Check browser console and backend logs for errors

## 🚀 Deployment

### Backend (FastAPI)
- Deploy to services like Render, Railway, or AWS
- Set environment variables in deployment platform
- Use production ASGI server (e.g., Gunicorn)

### Frontend (React + Vite)
- Build: `npm run build`
- Deploy `dist/` folder to Vercel, Netlify, or similar
- Update API URL in production

## 📊 Future Enhancements

- [ ] Add user authentication
- [ ] Support more file formats (Word, PowerPoint, etc.)
- [ ] Video content processing (YouTube transcripts)
- [ ] Flashcard generation
- [ ] Study schedule recommendations
- [ ] Multi-language support
- [ ] Mobile app version
- [ ] Collaborative learning features
- [ ] Advanced analytics dashboard
- [ ] Voice interaction

## 🤝 Contributing

This is a learning project. Feel free to:
- Report bugs
- Suggest features
- Improve documentation
- Submit pull requests

## 📄 License

This project is for educational purposes.

## 🙏 Acknowledgments

- OpenAI for GPT models
- LangChain for the RAG framework
- FastAPI for the excellent web framework
- React and Vite for frontend tooling

## 💡 Tips for Best Results

1. **Upload Quality PDFs**: Better text extraction = Better answers
2. **Be Specific**: Ask clear, focused questions
3. **Upload Multiple Sources**: More context = More accurate responses
4. **Regular Quizzes**: Test your understanding frequently
5. **Use Summaries**: Review key concepts before exams

---

**Made with ❤️ for students by students**

For questions or support, please open an issue on GitHub.

