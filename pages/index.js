import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'

export default function Home() {
  console.log('R2 PUBLIC URL:', process.env.NEXT_PUBLIC_R2_PUBLIC_URL)
  const [file, setFile] = useState(null)
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
      setFile(droppedFile)
      setMessage({ type: '', text: '' })
    } else {
      setMessage({ type: 'error', text: 'Please select an image or video file.' })
    }
  }

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && (selectedFile.type.startsWith('image/') || selectedFile.type.startsWith('video/'))) {
      setFile(selectedFile)
      setMessage({ type: '', text: '' })
    } else {
      setMessage({ type: 'error', text: 'Please select an image or video file.' })
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file first.' })
      return
    }

    setIsUploading(true)
    setMessage({ type: '', text: '' })

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: `File uploaded successfully! URL: ${result.url}` })
        setFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        setLastUploaded(result.filename)
        fetchAssets()
      } else {
        setMessage({ type: 'error', text: result.error || 'Upload failed. Please try again.' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please check your connection.' })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (key) => {
    if (!window.confirm('Delete this asset?')) return
    try {
      const res = await fetch(`/api/assets?key=${encodeURIComponent(key)}`, { method: 'DELETE' })
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
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch('/api/assets')
      const data = await res.json()
      setAssets(data.assets || [])
      setStorage(data.storage || { used: 0, quota: 0, numFiles: 0 })
      setR2(data.r2 || { bucket: '', endpoint: '' })
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to fetch assets.' })
    }
  }

  useEffect(() => {
    fetchAssets()
  }, [])

  useEffect(() => {
    console.log('previewAsset:', previewAsset)
  }, [previewAsset])

  // Helper to filter assets
  const filteredAssets = assets.filter(asset => {
    if (filter === 'all') return true
    if (filter === 'images') return asset.key.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    if (filter === 'videos') return asset.key.match(/\.(mp4|webm|ogg|mov)$/i)
    return true
  })

  return (
    <>
      <Head>
        <title>Digital Asset Manager</title>
        <meta name="description" content="Manage and upload assets to Cloudflare R2" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          {/* Main Title */}
          <div className="w-full flex justify-center mb-8">
            <h1 className="text-4xl font-extrabold text-purple-700 uppercase tracking-widest drop-shadow-lg text-center">BUILDIFY DAM</h1>
          </div>
          {/* Info Card */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 flex flex-col md:flex-row items-center justify-between gap-6 border border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Your Storage</h2>
              </div>
              <div className="flex flex-col md:items-end gap-2">
                <div className="text-gray-900 dark:text-white text-lg font-semibold">{formatStorage(storage.used)} / {formatStorage(storage.quota)}</div>
                <div className="w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600" style={{ width: `${Math.min(100, (storage.used / storage.quota) * 100)}%` }}></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">{storage.numFiles} file{storage.numFiles === 1 ? '' : 's'} stored</div>
              </div>
            </div>
          </div>
          

          {/* Modal for asset preview */}

      {previewAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
          <div className="relative p-4 w-auto max-w-full">
            <button
              onClick={() => setPreviewAsset(null)}
              className="absolute top-2 right-2 bg-black bg-opacity-60 text-white rounded-full p-2 hover:bg-opacity-90 z-10"
              aria-label="Close preview"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
      
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4 flex flex-col items-center">
              {previewAsset.type === 'image' ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${previewAsset.key}`}
                  alt={previewAsset.key}
                  className="max-w-full max-h-[80vh] w-auto h-auto block mx-auto rounded"
                />
              ) : previewAsset.type === 'video' ? (
                <video
                  src={`${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${previewAsset.key}`}
                  controls
                  autoPlay
                  className="max-w-2xl max-h-[80vh] w-full h-auto block mx-auto rounded shadow-lg bg-black"
                />
              ) : null}

              <div className="mt-2 text-gray-700 dark:text-gray-200 text-sm break-all">
                {previewAsset.key?.split('/').pop()}
              </div>
            </div>
          </div>
        </div>
      )}


          {/* Filter Section */}
          <div className="max-w-4xl mx-auto mb-4 flex gap-4 items-center">
            <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>All</button>
            <button onClick={() => setFilter('images')} className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'images' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>Images</button>
            <button onClick={() => setFilter('videos')} className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'videos' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>Videos</button>
          </div>

          {/* Asset Gallery */}
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Assets</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {filteredAssets.length === 0 && <div className="col-span-full text-gray-500">No assets found.</div>}
              {filteredAssets.map(asset => {
                const isImage = asset.key.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                const isVideo = asset.key.match(/\.(mp4|webm|ogg|mov)$/i)
                const isJustUploaded = lastUploaded && asset.key.endsWith(lastUploaded)
                return (
                  <div key={asset.key} className={`bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col relative ${isJustUploaded ? 'ring-4 ring-green-400' : ''}`}>
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
                        <img src={`${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${asset.key}`} alt="" className="rounded mb-2 object-cover h-40 w-full group-hover:opacity-80 transition" />
                      ) : isVideo ? (
                        <div className="relative mb-2 h-40 w-full">
                          <video src={`${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${asset.key}`} className="rounded object-cover h-40 w-full group-hover:opacity-80 transition" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-12 h-12 text-white opacity-80" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" fill="black" fillOpacity="0.5" />
                              <polygon points="10,8 16,12 10,16" fill="white" />
                            </svg>
                          </div>
                        </div>
                      ) : (
                        <div className="h-40 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded mb-2 text-gray-400">No preview</div>
                      )}
                    </div>
                    <div className="flex-1">
                      {editKey === asset.key ? (
                        <div className="flex items-center space-x-2 bg-black rounded p-1">
                          <input
                            className="border-none outline-none bg-black text-white px-2 py-1 flex-1 rounded"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleRename(asset.key) }}
                          />
                          <button onClick={() => handleRename(asset.key)} className="text-white font-semibold">Save</button>
                          <button onClick={() => setEditKey(null)} className="text-gray-400">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="truncate" title={asset.key}>{asset.key.split('/').pop()}</span>
                          <div className="flex items-center space-x-2">
                            <button onClick={() => startEdit(asset.key)} className="text-purple-600 hover:underline">Edit</button>
                            <button onClick={() => handleDelete(asset.key)} className="text-red-600 hover:underline">Delete</button>
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

          {/* Upload Area - Modern Look */}
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-extrabold text-purple-700 dark:text-purple-300 mb-2 tracking-tight drop-shadow">Upload Image or Video</h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">Drag and drop your files or click to browse</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-10 mb-8 border-2 border-dashed border-purple-300 dark:border-purple-700 hover:border-purple-500 dark:hover:border-purple-400 transition-all duration-200 flex flex-col items-center justify-center relative group" style={{ minHeight: '220px' }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${isDragging ? 'scale-105 bg-purple-50 dark:bg-purple-900/20' : ''}`}>
                <div className="mx-auto w-20 h-20 bg-purple-100 dark:bg-purple-700 rounded-full flex items-center justify-center mb-4 animate-bounce group-hover:animate-none">
                  <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {isDragging ? 'Drop your file here' : 'Drag and drop your file here'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold rounded-xl shadow-lg transition-colors duration-200 text-lg mt-2"
                >
                  Choose File
                </button>
              </div>
              {file && (
                <div className="absolute top-4 right-4 bg-purple-50 dark:bg-purple-900/40 px-4 py-2 rounded-lg shadow text-purple-800 dark:text-purple-200 flex items-center space-x-2">
                  <span>{file.name}</span>
                  <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                  <button
                    onClick={() => {
                      setFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="mt-6">
              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className={`w-full py-4 px-8 rounded-xl font-bold text-lg transition-all duration-200 ${
                  !file || isUploading
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5'
                }`}
              >
                {isUploading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
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
            {message.text && (
              <div
                className={`p-4 rounded-lg mt-6 ${
                  message.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {message.type === 'success' ? (
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                  <p
                    className={`text-sm font-medium ${
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
          </div>
        </div>
      </main>
    </>
  )
} 