import './style.css'
import { createClient } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-web'
import { create } from '@bufbuild/protobuf'
import { DurationSchema } from '@bufbuild/protobuf/wkt'
import { EventService, ListEventsRequestSchema } from './gen/ai/h2o/usage/v1/event_service_pb'
import { EventSchema } from './gen/ai/h2o/usage/v1/event_pb'
import type { Event } from './gen/ai/h2o/usage/v1/event_pb'
import { CreateEventRequestSchema } from './gen/ai/h2o/usage/v1/event_service_pb'

// ============================================================================
// Shared
// ============================================================================

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

// ============================================================================
// Router
// ============================================================================

type Page = 'classifier' | 'events'

const pageConfig: Record<Page, { title: string; subtitle: string }> = {
  classifier: {
    title: 'Animal Classifier',
    subtitle: 'Upload an image to identify the animal',
  },
  events: {
    title: 'Usage Events',
    subtitle: 'View tracked usage events from the API',
  },
}

function navigateTo(page: Page): void {
  // Update header
  document.getElementById('page-title')!.textContent = pageConfig[page].title
  document.getElementById('page-subtitle')!.textContent = pageConfig[page].subtitle

  // Update nav links
  document.querySelectorAll('nav a').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-page') === page)
  })

  // Show/hide pages
  document.getElementById('classifier-page')!.style.display = page === 'classifier' ? 'block' : 'none'
  document.getElementById('events-page')!.style.display = page === 'events' ? 'block' : 'none'

  // Load events when switching to events page
  if (page === 'events') {
    currentPageToken = ''
    loadEvents()
  }
}

function setupRouter(): void {
  // Handle nav clicks
  document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault()
      const page = (e.target as HTMLElement).getAttribute('data-page') as Page
      window.location.hash = page
    })
  })

  // Handle hash changes
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1) as Page
    navigateTo(hash === 'events' ? 'events' : 'classifier')
  })

  // Initial navigation based on hash
  const initialHash = window.location.hash.slice(1) as Page
  navigateTo(initialHash === 'events' ? 'events' : 'classifier')
}

// ============================================================================
// Classifier Page
// ============================================================================

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

// ============================================================================
// Events Page
// ============================================================================

let currentPageToken = ''
let nextPageToken = ''

function formatDuration(event: Event): string {
  if (!event.executionDuration) {
    return '-'
  }
  const seconds = Number(event.executionDuration.seconds)
  const nanos = event.executionDuration.nanos
  const ms = seconds * 1000 + nanos / 1_000_000
  return `${ms.toFixed(0)}ms`
}

function formatTimestamp(event: Event): string {
  if (!event.createTime) {
    return '-'
  }
  const date = new Date(Number(event.createTime.seconds) * 1000)
  return date.toLocaleString()
}

function renderEvents(events: Event[]): void {
  const tbody = document.getElementById('events-body')!

  if (events.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-events">No events found</td>
      </tr>
    `
    return
  }

  tbody.innerHTML = events.map(event => `
    <tr>
      <td class="event-name">${event.name}</td>
      <td>${event.subject}</td>
      <td>${event.source}</td>
      <td>${event.action}</td>
      <td class="event-duration">${formatDuration(event)}</td>
      <td>${formatTimestamp(event)}</td>
    </tr>
  `).join('')
}

function renderPagination(): void {
  const pagination = document.getElementById('pagination')!

  if (!nextPageToken) {
    pagination.innerHTML = ''
    return
  }

  pagination.innerHTML = `
    <button id="next-page-btn">Load More</button>
  `

  document.getElementById('next-page-btn')!.addEventListener('click', () => {
    currentPageToken = nextPageToken
    loadEvents()
  })
}

async function loadEvents(): Promise<void> {
  const tbody = document.getElementById('events-body')!
  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="loading">Loading events...</td>
    </tr>
  `

  try {
    const request = create(ListEventsRequestSchema, {
      pageSize: 20,
      pageToken: currentPageToken,
    })
    const response = await client.listEvents(request)

    nextPageToken = response.nextPageToken
    renderEvents(response.events)
    renderPagination()
  } catch (error) {
    console.error('Failed to load events:', error)
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="error">Failed to load events. Is the server running?</td>
      </tr>
    `
  }
}

function setupEvents(): void {
  document.getElementById('refresh-btn')!.addEventListener('click', () => {
    currentPageToken = ''
    loadEvents()
  })
}

// ============================================================================
// Initialize
// ============================================================================

setupUpload()
setupEvents()
setupRouter()
renderGallery()