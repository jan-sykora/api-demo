import './style.css'
import { createClient } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-web'
import { create } from '@bufbuild/protobuf'
import { DurationSchema } from '@bufbuild/protobuf/wkt'
import { EventService } from './gen/ai/h2o/usage/v1/event_service_pb'
import { EventSchema } from './gen/ai/h2o/usage/v1/event_pb'
import { CreateEventRequestSchema } from './gen/ai/h2o/usage/v1/event_service_pb'

interface ImageItem {
  id: string
  name: string
  dataUrl: string
  classification: string | null
}

const ANIMALS = ['Dog', 'Cat', 'Bird', 'Horse', 'Elephant', 'Lion', 'Tiger', 'Bear', 'Rabbit', 'Fox']
const USER_ID = 'users/anonymous'
const STORAGE_KEY = 'animal-classifier-images'

const transport = createConnectTransport({
  baseUrl: 'http://localhost:50051',
})

const client = createClient(EventService, transport)

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

async function sendUsageEvent(durationMs: number): Promise<void> {
  const seconds = Math.floor(durationMs / 1000)
  const nanos = Math.round((durationMs % 1000) * 1_000_000)

  const event = create(EventSchema, {
    subject: USER_ID,
    source: 'animal-classifier',
    action: 'classify',
    executionDuration: create(DurationSchema, {
      seconds: BigInt(seconds),
      nanos: nanos,
    }),
  })

  try {
    const request = create(CreateEventRequestSchema, { event })
    const response = await client.createEvent(request)
    console.log('Usage event recorded:', response.event?.name)
  } catch (error) {
    console.error('Failed to send usage event:', error)
  }
}

// Load images from localStorage
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