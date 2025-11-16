// Enhanced FileUpload component with drag-and-drop, progress indicators, and better UX
import { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';

const FileUpload = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = useCallback((file) => {
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setUploadStatus(null);
      setUploadProgress(0);
    } else {
      setUploadStatus({ 
        type: 'error', 
        message: 'Please select a PDF file. Only PDF files are supported.' 
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
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setUploadStatus(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);

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

      const response = await fetch('http://localhost:8000/upload-pdf', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (response.ok) {
        setUploadStatus({
          type: 'success',
          message: `Successfully uploaded and processed ${data.filename}`,
          details: data
        });
        setSelectedFile(null);
        if (onUploadSuccess) {
          onUploadSuccess(data);
        }
      } else {
        setUploadStatus({
          type: 'error',
          message: `Upload failed: ${data.detail || 'Unknown error'}`
        });
      }
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: 'Error uploading file. Make sure the backend is running on http://localhost:8000'
      });
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  }, [selectedFile, isUploading, onUploadSuccess]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2 flex items-center space-x-2">
          <Upload className="w-8 h-8 text-blue-600" />
          <span>Upload Course Materials</span>
        </h2>
        <p className="text-gray-600">Upload PDF files to enhance your AI mentor's knowledge base</p>
      </div>

      {/* Drag and Drop Area */}
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
            <FileText className="w-16 h-16 mx-auto text-blue-600" />
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
                Drop your PDF here or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Supports: Lecture notes, textbooks, study materials (PDF only)
              </p>
            </div>
          </div>
        )}

        <input
          type="file"
          accept=".pdf"
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
              <span>Select PDF</span>
            </span>
          )}
        </label>
      </div>

      {/* Upload Button */}
      {selectedFile && !isUploading && (
        <div className="mt-6">
          <button
            onClick={handleUpload}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-100 shadow-lg flex items-center justify-center space-x-2"
          >
            <Upload className="w-5 h-5" />
            <span>Upload & Process</span>
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
                </div>
              )}
            </div>
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
              <li>• Upload high-quality PDFs with clear text</li>
              <li>• Lecture notes and textbooks work best</li>
              <li>• You can upload multiple files over time</li>
              <li>• Processing may take a few moments for large files</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
