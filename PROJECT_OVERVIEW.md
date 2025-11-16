# 🎓 AI Mentor - Project Overview

## Executive Summary

**AI Mentor** is a context-aware learning assistant designed to help college students master their course materials. By combining document processing, vector embeddings, and large language models, it provides an intelligent tutoring experience that understands and responds to questions based on actual course content.

## 🎯 Problem Statement

College students face several challenges:
- **Information Overload**: Hundreds of pages of textbooks and lecture notes
- **Lack of Personalized Help**: Limited access to tutors or office hours
- **Inefficient Study Methods**: Passive reading without active engagement
- **No Progress Tracking**: Difficulty measuring learning progress
- **Isolated Learning**: Limited tools for self-assessment

## 💡 Solution

AI Mentor addresses these challenges by providing:

1. **24/7 Intelligent Tutoring**: Ask questions anytime about your course materials
2. **Context-Aware Responses**: Answers based on your actual textbooks and notes
3. **Active Learning Tools**: Auto-generated quizzes and summaries
4. **Progress Tracking**: Monitor your learning activities and performance
5. **Personalized Experience**: Session memory that remembers your conversation

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│                    (React + Tailwind CSS)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Chat   │  │  Upload  │  │   Quiz   │  │ Progress │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI)                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  API Endpoints                                            │  │
│  │  - /query (Chat)                                         │  │
│  │  - /upload-pdf (Document Upload)                         │  │
│  │  - /generate-quiz (Quiz Generation)                      │  │
│  │  - /generate-summary (Summaries)                         │  │
│  │  - /progress (Tracking)                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  FAISS Vector   │  │   LangChain     │  │  Session        │
│  Database       │  │   Framework     │  │  Management     │
│                 │  │                 │  │                 │
│  - Embeddings   │  │  - RAG Chain    │  │  - Memory       │
│  - Similarity   │  │  - Prompts      │  │  - Progress     │
│    Search       │  │  - LLM Calls    │  │  - History      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              │
                              │
                              ▼
                     ┌─────────────────┐
                     │   OpenAI API    │
                     │                 │
                     │  - GPT-3.5      │
                     │  - Embeddings   │
                     └─────────────────┘
```

## 🔄 Data Flow

### 1. Document Upload Flow
```
PDF Upload → Text Extraction (PyPDF2) → Text Chunking (LangChain) 
→ Generate Embeddings (OpenAI) → Store in Vector DB (FAISS)
```

### 2. Query Flow
```
User Question → Embed Query (OpenAI) → Search Vector DB (FAISS) 
→ Retrieve Relevant Chunks → LLM Processing (GPT) → Response
```

### 3. Quiz Generation Flow
```
Topic Input → Search Relevant Content (FAISS) → Generate Questions (GPT) 
→ Display Quiz → User Answers → Calculate Score → Save Progress
```

## 🎨 Key Components

### Backend Components

#### 1. `ingest.py`
- **Purpose**: Extract text from PDF files
- **Technology**: PyPDF2
- **Output**: `.txt` files in `backend/data/`

#### 2. `chunker.py`
- **Purpose**: Split text into manageable chunks
- **Technology**: Custom chunking or LangChain splitter
- **Output**: Chunk files in `backend/data/chunks/`

#### 3. `embed_and_index.py`
- **Purpose**: Create embeddings and vector store
- **Technology**: OpenAI Embeddings + FAISS
- **Output**: FAISS index in `backend/data/faiss_index/`

#### 4. `app.py`
- **Purpose**: Main API server
- **Technology**: FastAPI
- **Features**:
  - Document upload endpoint
  - Query processing with RAG
  - Quiz generation
  - Summary generation
  - Progress tracking
  - Session management

#### 5. `query_demo.py`
- **Purpose**: Test queries from command line
- **Technology**: LangChain + OpenAI
- **Use**: Development and testing

### Frontend Components

#### 1. `ChatBox.jsx`
- Real-time chat interface
- Message history
- Typing indicators
- Session integration

#### 2. `FileUpload.jsx`
- Drag-and-drop file upload
- Upload progress
- File validation
- Success/error handling

#### 3. `QuizSection.jsx`
- Quiz generation form
- Multiple choice questions
- Answer selection
- Score calculation
- Explanations display

#### 4. `ProgressTracker.jsx`
- Activity statistics
- Timeline view
- Performance metrics
- Session information

#### 5. `App.jsx`
- Main application container
- Tab navigation
- Session management
- Backend status monitoring

## 🚀 Workflow

### Initial Setup
1. Install dependencies (Python + Node.js)
2. Configure OpenAI API key
3. Start backend server
4. Start frontend server

### Using the Application

#### First Time User
1. **Upload Materials**: Upload course PDFs
2. **Wait for Processing**: System creates embeddings
3. **Start Chatting**: Ask questions about the material
4. **Take Quizzes**: Generate practice quizzes
5. **Track Progress**: View learning statistics

#### Returning User
1. **Continue Session**: Session automatically restored
2. **Ask Questions**: Previous context remembered
3. **Review Progress**: Check past activities
4. **Study More**: Generate new quizzes/summaries

## 📊 Implementation Details

### RAG (Retrieval-Augmented Generation)

```python
# Simplified RAG Pipeline

1. Document Processing:
   - PDF → Text → Chunks → Embeddings → Vector Store

2. Query Processing:
   - User Query → Embed → Search Vector Store → Get Top K Chunks

3. Response Generation:
   - Context (Chunks) + Query → LLM → Answer
```

### Session Management

```javascript
// Session Flow
1. Generate/Load Session ID (localStorage)
2. All requests include session_id
3. Backend maintains conversation memory
4. Progress tracked per session
5. Session persisted to disk
```

### Vector Search

```python
# FAISS Similarity Search
1. Convert query to vector (embedding)
2. Compare with all stored vectors
3. Return top K most similar chunks
4. Use chunks as context for LLM
```

## 🔧 Configuration

### Environment Variables
```bash
# backend/.env
OPENAI_API_KEY=sk-...        # Required
OPENAI_MODEL=gpt-3.5-turbo   # Optional
BACKEND_PORT=8000             # Optional
```

### Customization Points
- **Chunk Size**: Modify in `chunker.py`
- **Model Selection**: Change in `app.py`
- **Number of Retrieved Chunks**: Adjust `k` parameter
- **Temperature**: Control creativity in responses
- **Frontend Theme**: Modify Tailwind classes

## 📈 Performance Considerations

### Optimization Strategies
1. **Chunking**: Optimal size balances context and speed
2. **Caching**: Store embeddings to avoid regeneration
3. **Batch Processing**: Process multiple chunks simultaneously
4. **Token Limits**: Stay within model context windows
5. **Vector Search**: FAISS is optimized for speed

### Scalability
- **Current**: Single user, local storage
- **Future**: 
  - Multi-user with database
  - Cloud storage for documents
  - Redis for session management
  - Load balancing for API

## 🔒 Security

### Current Measures
- API keys in environment variables
- CORS configuration
- Input validation (Pydantic)
- Session isolation

### Production Requirements
- User authentication
- API rate limiting
- HTTPS/TLS encryption
- Database security
- Input sanitization
- Audit logging

## 💰 Cost Estimation

### OpenAI API Costs
- **Embeddings**: ~$0.0001 per 1K tokens
- **GPT-3.5**: ~$0.002 per 1K tokens
- **Example Usage**:
  - 100 pages PDF processing: ~$0.50
  - 50 chat queries: ~$0.10-0.20
  - 10 quizzes: ~$0.20-0.40
  - **Total**: ~$0.80-1.10 per week

### Infrastructure
- **Development**: Free (localhost)
- **Production**: $10-50/month (hosting + database)

## 🎯 Success Metrics

### User Engagement
- Number of questions asked
- Quizzes completed
- Documents uploaded
- Session duration

### Learning Outcomes
- Quiz scores
- Improvement over time
- Topics covered
- Study consistency

### Technical Metrics
- Response time
- Error rates
- API usage
- Storage utilization

## 🚀 Deployment Options

### Option 1: Simple Deployment
- **Backend**: Render, Railway, or Heroku
- **Frontend**: Vercel or Netlify
- **Cost**: ~$10-20/month

### Option 2: Cloud Platform
- **Platform**: AWS, Google Cloud, or Azure
- **Backend**: Elastic Beanstalk / App Engine
- **Frontend**: S3 + CloudFront / Cloud Storage
- **Database**: RDS / Cloud SQL
- **Cost**: ~$30-100/month

### Option 3: Containerized
- **Container**: Docker + Kubernetes
- **Orchestration**: K8s cluster
- **Storage**: Object storage
- **Cost**: Variable based on usage

## 🔮 Future Roadmap

### Phase 1: Core Features (Completed ✅)
- [x] PDF upload and processing
- [x] Chat interface with RAG
- [x] Quiz generation
- [x] Summary generation
- [x] Progress tracking

### Phase 2: Enhanced Features (Next)
- [ ] User authentication
- [ ] Multiple file format support
- [ ] Video transcript processing
- [ ] Flashcard generation
- [ ] Advanced analytics

### Phase 3: Advanced Features
- [ ] Mobile app
- [ ] Collaborative learning
- [ ] Voice interaction
- [ ] Personalized learning paths
- [ ] Integration with LMS

### Phase 4: Enterprise Features
- [ ] Multi-tenant support
- [ ] Admin dashboard
- [ ] Analytics platform
- [ ] API marketplace
- [ ] White-label solution

## 📚 Learning Outcomes

By building this project, you'll learn:

1. **Full-Stack Development**
   - React frontend development
   - FastAPI backend development
   - REST API design

2. **AI/ML Integration**
   - Working with LLMs
   - Vector databases
   - RAG architecture
   - Prompt engineering

3. **Modern Tools**
   - Vite and modern JS
   - Tailwind CSS
   - LangChain framework
   - OpenAI API

4. **Best Practices**
   - Code organization
   - Error handling
   - User experience
   - Documentation

## 🤝 Contributing

### Areas for Contribution
- Bug fixes and improvements
- New features
- Documentation
- Testing
- UI/UX enhancements
- Performance optimization

### Development Workflow
1. Fork repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📝 Documentation

- **README.md**: Quick start guide
- **SETUP_GUIDE.md**: Detailed setup instructions
- **FEATURES.md**: Feature documentation
- **PROJECT_OVERVIEW.md**: This file
- **API Docs**: Available at `/docs` endpoint

## 🎓 Use Cases

### For Students
- Study for exams
- Understand complex topics
- Practice with quizzes
- Review course materials
- Track study progress

### For Educators
- Create study materials
- Generate practice questions
- Assess understanding
- Provide 24/7 support
- Track student engagement

### For Institutions
- Supplement traditional learning
- Reduce teaching assistant workload
- Provide scalable tutoring
- Improve learning outcomes
- Gather learning analytics

## 🌟 Unique Selling Points

1. **Context-Aware**: Uses actual course materials, not generic knowledge
2. **Privacy-Focused**: Data stays on your server
3. **Customizable**: Adapt to any course or subject
4. **Cost-Effective**: Cheaper than human tutors
5. **24/7 Available**: Learn at your own pace
6. **Active Learning**: Quizzes and summaries promote engagement
7. **Progress Tracking**: Measure and visualize learning
8. **Modern UI**: Beautiful, intuitive interface

---

## 📞 Support & Contact

For questions, issues, or contributions:
- Check documentation first
- Search existing issues
- Open a new issue if needed
- Reach out to maintainers

---

**Built with ❤️ for learners everywhere**

*Last Updated: November 2025*

