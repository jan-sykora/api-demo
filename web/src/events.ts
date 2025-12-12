import './style.css'
import { createClient } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-web'
import { create } from '@bufbuild/protobuf'
import { EventService, ListEventsRequestSchema } from './gen/ai/h2o/usage/v1/event_service_pb'
import type { Event } from './gen/ai/h2o/usage/v1/event_pb'

const transport = createConnectTransport({
  baseUrl: 'http://localhost:50051',
})

const client = createClient(EventService, transport)

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

function setup(): void {
  document.getElementById('refresh-btn')!.addEventListener('click', () => {
    currentPageToken = ''
    loadEvents()
  })

  loadEvents()
}

setup()