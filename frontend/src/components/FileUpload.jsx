import { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Loader2, AlertCircle, Image as ImageIcon, Link, Database } from 'lucide-react';

const FileUpload = ({ onUploadSuccess }) => {
  const [inputMode, setInputMode] = useState('file'); // 'file' or 'url'
  const [urlInput, setUrlInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sources, setSources] = useState([]);

  const fetchSources = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/sources');
      if (response.ok) {
        const data = await response.json();
        setSources(data.sources || []);
      }
    } catch (e) {
      console.error("Failed to fetch sources", e);
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const handleFileSelect = useCallback((file) => {
    if (file && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
      setSelectedFile(file);
      setUploadStatus(null);
      setUploadProgress(0);
    } else {
      setUploadStatus({ 
        type: 'error', 
        message: 'Unsupported file type. Please select a PDF or Image (png, jpg, etc).' 
      });
    }
  }, []);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const handleUpload = useCallback(async () => {
    if (inputMode === 'file' && !selectedFile) return;
    if (inputMode === 'url' && !urlInput.trim()) return;
    if (isUploading) return;

    setIsUploading(true);
    setUploadStatus(null);
    setUploadProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      let response;

      if (inputMode === 'file') {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const endpoint = selectedFile.type.startsWith('image/') 
          ? 'http://localhost:8000/upload-image'
          : 'http://localhost:8000/upload-pdf';

        response = await fetch(endpoint, {
          method: 'POST',
          body: formData
        });
      } else {
        response = await fetch('http://localhost:8000/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urlInput })
        });
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (response.ok) {
        setUploadStatus({
          type: 'success',
          message: `Successfully processed ${inputMode === 'file' ? data.filename : data.url}`,
          details: data
        });
        if (inputMode === 'file') setSelectedFile(null);
        else setUrlInput('');
        
        // Refresh sources after an upload
        fetchSources();

        if (onUploadSuccess) onUploadSuccess(data);
      } else {
        setUploadStatus({
          type: 'error',
          message: `Upload failed: ${data.detail || 'Unknown error'}`
        });
      }
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: 'Error connecting to backend API. Make sure it is running!'
      });
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  }, [selectedFile, urlInput, inputMode, isUploading, onUploadSuccess]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2 flex items-center space-x-2">
          <Upload className="w-8 h-8 text-blue-600" />
          <span>Ingest Knowledge Base</span>
        </h2>
        <p className="text-gray-600">Provide PDF books, images, or website URLs to teach your AI Mentor.</p>
      </div>

      {/* Input Mode Toggle */}
      <div className="flex p-1 bg-gray-100 rounded-lg mb-6 w-full max-w-sm mx-auto">
        <button
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            inputMode === 'file' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setInputMode('file')}
        >
          File Upload
        </button>
        <button
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            inputMode === 'url' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setInputMode('url')}
        >
          URL Link
        </button>
      </div>

      {/* Input Area */}
      {inputMode === 'url' ? (
        <div className="border-2 border-dashed rounded-xl p-8 border-gray-300 bg-gray-50 text-center transition-all duration-300">
           <Link className="w-16 h-16 mx-auto text-blue-400 mb-4" />
           <p className="text-lg font-semibold text-gray-700 mb-2">Paste an Article or Wiki URL</p>
           <input 
              type="url" 
              placeholder="https://en.wikipedia.org/wiki/Algorithm"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full max-w-lg mt-4 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
           />
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
            dragActive 
              ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="space-y-4">
              {selectedFile.type === 'application/pdf' ? (
                <FileText className="w-16 h-16 mx-auto text-blue-600" />
              ) : (
                <ImageIcon className="w-16 h-16 mx-auto text-blue-600" />
              )}
              <div>
                <p className="text-lg font-semibold text-gray-700">{selectedFile.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              {isUploading && (
                <div className="w-full max-w-xs mx-auto">
                  <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{uploadProgress}% uploaded</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="w-16 h-16 mx-auto text-gray-400" />
              <div>
                <p className="text-lg font-semibold text-gray-700 mb-2">
                  Drop your PDF or Image here, or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Supports: PDFs, PNG, JPG, BMP
                </p>
              </div>
            </div>
          )}

          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.bmp"
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
            disabled={isUploading}
          />
          
          <label
            htmlFor="file-upload"
            className={`inline-block mt-4 px-6 py-3 rounded-xl cursor-pointer transition-all transform hover:scale-105 ${
              selectedFile
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {selectedFile ? (
              <span className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Change File</span>
              </span>
            ) : (
              <span className="flex items-center space-x-2">
                <Upload className="w-4 h-4" />
                <span>Select File</span>
              </span>
            )}
          </label>
        </div>
      )}

      {/* Upload Button */}
      {((inputMode === 'file' && selectedFile) || (inputMode === 'url' && urlInput)) && !isUploading && (
        <div className="mt-6">
          <button
            onClick={handleUpload}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-100 shadow-lg flex items-center justify-center space-x-2"
          >
            <Upload className="w-5 h-5" />
            <span>{inputMode === 'file' ? 'Upload & Process' : 'Scrape & Process'}</span>
          </button>
        </div>
      )}

      {isUploading && (
        <div className="mt-6">
          <button
            disabled
            className="w-full bg-gray-400 text-white font-semibold py-4 rounded-xl cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Processing...</span>
          </button>
        </div>
      )}

      {/* Status Messages */}
      {uploadStatus && (
        <div
          className={`mt-6 p-4 rounded-xl border-2 animate-fade-in ${
            uploadStatus.type === 'success' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-start space-x-3">
            {uploadStatus.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p
                className={`font-semibold ${
                  uploadStatus.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {uploadStatus.message}
              </p>
              {uploadStatus.details && (
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  <p>📊 Chunks created: {uploadStatus.details.chunks_created}</p>
                  <p>📝 Text length: {uploadStatus.details.text_length?.toLocaleString()} characters</p>
                  {uploadStatus.details.preview && (
                    <div className="mt-4 p-3 bg-white/60 border border-green-100 rounded-lg shadow-sm">
                      <p className="text-xs font-semibold text-green-800 mb-1">Extracted Text Preview:</p>
                      <p className="text-gray-700 italic">"{uploadStatus.details.preview}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Uploaded Sources Library */}
      {sources.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-100">
          <div className="flex items-center space-x-2 mb-4">
            <Database className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-800 text-lg">Active Knowledge Base</h3>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 max-h-48 overflow-y-auto">
            <ul className="space-y-2">
              {sources.map((src, idx) => (
                <li key={idx} className="flex items-center space-x-2 text-sm text-gray-700 bg-white p-2 rounded-md shadow-sm border border-gray-100 truncate">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="truncate" title={src}>{src}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="mt-8 p-5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-800 mb-2">💡 Tips for Best Results:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Use images with clear legible text or type</li>
              <li>• Paste URLs pointing directly to articles or wiki content</li>
              <li>• You can continuously upload different files to merge knowledge</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
