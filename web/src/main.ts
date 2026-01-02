import './style.css'
import { EventService_CreateEvent, EventService_ListEvents } from './gen/ai/h2o/audit/v1/event_service_pb'
import type { Event } from './gen/ai/h2o/audit/v1/event_pb'
import type { RequestConfig } from './gen/runtime'

interface ImageItem {
  id: string
  name: string
  dataUrl: string
  classification: string | null
}

// Feature flags
const ENABLE_EVENTS_PAGE = false

const ANIMALS = ['Dog', 'Cat', 'Bird', 'Horse', 'Elephant', 'Lion', 'Tiger', 'Bear', 'Rabbit', 'Fox']
const ANONYMOUS_USER = 'users/anonymous'

const apiConfig: RequestConfig = {
  basePath: 'http://localhost:8080',
}

let images: ImageItem[] = []

// --- API Functions ---

async function sendEvent(durationMs: number): Promise<void> {
  const request = EventService_CreateEvent.createRequest(apiConfig, {
    event: {
      user: ANONYMOUS_USER,
      source: 'animal-classifier',
      action: 'classify',
      executionDuration: `${(durationMs / 1000).toFixed(3)}s`,
    },
  })

  try {
    const response = await fetch(request)
    const data = EventService_CreateEvent.responseTypeId(await response.json())
    console.log('Event recorded:', data.event?.name)
  } catch (error) {
    console.error('Failed to send event:', error)
  }
}

async function fetchEvents(): Promise<Event[]> {
  const request = EventService_ListEvents.createRequest(apiConfig, {
    pageSize: 100,
  })

  try {
    const response = await fetch(request)
    const data = EventService_ListEvents.responseTypeId(await response.json())
    return data.events || []
  } catch (error) {
    console.error('Failed to fetch events:', error)
    return []
  }
}

// --- Classifier Page ---

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

function mockClassify(): string {
  return ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
}

function renderGallery(): void {
  const gallery = document.getElementById('gallery')
  if (!gallery) return

  if (images.length === 0) {
    gallery.innerHTML = '<p class="empty-gallery">No images uploaded yet</p>'
    return
  }

  gallery.innerHTML = images.map(img => `
    <div class="gallery-item">
      <img src="${img.dataUrl}" alt="${img.name}" />
      <div class="gallery-item-info">
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
    renderGallery()

    // Simulate async classification and track duration
    const startTime = performance.now()
    const classificationDelay = 1000 + Math.random() * 1000

    setTimeout(() => {
      const img = images.find(i => i.id === id)
      if (img) {
        img.classification = mockClassify()
        renderGallery()

        const durationMs = performance.now() - startTime
        sendEvent(durationMs)
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

function renderClassifierPage(): void {
  const main = document.getElementById('main')!
  main.innerHTML = `
    <p class="subtitle">Upload an image to identify the animal</p>
    <section class="upload-section">
      <div class="upload-area" id="upload-area">
        <input type="file" id="file-input" accept="image/*" hidden />
        <p>Drop an image here or <button id="browse-btn">browse</button></p>
      </div>
    </section>

    <section class="gallery-section">
      <h2>Uploaded Images</h2>
      <div class="gallery" id="gallery"></div>
    </section>
  `
  setupUpload()
  renderGallery()
}

// --- Events Page ---

async function renderEventsPage(): Promise<void> {
  const main = document.getElementById('main')!
  main.innerHTML = `
    <section class="events-section">
      <h2>Events</h2>
      <p class="loading">Loading events...</p>
    </section>
  `

  const events = await fetchEvents()

  if (events.length === 0) {
    main.innerHTML = `
      <section class="events-section">
        <h2>Events</h2>
        <p class="empty-events">No events recorded yet</p>
      </section>
    `
    return
  }

  main.innerHTML = `
    <section class="events-section">
      <h2>Events</h2>
      <table class="events-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>User</th>
            <th>Source</th>
            <th>Action</th>
            <th>Duration</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          ${events.map(event => `
            <tr>
              <td>${event.name || '-'}</td>
              <td>${event.user}</td>
              <td>${event.source}</td>
              <td>${event.action}</td>
              <td>${event.executionDuration}</td>
              <td>${event.createTime ? new Date(event.createTime).toLocaleString() : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  `
}

// --- Router ---

function updateActiveLink(): void {
  const hash = window.location.hash || '#/'
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === hash)
  })
}

function updateNavVisibility(): void {
  const nav = document.querySelector('header nav') as HTMLElement | null
  if (nav) {
    nav.style.display = ENABLE_EVENTS_PAGE ? '' : 'none'
  }
}

function router(): void {
  const hash = window.location.hash || '#/'
  updateActiveLink()

  switch (hash) {
    case '#/events':
      if (ENABLE_EVENTS_PAGE) {
        renderEventsPage()
      } else {
        renderClassifierPage()
      }
      break
    default:
      renderClassifierPage()
  }
}

// Initialize
updateNavVisibility()
window.addEventListener('hashchange', router)
router()