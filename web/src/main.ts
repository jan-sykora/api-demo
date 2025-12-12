import './style.css'
import { EventService_CreateEvent } from './gen/ai/h2o/usage/v1/event_service_pb'
import type { RequestConfig } from './gen/runtime'

interface ImageItem {
  id: string
  name: string
  dataUrl: string
  classification: string | null
}

const ANIMALS = ['Dog', 'Cat', 'Bird', 'Horse', 'Elephant', 'Lion', 'Tiger', 'Bear', 'Rabbit', 'Fox']
const STORAGE_KEY = 'animal-classifier-images'
const USER_ID = 'users/anonymous'

const apiConfig: RequestConfig = {
  basePath: 'http://localhost:8080',
}

async function sendUsageEvent(durationMs: number): Promise<void> {
  const request = EventService_CreateEvent.createRequest(apiConfig, {
    event: {
      subject: USER_ID,
      source: 'animal-classifier',
      action: 'classify',
      executionDuration: `${(durationMs / 1000).toFixed(3)}s`,
    },
  })

  try {
    const response = await fetch(request)
    const data = EventService_CreateEvent.responseTypeId(await response.json())
    console.log('Usage event recorded:', data.event?.name)
  } catch (error) {
    console.error('Failed to send usage event:', error)
  }
}

function saveImages(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(images))
}

function loadImages(): ImageItem[] {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return []
    }
  }
  return []
}

const images: ImageItem[] = loadImages()

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

function mockClassify(): string {
  return ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
}

function renderGallery(): void {
  const gallery = document.getElementById('gallery')!

  if (images.length === 0) {
    gallery.innerHTML = '<p class="empty-gallery">No images uploaded yet</p>'
    return
  }

  gallery.innerHTML = images.map(img => `
    <div class="gallery-item">
      <img src="${img.dataUrl}" alt="${img.name}" />
      <div class="gallery-item-info">
        <p class="gallery-item-name">${img.name}</p>
        <span class="gallery-item-classification ${img.classification ? '' : 'pending'}">
          ${img.classification || 'Classifying...'}
        </span>
      </div>
    </div>
  `).join('')
}

function handleFile(file: File): void {
  if (!file.type.startsWith('image/')) {
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const id = generateId()
    const newImage: ImageItem = {
      id,
      name: file.name,
      dataUrl: e.target?.result as string,
      classification: null
    }

    images.unshift(newImage)
    saveImages()
    renderGallery()

    // Simulate async classification and track duration
    const startTime = performance.now()
    const classificationDelay = 1000 + Math.random() * 1000

    setTimeout(() => {
      const img = images.find(i => i.id === id)
      if (img) {
        img.classification = mockClassify()
        saveImages()
        renderGallery()

        const durationMs = performance.now() - startTime
        sendUsageEvent(durationMs)
      }
    }, classificationDelay)
  }
  reader.readAsDataURL(file)
}

function setupUpload(): void {
  const uploadArea = document.getElementById('upload-area')!
  const fileInput = document.getElementById('file-input') as HTMLInputElement
  const browseBtn = document.getElementById('browse-btn')!

  browseBtn.addEventListener('click', () => fileInput.click())

  fileInput.addEventListener('change', () => {
    if (fileInput.files?.length) {
      handleFile(fileInput.files[0])
      fileInput.value = ''
    }
  })

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault()
    uploadArea.classList.add('dragover')
  })

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover')
  })

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault()
    uploadArea.classList.remove('dragover')

    const files = e.dataTransfer?.files
    if (files?.length) {
      handleFile(files[0])
    }
  })
}

// Initialize
setupUpload()
renderGallery()