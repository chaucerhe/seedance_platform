import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import LoginPage from './components/LoginPage'
import './App.css'

const STATUS_CONFIG = {
  queued: { label: '排队中', className: 'status-queued' },
  running: { label: '运行中', className: 'status-running' },
  succeeded: { label: '已完成', className: 'status-succeeded' },
  failed: { label: '失败', className: 'status-failed' },
  cancelled: { label: '已取消', className: 'status-cancelled' },
  expired: { label: '已过期', className: 'status-expired' },
}

const MODELS = [
  { value: 'doubao-seedance-2-0-260128', label: 'Seedance 2.0', supportsFlex: false },
  { value: 'doubao-seedance-2-0-fast-260128', label: 'Seedance 2.0 Fast', supportsFlex: false },
  { value: 'doubao-seedance-1-5-pro-251215', label: 'Seedance 1.5 Pro', supportsFlex: true },
]

const RESOLUTIONS = [
  { value: '480p', label: '480p' },
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p (2.0 Fast 不支持)' },
]

const RATIOS = [
  { value: 'adaptive', label: '自适应' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '1:1', label: '1:1' },
  { value: '21:9', label: '21:9' },
]

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/bmp,image/tiff,image/gif,image/heic,image/heif'
const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/x-msvideo,video/webm'
const AUDIO_ACCEPT = 'audio/wav,audio/mpeg,audio/mp3'

function App() {
  const [authenticated, setAuthenticated] = useState(() => localStorage.getItem('seedance_auth') === 'true')
  const [activeTab, setActiveTab] = useState('create')
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    model: 'doubao-seedance-2-0-260128',
    prompt: '',
    resolution: '720p',
    ratio: 'adaptive',
    duration: 5,
    seed: -1,
    watermark: false,
    generateAudio: true,
    returnLastFrame: false,
    serviceTier: 'default',
  })

  const [imageFiles, setImageFiles] = useState([])
  const [videoFiles, setVideoFiles] = useState([])
  const [audioFiles, setAudioFiles] = useState([])
  const [isDragOver, setIsDragOver] = useState(false)

  const videoInputRef = useRef(null)
  const audioInputRef = useRef(null)
  const dropZoneRef = useRef(null)

  const [pollingIds, setPollingIds] = useState([])

  const fetchTasks = useCallback(async () => {
    try {
      const res = await axios.get('/api/tasks')
      const items = res.data.items || res.data.data || []
      setTasks(items)
      return items
    } catch (e) {
      return []
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  useEffect(() => {
    if (pollingIds.length === 0) return
    const interval = setInterval(async () => {
      const items = await fetchTasks()
      const stillPending = items
        .filter((t) => pollingIds.includes(t.id))
        .filter((t) => t.status === 'queued' || t.status === 'running')
        .map((t) => t.id)
      if (stillPending.length === 0) {
        setPollingIds([])
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [pollingIds, fetchTasks])

  const currentModel = MODELS.find((m) => m.value === form.model)
  const supportsFlex = currentModel?.supportsFlex ?? true

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => {
      const next = { ...prev, [name]: type === 'checkbox' ? checked : value }
      if (name === 'model') {
        const model = MODELS.find((m) => m.value === value)
        if (model && !model.supportsFlex) {
          next.serviceTier = 'default'
        }
      }
      return next
    })
  }

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          const dataUrl = await fileToDataUrl(file)
          setImageFiles((prev) => [...prev, { name: 'pasted-image.png', dataUrl }])
        }
      }
    }
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    for (const file of files) {
      const dataUrl = await fileToDataUrl(file)
      setImageFiles((prev) => [...prev, { name: file.name, dataUrl }])
    }
  }

  const handleImageFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    for (const file of files) {
      const dataUrl = await fileToDataUrl(file)
      setImageFiles((prev) => [...prev, { name: file.name, dataUrl }])
    }
  }

  const removeImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleVideoFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    for (const file of files) {
      const dataUrl = await fileToDataUrl(file)
      setVideoFiles((prev) => [...prev, { name: file.name, dataUrl }])
    }
  }

  const handleAudioFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    for (const file of files) {
      const dataUrl = await fileToDataUrl(file)
      setAudioFiles((prev) => [...prev, { name: file.name, dataUrl }])
    }
  }

  const removeVideo = (index) => {
    setVideoFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const removeAudio = (index) => {
    setAudioFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const buildContent = () => {
    const content = []
    if (form.prompt.trim()) {
      content.push({ type: 'text', text: form.prompt.trim() })
    }

    const allImageSources = imageFiles.map((f) => f.dataUrl)

    allImageSources.forEach((src) => {
      const entry = { type: 'image_url', image_url: { url: src } }
      if (allImageSources.length === 1) {
        entry.role = 'first_frame'
      } else {
        entry.role = 'reference_image'
      }
      content.push(entry)
    })

    videoFiles.forEach((f) => {
      content.push({ type: 'video_url', video_url: { url: f.dataUrl }, role: 'reference_video' })
    })

    audioFiles.forEach((f) => {
      content.push({ type: 'audio_url', audio_url: { url: f.dataUrl }, role: 'reference_audio' })
    })

    return content
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const content = buildContent()

    const payload = {
      model: form.model,
      content,
      resolution: form.resolution,
      ratio: form.ratio,
      duration: parseInt(form.duration),
      seed: parseInt(form.seed),
      watermark: form.watermark,
      generate_audio: form.generateAudio,
      return_last_frame: form.returnLastFrame,
    }
    if (supportsFlex) {
      payload.service_tier = form.serviceTier
    }

    try {
      const res = await axios.post('/api/tasks', payload)
      const taskId = res.data.id
      setPollingIds((prev) => [...prev, taskId])
      setActiveTab('list')
      fetchTasks()
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.error || err.message
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (id) => {
    try {
      await axios.delete(`/api/tasks/${id}`)
      fetchTasks()
    } catch (err) {
      alert('操作失败: ' + (err.response?.data?.error?.message || err.message))
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除该任务记录吗？')) return
    try {
      await axios.delete(`/api/tasks/${id}`)
      fetchTasks()
    } catch (err) {
      alert('操作失败: ' + (err.response?.data?.error?.message || err.message))
    }
  }

  const statusBadge = (status) => {
    const cfg = STATUS_CONFIG[status] || { label: status, className: '' }
    return <span className={`status-badge ${cfg.className}`}>{cfg.label}</span>
  }

  const formatSize = (dataUrl) => {
    const base64 = dataUrl.split(',')[1]
    if (!base64) return '未知'
    const bytes = Math.ceil((base64.length * 3) / 4)
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!authenticated) {
    return <LoginPage onLogin={() => setAuthenticated(true)} />
  }

  return (
    <div className="app" onPaste={handlePaste}>
      <header className="app-header">
        <h1>Seedance 2.0</h1>
        <p className="subtitle">视频生成控制台</p>
      </header>

      <nav className="tab-nav">
        <button className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>
          创建任务
        </button>
        <button className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => { setActiveTab('list'); fetchTasks() }}>
          任务列表
        </button>
      </nav>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {activeTab === 'create' && (
        <div className="tab-content">
          <form onSubmit={handleSubmit} className="task-form">
            <div className="form-section">
              <h3>模型选择</h3>
              <div className="form-group">
                <label>模型</label>
                <select name="model" value={form.model} onChange={handleInputChange}>
                  {MODELS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-section">
              <h3>内容输入</h3>
              <div className="form-group">
                <label>提示词 (Prompt)</label>
                <textarea
                  name="prompt"
                  value={form.prompt}
                  onChange={handleInputChange}
                  placeholder="描述你想要生成的视频内容，支持中英文..."
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label>参考图片</label>
                <div
                  ref={dropZoneRef}
                  className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('image-file-input').click()}
                >
                  <span className="drop-icon">🖼️</span>
                  <span>点击上传、拖拽图片，或直接 Ctrl+V 粘贴</span>
                  <span className="drop-hint">支持 jpg / png / webp / heic 等格式</span>
                </div>
                <input
                  id="image-file-input"
                  type="file"
                  accept={IMAGE_ACCEPT}
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleImageFileSelect}
                />

                {imageFiles.length > 0 && (
                  <div className="uploaded-images">
                    {imageFiles.map((file, i) => (
                      <div key={i} className="image-thumb">
                        <img src={file.dataUrl} alt={file.name} />
                        <div className="image-info">
                          <span className="image-name">{file.name}</span>
                          <span className="image-size">{formatSize(file.dataUrl)}</span>
                        </div>
                        <button type="button" className="remove-btn" onClick={() => removeImage(i)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              <div className="form-group">
                <label>参考视频（最多 3 个）</label>
                <div className="file-input-row">
                  <button type="button" className="file-btn" onClick={() => videoInputRef.current?.click()}>
                    📁 选择视频文件
                  </button>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept={VIDEO_ACCEPT}
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleVideoFileSelect}
                  />
                  {videoFiles.length === 0 && (
                    <span className="file-name placeholder">未选择文件</span>
                  )}
                </div>
                {videoFiles.length > 0 && (
                  <div className="file-list">
                    {videoFiles.map((f, i) => (
                      <div key={i} className="file-item">
                        <span className="file-icon">🎬</span>
                        <span className="file-item-name">{f.name}</span>
                        <span className="file-item-size">({formatSize(f.dataUrl)})</span>
                        <button type="button" className="clear-file-btn" onClick={() => removeVideo(i)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>参考音频（最多 3 段）</label>
                <div className="file-input-row">
                  <button type="button" className="file-btn" onClick={() => audioInputRef.current?.click()}>
                    📁 选择音频文件
                  </button>
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept={AUDIO_ACCEPT}
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleAudioFileSelect}
                  />
                  {audioFiles.length === 0 && (
                    <span className="file-name placeholder">未选择文件</span>
                  )}
                </div>
                {audioFiles.length > 0 && (
                  <div className="file-list">
                    {audioFiles.map((f, i) => (
                      <div key={i} className="file-item">
                        <span className="file-icon">🎵</span>
                        <span className="file-item-name">{f.name}</span>
                        <span className="file-item-size">({formatSize(f.dataUrl)})</span>
                        <button type="button" className="clear-file-btn" onClick={() => removeAudio(i)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            <div className="form-section">
              <h3>输出参数</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>分辨率</label>
                  <select name="resolution" value={form.resolution} onChange={handleInputChange}>
                    {RESOLUTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>宽高比</label>
                  <select name="ratio" value={form.ratio} onChange={handleInputChange}>
                    {RATIOS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>时长（秒，-1 自动）</label>
                  <input
                    type="number"
                    name="duration"
                    value={form.duration}
                    onChange={handleInputChange}
                    min={-1}
                    max={15}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>随机种子（-1 随机）</label>
                  <input
                    type="number"
                    name="seed"
                    value={form.seed}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>服务等级</label>
                  <select name="serviceTier" value={form.serviceTier} onChange={handleInputChange}>
                    <option value="default">在线推理</option>
                    <option value="flex" disabled={!supportsFlex}>
                      离线推理（半价）{!supportsFlex ? ' — 2.0 系列不支持' : ''}
                    </option>
                  </select>
                  {!supportsFlex && (
                    <span className="field-hint">Seedance 2.0 系列仅支持在线推理</span>
                  )}
                </div>
              </div>
              <div className="form-row checkboxes">
                <label className="checkbox-label">
                  <input type="checkbox" name="generateAudio" checked={form.generateAudio} onChange={handleInputChange} />
                  生成同步音频
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" name="watermark" checked={form.watermark} onChange={handleInputChange} />
                  显示 AI 水印
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" name="returnLastFrame" checked={form.returnLastFrame} onChange={handleInputChange} />
                  返回尾帧图像
                </label>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? '提交中...' : '创建视频生成任务'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="tab-content">
          <div className="task-list-header">
            <h3>任务列表</h3>
            <button className="refresh-btn" onClick={fetchTasks}>刷新</button>
          </div>

          {tasks.length === 0 ? (
            <div className="empty-state">暂无任务，请先创建一个视频生成任务</div>
          ) : (
            <div className="task-table-wrap">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>任务 ID</th>
                    <th>模型</th>
                    <th>状态</th>
                    <th>分辨率</th>
                    <th>时长</th>
                    <th>Token</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id}>
                      <td className="task-id-cell" title={task.id}>
                        {task.id?.slice(0, 20)}...
                      </td>
                      <td>{task.model?.replace('doubao-', '')}</td>
                      <td>{statusBadge(task.status)}</td>
                      <td>{task.resolution || '-'}</td>
                      <td>{task.duration ? `${task.duration}s` : '-'}</td>
                      <td>{task.usage?.total_tokens?.toLocaleString() || '-'}</td>
                      <td>{task.created_at ? new Date(task.created_at * 1000).toLocaleString('zh-CN') : '-'}</td>
                      <td className="task-actions">
                        {task.status === 'succeeded' && task.content?.video_url && (
                          <a href={task.content.video_url} target="_blank" rel="noreferrer" className="action-link">视频</a>
                        )}
                        {task.status === 'queued' && (
                          <button className="action-btn danger" onClick={() => handleCancel(task.id)}>取消</button>
                        )}
                        {['succeeded', 'failed', 'expired'].includes(task.status) && (
                          <button className="action-btn danger" onClick={() => handleDelete(task.id)}>删除</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App