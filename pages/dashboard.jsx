import { useState, useRef, useEffect } from 'react'
import { LogOut, User, Settings } from 'lucide-react'
import EmbedButton from './galleryscript'
import { generateThumbnail } from './generateThumbnail';

export default function Dashboard() {
  // Auth state
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  // Original DAM state
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [assets, setAssets] = useState([])
  const [editKey, setEditKey] = useState(null)
  const [newName, setNewName] = useState('')
  const fileInputRef = useRef(null)
  const [storage, setStorage] = useState({ used: 0, quota: 0, numFiles: 0 })
  const [r2, setR2] = useState({ bucket: '', endpoint: '' })
  const [previewAsset, setPreviewAsset] = useState(null)
  const [filter, setFilter] = useState('all')
  const [lastUploaded, setLastUploaded] = useState(null)
  const [darkMode, setDarkMode] = useState(false)

  // Check authentication on component mount
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 10000); // 10 seconds

      return () => clearTimeout(timer);
    }
    
    const checkAuth = () => {
      try {
        // In a real app, you'd validate the session with your backend
        const storedUser = localStorage.getItem('user')
        const storedSession = localStorage.getItem('session')
        
        if (storedUser && storedSession) {
          const userData = JSON.parse(storedUser)
          setUser(userData)
          setIsAuthenticated(true)
        } else {
          // Redirect to login if not authenticated
          window.location.href = '/login'
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        window.location.href = '/login'
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const handleLogout = () => {
    // Clear stored auth data
    localStorage.removeItem('user')
    localStorage.removeItem('session')
    
    // Redirect to login
    window.location.href = '/login'
  }

  // Original DAM functions
  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.type.startsWith('image/') || droppedFile.type.startsWith('video/'))) {
      setFiles([droppedFile])
      setMessage({ type: '', text: '' })
    } else {
      setMessage({ type: 'error', text: 'Please select an image or video file.' })
    }
  }

  const handleFileSelect = (e) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) {
      setMessage({ type: 'error', text: 'No files selected.' });
      return;
    }
  
    const validFiles = Array.from(selectedFiles).filter(file =>
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );
  
    if (validFiles.length === 0) {
      setMessage({ type: 'error', text: 'Please select image or video files only.' });
      return;
    }
  
    setFiles(validFiles);
    setMessage({ type: '', text: '' });
  };
  
  

 

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one file.' });
      return;
    }
  
    setIsUploading(true);
    setMessage({ type: '', text: '' });
  
    const formData = new FormData();
  
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      formData.append('files', file); // main file
  
      // If it's a video, generate a thumbnail
      if (file.type.startsWith('video/')) {
        const thumbnail = await generateThumbnail(file);
        formData.append('thumbnails', thumbnail, `thumb-${file.name}.jpg`);
      }
    }
  
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('session')).access_token}`,
        }
      });
  
      const result = await response.json();
  
      if (response.ok) {
        setMessage({ type: 'success', text: `Uploaded ${files.length} files successfully!` });
        setFiles(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        fetchAssets();
      } else {
        setMessage({ type: 'error', text: result.error || 'Upload failed. Please try again.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please check your connection.' });
    } finally {
      setIsUploading(false);
    }
  };
  
  

  const handleDelete = async (key) => {
    if (!window.confirm('Delete this asset?')) return
    try {
      const res = await fetch(`/api/assets?key=${encodeURIComponent(key)}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('session')).access_token}`
        }
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: 'Asset deleted.' })
        fetchAssets()
      } else {
        setMessage({ type: 'error', text: data.error || 'Delete failed.' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Delete failed.' })
    }
  }

  const startEdit = (key) => {
    setEditKey(key)
    setNewName(key.split('/').pop())
  }

  const handleRename = async (oldKey) => {
    if (!newName || newName === oldKey.split('/').pop()) {
      setEditKey(null)
      setNewName('')
      return
    }
    const ext = oldKey.includes('.') ? oldKey.substring(oldKey.lastIndexOf('.')) : ''
    let newKey = newName
    if (!newKey.endsWith(ext)) newKey += ext
    try {
      const res = await fetch('/api/assets', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          
        'Authorization': `Bearer ${JSON.parse(localStorage.getItem('session')).access_token}`
        },
        body: JSON.stringify({ oldKey, newKey }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: 'Asset renamed.' })
        setEditKey(null)
        setNewName('')
        fetchAssets()
      } else {
        setMessage({ type: 'error', text: data.error || 'Rename failed.' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Rename failed.' })
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatStorage = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const fetchAssets = async () => {
    try {
      const res = await fetch('/api/assets', {
        headers: {
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('session')).access_token}`
        }
      })
      const data = await res.json()
      setAssets(data.userAssets || [])
      setStorage(data.storage || { used: 0, quota: 0, numFiles: 0 })
      setR2(data.r2 || { bucket: '', endpoint: '' })
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to fetch assets.' })
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchAssets()
    }
  }, [isAuthenticated])

  const filteredAssets = assets.filter(asset => {
    if (filter === 'all') return true
    if (filter === 'images') return asset.key.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    if (filter === 'videos') return asset.key.match(/\.(mp4|webm|ogg|mov)$/i)
    return true
  })

  // Navigation handlers
  const handleRefresh = () => window.location.reload()
  const handleUploadNav = () => {
    const pinkBox = document.getElementById('upload-pink-box')
    if (pinkBox) pinkBox.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const handleAssetsNav = () => {
    const assetsSection = document.getElementById('assets-section')
    if (assetsSection) assetsSection.scrollIntoView({ behavior: 'smooth' })
  }
  const handleBrowseNav = () => {
    if (fileInputRef.current) fileInputRef.current.click()
  }
  const handleThemeToggle = () => setDarkMode((prev) => !prev)

  

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (darkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

  }, [darkMode])

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Show login redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to access the dashboard.</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Enhanced Navbar with User Info - Mobile Optimized */}
      <nav className="sticky top-0 z-50 w-full bg-white/90 dark:bg-gray-900/90 border-b border-gray-200 dark:border-gray-800 shadow-sm backdrop-blur">
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-4 py-3 md:hidden">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent select-none">dammi.spaces</span>
          </div>
          <button
            onClick={handleThemeToggle}
            className="flex items-center p-2 rounded-full text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {darkMode ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.07l-.71.71M21 12h-1M4 12H3m16.24 4.24l-.71-.71M6.34 6.34l-.71-.71" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Navigation Buttons */}
        <div className="flex flex-wrap gap-2 px-4 pb-3 md:hidden">
          <button onClick={handleRefresh} className="flex-1 min-w-0 flex items-center justify-center px-2 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300 shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 transition">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582M20 20v-5h-.581M5.635 19A9 9 0 0021 12.5M18.364 5A9 9 0 003 11.5" />
            </svg>
            Refresh
          </button>
          <button onClick={handleBrowseNav} className="flex-1 min-w-0 flex items-center justify-center px-2 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300 shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 transition">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" />
            </svg>
            Upload
          </button>
          <button onClick={handleAssetsNav} className="flex-1 min-w-0 flex items-center justify-center px-2 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300 shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 transition">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Assets
          </button>
          <EmbedButton/>
        </div>

        {/* Mobile User Info */}
        <div className="flex items-center justify-between px-4 pb-3 md:hidden">
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-2 flex-1 mr-2">
            <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
              {user?.email?.split('@')[0] || 'User'}
            </span>
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded shrink-0">
              {user?.user_metadata?.role || 'user'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between px-6 py-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent select-none">dammi.spaces</span>
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200">R2 Connected</span>
          </div>

          {/* Desktop Navigation buttons */}
          <div className="flex items-center space-x-2">
            <button onClick={handleRefresh} className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-300 shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 transition">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582M20 20v-5h-.581M5.635 19A9 9 0 0021 12.5M18.364 5A9 9 0 003 11.5" />
              </svg>
              Refresh
            </button>
            <button onClick={handleBrowseNav} className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-300 shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 transition">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" />
              </svg>
              Upload
            </button>
            <button onClick={handleAssetsNav} className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-300 shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 transition">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Assets
            </button>
            <EmbedButton/>
            <button onClick={handleThemeToggle} className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-300 shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 transition">
              {darkMode ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.07l-.71.71M21 12h-1M4 12H3m16.24 4.24l-.71-.71M6.34 6.34l-.71-.71" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
                </svg>
              )}
            </button>
          </div>

          {/* Desktop User Menu */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-2">
              <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {user?.email?.split('@')[0] || 'User'}
              </span>
              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                {user?.user_metadata?.role || 'user'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 transition"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </button>
          </div>
        </div>
      </nav>
      
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        {message.text && (
          <div
            className={`w-11/12 sm:w-2/3 md:w-1/2 fixed top-4 left-1/2 -translate-x-1/2 z-50 p-3 sm:p-4 rounded-lg shadow-lg ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              {message.type === 'success' ? (
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <p
                className={`text-xs sm:text-sm font-medium ${
                  message.type === 'success'
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}
              >
                {message.text}
              </p>
            </div>
          </div>
          )}

        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          {/* Welcome Message */}
          <div className="max-w-4xl mx-auto mb-6 sm:mb-8">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-4 sm:p-6 text-white">
              <h1 className="text-lg sm:text-2xl font-bold mb-2">
                Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}! 👋
              </h1>
              <p className="text-indigo-100 text-sm sm:text-base">Ready to manage your digital assets</p>
            </div>
          </div>

          {/* Storage Info Card */}
          <div className="max-w-4xl mx-auto mb-6 sm:mb-8">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 border border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1">Your Storage</h2>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-gray-900 dark:text-white text-base sm:text-lg font-semibold">{formatStorage(storage.used)} / {formatStorage(storage.quota)}</div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600" style={{ width: `${Math.min(100, (storage.used / storage.quota) * 100)}%` }}></div>
                </div>
                <div className="text-xs text-gray-500">{storage.numFiles} file{storage.numFiles === 1 ? '' : 's'} stored</div>
              </div>
            </div>
          </div>
          
          {/* Modal for asset preview */}
          {previewAsset && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4">
              <div className="relative w-full max-w-4xl max-h-full">
                <button
                  onClick={() => setPreviewAsset(null)}
                  className="absolute top-2 right-2 bg-black bg-opacity-60 text-white rounded-full p-2 hover:bg-opacity-90 z-10"
                  aria-label="Close preview"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
          
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-3 sm:p-4 flex flex-col items-center max-h-full overflow-hidden">
                  {previewAsset.type === 'image' ? (
                    <img
                      src={`${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${previewAsset.key}`}
                      alt={previewAsset.key}
                      className="max-w-full max-h-[70vh] w-auto h-auto block mx-auto rounded"
                    />
                  ) : previewAsset.type === 'video' ? (
                    <video
                      src={`${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${previewAsset.key}`}
                      poster = {`${previewAsset.thumbnail}`}
                      controls
                      autoPlay
                      className="max-w-full max-h-[70vh] w-full h-auto block mx-auto rounded shadow-lg bg-black"
                    />
                  ) : null}

                  <div className="mt-2 text-gray-900 dark:text-gray-200 text-xs sm:text-sm break-all text-center px-2">
                    {previewAsset.key?.split('/').pop()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filter Section */}
          <div className="max-w-4xl mx-auto mb-4 flex gap-2 sm:gap-4 items-center overflow-x-auto pb-2">
            <button onClick={() => setFilter('all')} className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition whitespace-nowrap text-sm ${filter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>All</button>
            <button onClick={() => setFilter('images')} className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition whitespace-nowrap text-sm ${filter === 'images' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>Images</button>
            <button onClick={() => setFilter('videos')} className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition whitespace-nowrap text-sm ${filter === 'videos' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>Videos</button>
          </div>

          {/* Asset Gallery */}
          <div id="assets-section" className="max-w-4xl mx-auto mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-900 dark:text-white">Assets</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredAssets.length === 0 && <div className="col-span-full text-gray-500 text-center py-8">No assets found.</div>}
              {filteredAssets.map(asset => {
                const isImage = asset.key.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                const isVideo = asset.key.match(/\.(mp4|webm|ogg|mov)$/i)
                const isJustUploaded = lastUploaded && asset.key.endsWith(lastUploaded)
                return (
                  <div key={asset.key} className={`bg-white dark:bg-gray-800 rounded-xl shadow p-3 sm:p-4 flex flex-col relative ${isJustUploaded ? 'ring-4 ring-green-400' : ''}`}>
                    {isJustUploaded && (
                      <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded z-10">Just uploaded</span>
                    )}
                    <div
                      className="cursor-pointer group"
                      onClick={() => setPreviewAsset(isImage ? { ...asset, type: 'image' } : isVideo ? { ...asset, type: 'video' } : null)}
                      tabIndex={0}
                      role="button"
                      aria-label="View asset"
                    >
                      {isImage ? (
                        <img src={`${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${asset.key}`} alt="" className="rounded mb-2 object-cover h-32 sm:h-40 w-full group-hover:opacity-80 transition" />
                      ) : isVideo ? (
                        <div className="relative mb-2 h-32 sm:h-40 w-full">
                          <video src={`${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${asset.key}`} 
                          poster={`${asset.thumbnail}`}
                          className="rounded object-cover h-32 sm:h-40 w-full group-hover:opacity-80 transition" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white opacity-80" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" fill="black" fillOpacity="0.5" />
                              <polygon points="10,8 16,12 10,16" fill="white" />
                            </svg>
                          </div>
                        </div>
                      ) : (
                        <div className="h-32 sm:h-40 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded mb-2 text-gray-400">No preview</div>
                      )}
                    </div>
                    <div className="flex-1">
                      {editKey === asset.key ? (
                        <div className="flex flex-col items-left rounded p-1">
                          <input
                            className="bg-white border-2 text-black px-2 py-1 flex-1 rounded text-sm"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleRename(asset.key) }}
                          />
                          <div className='flex flex-row justify-between mt-3 gap-2'> 
                          <button onClick={() => handleRename(asset.key)} className="py-1 rounded-md text-white bg-black font-semibold px-3 text-sm flex-1">Save</button>
                          <button onClick={() => setEditKey(null)} className="py-1 rounded-md text-white bg-red-700 px-3 text-sm flex-1">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <span className="truncate text-gray-800 dark:text-gray-200 text-sm flex-1 min-w-0" title={asset.key}>{asset.key.split('/').pop()}</span>
                          <div className="flex items-center space-x-1 shrink-0">
                            <button onClick={() => startEdit(asset.key)} className="text-purple-600 hover:underline text-xs sm:text-sm">Edit</button>
                            <button onClick={() => handleDelete(asset.key)} className="text-red-600 hover:underline text-xs sm:text-sm">Delete</button>
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">{formatFileSize(asset.size)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Upload Area */}
          <div id="upload-pink-box" className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-10 mb-6 sm:mb-8 border-2 border-dashed border-purple-300 dark:border-purple-700 hover:border-purple-500 dark:hover:border-purple-400 transition-all duration-200 flex flex-col items-center justify-center relative group" style={{ minHeight: '200px' }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${isDragging ? 'scale-105 bg-purple-50 dark:bg-purple-900/20' : ''}`}>
              <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-purple-100 dark:bg-purple-700 rounded-full flex items-center justify-center mb-4 animate-bounce group-hover:animate-none">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2 text-center px-4">
                {isDragging ? 'Drop your file here' : 'Drag and drop your file here'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
                multiple
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold rounded-xl shadow-lg transition-colors duration-200 text-sm sm:text-lg mt-2"
              >
                Choose File
              </button>
            </div>
            {files && files.length > 0 && (
              <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-purple-50 dark:purple-900/40 px-2 py-1 sm:px-4 sm:py-2 rounded-lg shadow text-purple-800 dark:text-purple-200 text-xs sm:text-sm">
                {files.length} file{files.length !== 1 ? 's' : ''} selected
                <button
                  onClick={() => {
                    setFiles([]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          <div className="mt-4 sm:mt-6 max-w-4xl mx-auto">
            <button
              onClick={handleUpload}
              disabled={!files || files.length === 0|| isUploading}
              className={`w-full py-3 sm:py-4 px-6 sm:px-8 rounded-xl font-bold text-base sm:text-lg transition-all duration-200 ${
                !files || files.length === 0 || isUploading
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5'
              }`}
            >
              {isUploading ? (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="animate-spin h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Uploading...</span>
                </div>
              ) : (
                'Upload File'
              )}
            </button>
          </div>
        </div>
      </main>
    </>
  )
}