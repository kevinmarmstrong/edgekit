import { EdgeChat as EdgeChatElement } from '@kevinmarmstrong/edgekit-ui'
import { chromeAI, createModelProvider, modelOptional, tool, webLLM } from '@kevinmarmstrong/edgekit'
import type { LanguageModelV3 } from '@kevinmarmstrong/edgekit'
import type { EdgeChat } from '@kevinmarmstrong/edgekit-ui'
import { z } from 'zod'
import './styles.css'

// --- Types ---

type Announcement = {
  id: string; title: string; body: string; date: string
  category: 'general' | 'maintenance' | 'safety' | 'event'
  priority: 'normal' | 'urgent'
}

type Amenity = {
  id: string; name: string; description: string
  capacity: number; hoursOpen: string; bookingRequired: boolean
}

type AmenityBooking = {
  id: string; amenityId: string; date: string
  startTime: string; endTime: string; residentUnit: string
}

type MaintenanceRequest = {
  id: string; unit: string; category: string; description: string
  status: 'open' | 'in-progress' | 'resolved'; submittedAt: string
}

type Document = {
  id: string; title: string
  category: 'governing' | 'financial' | 'meeting' | 'policy'
  updatedAt: string; summary: string
}

type CommunityEvent = {
  id: string; title: string; date: string; time: string
  location: string; description: string; rsvpCount: number
}

type Vote = {
  id: string; title: string; description: string
  options: { id: string; label: string; count: number }[]
  deadline: string; status: 'open' | 'closed'
}

type ApprovalToolCall = {
  type?: string; toolCallId: string; toolName: string
  input: Record<string, unknown>
}

// --- Community data ---

const RESIDENT_UNIT = '4B'

const announcements: Announcement[] = [
  {
    id: 'ann-001', title: 'Pool Hours Extended for Summer',
    body: 'The community pool is now open until 10 PM on Fridays and Saturdays through Labor Day.',
    date: '2026-06-01', category: 'general', priority: 'normal',
  },
  {
    id: 'ann-002', title: 'Water Shutoff — Building C — June 12',
    body: 'Scheduled maintenance requires a water shutoff in Building C from 9 AM–1 PM on June 12. Plan accordingly.',
    date: '2026-06-05', category: 'maintenance', priority: 'urgent',
  },
  {
    id: 'ann-003', title: 'Parking Lot Resurfacing June 15–17',
    body: 'Sections A and B will be closed June 15–17 for resurfacing. Alternative parking available on Level P2.',
    date: '2026-06-07', category: 'maintenance', priority: 'normal',
  },
  {
    id: 'ann-004', title: 'Summer Kickoff Block Party — June 21',
    body: 'Food, music, and lawn games at the Clubhouse Lawn. RSVP by June 18 so we can plan catering.',
    date: '2026-06-08', category: 'event', priority: 'normal',
  },
  {
    id: 'ann-005', title: 'Package Locker System Upgraded',
    body: 'All residents must re-register their phone number at the main entrance kiosk.',
    date: '2026-06-03', category: 'general', priority: 'normal',
  },
]

const amenities: Amenity[] = [
  { id: 'pool', name: 'Community Pool', description: 'Heated outdoor pool with lap lanes and loungers.', capacity: 40, hoursOpen: 'Daily 7 AM–10 PM', bookingRequired: false },
  { id: 'gym', name: 'Fitness Center', description: '24-hour fitness center with cardio and free weights.', capacity: 15, hoursOpen: '24/7', bookingRequired: false },
  { id: 'clubhouse', name: 'Clubhouse', description: 'Event space with full kitchen, seating for 80.', capacity: 80, hoursOpen: 'Mon–Sat 8 AM–11 PM, Sun 10 AM–8 PM', bookingRequired: true },
  { id: 'tennis', name: 'Tennis Courts', description: 'Two lighted hard courts, USTA regulation.', capacity: 4, hoursOpen: 'Daily 7 AM–10 PM', bookingRequired: true },
  { id: 'dog-park', name: 'Dog Park', description: 'Fenced with separate large/small dog areas.', capacity: 20, hoursOpen: 'Daily 6 AM–9 PM', bookingRequired: false },
  { id: 'ev-station', name: 'EV Charging', description: '8 Level 2 charging spots in P1 parking.', capacity: 8, hoursOpen: '24/7', bookingRequired: true },
]

const bookings: AmenityBooking[] = [
  { id: 'bk-001', amenityId: 'clubhouse', date: '2026-06-14', startTime: '14:00', endTime: '18:00', residentUnit: '12A' },
  { id: 'bk-002', amenityId: 'tennis', date: '2026-06-10', startTime: '09:00', endTime: '10:00', residentUnit: '7C' },
]

const maintenanceRequests: MaintenanceRequest[] = [
  { id: 'req-001', unit: '4B', category: 'plumbing', description: 'Slow drain in master bath shower', status: 'in-progress', submittedAt: '2026-05-28' },
  { id: 'req-002', unit: '4B', category: 'electrical', description: 'Outlet not working in kitchen', status: 'open', submittedAt: '2026-06-02' },
]

const documents: Document[] = [
  { id: 'doc-001', title: 'CC&Rs', category: 'governing', updatedAt: '2024-01-15', summary: 'Property use rules, architectural standards, and resident obligations.' },
  { id: 'doc-002', title: 'HOA Bylaws', category: 'governing', updatedAt: '2024-01-15', summary: 'Governance, board composition, meeting procedures, and voting rights.' },
  { id: 'doc-003', title: 'May 2026 Board Meeting Minutes', category: 'meeting', updatedAt: '2026-05-20', summary: 'Approved parking resurfacing. Reviewed Q1 financials. No dues increase for 2026.' },
  { id: 'doc-004', title: 'Q1 2026 Financial Report', category: 'financial', updatedAt: '2026-04-10', summary: 'Reserve fund at 92% of target. No special assessments planned.' },
  { id: 'doc-005', title: 'Pet Policy', category: 'policy', updatedAt: '2025-09-01', summary: 'Max 2 pets per unit. Dogs leashed in common areas. Dog park registration required.' },
  { id: 'doc-006', title: 'Noise & Quiet Hours', category: 'policy', updatedAt: '2025-03-15', summary: 'Quiet hours 10 PM–8 AM weekdays, 11 PM–9 AM weekends.' },
]

const events: CommunityEvent[] = [
  { id: 'evt-001', title: 'Summer Kickoff Block Party', date: '2026-06-21', time: '4:00–8:00 PM', location: 'Clubhouse Lawn', description: 'Catered BBQ, lawn games, and live music.', rsvpCount: 34 },
  { id: 'evt-002', title: 'Monthly Board Meeting', date: '2026-06-17', time: '7:00–8:30 PM', location: 'Clubhouse Room A', description: 'Open to all residents. Agenda: landscaping contract, pool gate replacement.', rsvpCount: 12 },
  { id: 'evt-003', title: 'Outdoor Movie Night', date: '2026-07-05', time: '8:30 PM', location: 'Pool Deck', description: 'Inside Out 2. Bring blankets. Popcorn provided.', rsvpCount: 47 },
  { id: 'evt-004', title: 'Community Garden Workday', date: '2026-06-14', time: '9:00 AM–noon', location: 'Community Garden', description: 'Plant summer vegetables and herbs. Gloves and tools provided.', rsvpCount: 8 },
]

const votes: Vote[] = [
  {
    id: 'vote-001', title: 'Approve 2027 Budget Proposal',
    description: 'The board proposes a 3.5% dues increase for 2027 to fund reserve replenishment.',
    options: [
      { id: 'yes', label: 'Approve', count: 42 },
      { id: 'no', label: 'Reject', count: 18 },
      { id: 'abstain', label: 'Abstain', count: 5 },
    ],
    deadline: '2026-06-30', status: 'open',
  },
]

const rsvps = new Set<string>()
const castVotes = new Map<string, string>()

// --- Tools ---

const getAnnouncements = tool({
  description: 'Get community announcements. Optionally filter by category or keyword.',
  inputSchema: z.object({
    query: modelOptional(z.string()).describe('Keyword to search'),
    category: modelOptional(z.enum(['general', 'maintenance', 'safety', 'event'])),
    urgentOnly: modelOptional(z.boolean()),
  }),
  execute: async ({ query, category, urgentOnly }) => {
    let results = [...announcements]
    if (urgentOnly) results = results.filter(a => a.priority === 'urgent')
    if (category) results = results.filter(a => a.category === category)
    if (query) {
      const q = query.toLowerCase()
      results = results.filter(a =>
        a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q))
    }
    return { results, total: results.length }
  },
})

const checkAmenityAvailability = tool({
  description: 'Check community amenities, their hours, and existing bookings on a date.',
  inputSchema: z.object({
    amenityId: modelOptional(z.string()).describe('Specific amenity ID, or omit for all amenities'),
    date: modelOptional(z.string()).describe('Date to check bookings (YYYY-MM-DD)'),
  }),
  execute: async ({ amenityId, date }) => {
    const list = amenityId ? amenities.filter(a => a.id === amenityId) : amenities
    return {
      amenities: list.map(amenity => ({
        ...amenity,
        bookingsOnDate: date
          ? bookings
              .filter(b => b.amenityId === amenity.id && b.date === date)
              .map(b => ({ startTime: b.startTime, endTime: b.endTime }))
          : [],
      })),
    }
  },
})

const bookAmenity = tool({
  description: 'Reserve a bookable amenity (clubhouse, tennis, or EV charging) for a specific date and time. Requires resident approval.',
  inputSchema: z.object({
    amenityId: z.enum(['clubhouse', 'tennis', 'ev-station']),
    date: z.string().describe('Date in YYYY-MM-DD'),
    startTime: z.string().describe('Start time HH:MM (24-hour)'),
    endTime: z.string().describe('End time HH:MM (24-hour)'),
  }),
  execute: async ({ amenityId, date, startTime, endTime }) => {
    const amenity = amenities.find(a => a.id === amenityId)
    if (!amenity) return { success: false, error: 'Amenity not found' }
    const conflict = bookings.find(
      b => b.amenityId === amenityId && b.date === date &&
        b.startTime < endTime && b.endTime > startTime)
    if (conflict) return { success: false, error: `Already booked ${conflict.startTime}–${conflict.endTime} on ${date}` }
    const id = `bk-${Date.now()}`
    bookings.push({ id, amenityId, date, startTime, endTime, residentUnit: RESIDENT_UNIT })
    renderBookingStatus()
    return { success: true, bookingId: id, amenity: amenity.name, date, startTime, endTime }
  },
  needsApproval: true,
})

const submitMaintenanceRequest = tool({
  description: 'Submit a maintenance or repair request for your unit or a common area. Requires resident approval.',
  inputSchema: z.object({
    category: z.enum(['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'common-area', 'pest', 'other']),
    description: z.string().describe('Describe the issue in detail'),
    urgency: z.enum(['routine', 'urgent', 'emergency']),
    location: modelOptional(z.string()).describe('Specific location, e.g., kitchen, master bath'),
  }),
  execute: async ({ category, description, urgency, location }) => {
    const id = `req-${Date.now()}`
    maintenanceRequests.push({
      id, unit: RESIDENT_UNIT, category,
      description: location ? `${description} (${location})` : description,
      status: 'open', submittedAt: new Date().toISOString().split('T')[0],
    })
    renderRequestStatus()
    const eta = urgency === 'emergency' ? '2–4 hours' : urgency === 'urgent' ? '24 hours' : '3–5 business days'
    return { success: true, requestId: id, category, urgency, estimatedResponse: eta }
  },
  needsApproval: true,
})

const checkRequestStatus = tool({
  description: 'Check open maintenance requests for your unit.',
  inputSchema: z.object({
    requestId: modelOptional(z.string()).describe('Specific request ID, or omit to get all requests'),
  }),
  execute: async ({ requestId }) => {
    const mine = maintenanceRequests.filter(r => r.unit === RESIDENT_UNIT)
    if (requestId) {
      const req = mine.find(r => r.id === requestId)
      return req ? { found: true, request: req } : { found: false }
    }
    return { requests: mine, open: mine.filter(r => r.status !== 'resolved').length }
  },
})

const getDocuments = tool({
  description: 'Search community documents: CC&Rs, bylaws, financial reports, meeting minutes, and policies.',
  inputSchema: z.object({
    query: modelOptional(z.string()),
    category: modelOptional(z.enum(['governing', 'financial', 'meeting', 'policy'])),
  }),
  execute: async ({ query, category }) => {
    let results = [...documents]
    if (category) results = results.filter(d => d.category === category)
    if (query) {
      const q = query.toLowerCase()
      results = results.filter(d =>
        d.title.toLowerCase().includes(q) || d.summary.toLowerCase().includes(q))
    }
    return { results, total: results.length }
  },
})

const getUpcomingEvents = tool({
  description: 'List upcoming community events.',
  inputSchema: z.object({
    query: modelOptional(z.string()).describe('Search events by name or description'),
  }),
  execute: async ({ query }) => {
    let results = [...events].sort((a, b) => a.date.localeCompare(b.date))
    if (query) {
      const q = query.toLowerCase()
      results = results.filter(e =>
        e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q))
    }
    return { events: results.map(e => ({ ...e, yourRsvp: rsvps.has(e.id) })) }
  },
})

const rsvpEvent = tool({
  description: 'RSVP to a community event. Requires resident approval.',
  inputSchema: z.object({ eventId: z.string() }),
  execute: async ({ eventId }) => {
    const event = events.find(e => e.id === eventId)
    if (!event) return { success: false, error: 'Event not found' }
    if (rsvps.has(eventId)) return { success: false, alreadyRsvp: true, message: `Already RSVP'd to ${event.title}` }
    rsvps.add(eventId)
    event.rsvpCount += 1
    renderEventStatus()
    return { success: true, event: event.title, date: event.date, time: event.time, location: event.location }
  },
  needsApproval: true,
})

const getOpenVotes = tool({
  description: 'Get open community votes and your current ballot status.',
  inputSchema: z.object({}),
  execute: async () => ({
    votes: votes.filter(v => v.status === 'open').map(v => ({ ...v, yourVote: castVotes.get(v.id) ?? null })),
  }),
})

const castVote = tool({
  description: 'Cast your vote on an open community ballot item. Requires resident approval.',
  inputSchema: z.object({
    voteId: z.string(),
    optionId: z.string().describe('Chosen option ID — e.g., yes, no, abstain'),
  }),
  execute: async ({ voteId, optionId }) => {
    const vote = votes.find(v => v.id === voteId && v.status === 'open')
    if (!vote) return { success: false, error: 'Vote not found or closed' }
    if (castVotes.has(voteId)) return { success: false, alreadyVoted: true }
    const option = vote.options.find(o => o.id === optionId)
    if (!option) return { success: false, error: 'Invalid option' }
    option.count += 1
    castVotes.set(voteId, optionId)
    renderVoteStatus()
    return { success: true, vote: vote.title, yourChoice: option.label }
  },
  needsApproval: true,
})

const allTools = {
  getAnnouncements, checkAmenityAvailability, bookAmenity,
  submitMaintenanceRequest, checkRequestStatus, getDocuments,
  getUpcomingEvents, rsvpEvent, getOpenVotes, castVote,
}

// --- Agent setup ---

const params = new URLSearchParams(window.location.search)
const scriptedMode = params.get('agentMode') === 'scripted'
const modelMode = params.get('modelMode') ?? 'chrome'
const downloadPolicy = params.get('downloadPolicy') === 'auto' ? 'auto' : 'never'

ensureEdgeChatDefined()
const chat = document.querySelector<EdgeChat>('edge-chat')

if (scriptedMode) {
  chat?.configure({
    model: [scriptedProvider()],
    streamText: createScriptedStream() as never,
  })
} else {
  chat?.configure({
    model: commonsModelCascade(modelMode),
    downloadPolicy,
    toolProvider: ({ input }) => toolsForInput(input),
    onNoModel: ({ input }) => staticFallback(input),
  })
}

chat?.registerTools(allTools)
chat?.registerActions(({ toolName, output }) => {
  if (toolName === 'getUpcomingEvents' && isRecord(output) && Array.isArray(output.events)) {
    return (output.events as Array<CommunityEvent & { yourRsvp: boolean }>)
      .filter(e => !e.yourRsvp)
      .slice(0, 3)
      .map(event => ({
        id: `rsvp-${event.id}`,
        label: `RSVP: ${event.title}`,
        toolName: 'rsvpEvent',
        description: `${event.date} · ${event.time} · ${event.location}`,
        input: { eventId: event.id },
        successMessage: () => `You're going to ${event.title}!`,
      }))
  }
  return []
})

// --- Render ---

renderAnnouncements()
renderAmenities()
renderEventStatus()
renderRequestStatus()
renderBookingStatus()
renderVoteStatus()

function renderAnnouncements() {
  const el = document.querySelector<HTMLElement>('#announcements')
  if (!el) return
  el.innerHTML = [...announcements]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4)
    .map(ann => `
      <article class="ann-card${ann.priority === 'urgent' ? ' ann-urgent' : ''}" data-testid="announcement-card">
        <div class="ann-header">
          <span class="ann-cat">${ann.category}</span>
          ${ann.priority === 'urgent' ? '<span class="ann-badge">Urgent</span>' : ''}
        </div>
        <h3>${ann.title}</h3>
        <p>${ann.body}</p>
        <time datetime="${ann.date}">${formatDate(ann.date)}</time>
      </article>`)
    .join('')
}

function renderAmenities() {
  const el = document.querySelector<HTMLElement>('#amenities')
  if (!el) return
  el.innerHTML = amenities.map(amenity => `
    <article class="amenity-card" data-testid="amenity-card">
      <div class="amenity-icon" aria-hidden="true">${amenityIcon(amenity.id)}</div>
      <div class="amenity-body">
        <h3>${amenity.name}</h3>
        <p>${amenity.description}</p>
        <dl>
          <div><dt>Hours</dt><dd>${amenity.hoursOpen}</dd></div>
          <div><dt>Capacity</dt><dd>${amenity.capacity}</dd></div>
          <div><dt>Booking</dt><dd>${amenity.bookingRequired ? 'Required' : 'Open access'}</dd></div>
        </dl>
      </div>
    </article>`).join('')
}

function renderEventStatus() {
  const el = document.querySelector<HTMLElement>('#events-status')
  if (!el) return
  el.innerHTML = [...events]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(event => `
      <div class="event-row" data-testid="event-row">
        <div class="event-date-badge">
          <span class="event-month">${shortMonth(event.date)}</span>
          <span class="event-day">${dayOfMonth(event.date)}</span>
        </div>
        <div class="event-info">
          <strong>${event.title}</strong>
          <span>${event.time} · ${event.location}</span>
          <span>${event.rsvpCount} attending${rsvps.has(event.id) ? ' · <strong>You\'re going!</strong>' : ''}</span>
        </div>
      </div>`)
    .join('')
}

function renderRequestStatus() {
  const el = document.querySelector<HTMLElement>('#request-status')
  if (!el) return
  const mine = maintenanceRequests.filter(r => r.unit === RESIDENT_UNIT && r.status !== 'resolved')
  if (mine.length === 0) { el.textContent = 'No open requests'; return }
  el.innerHTML = mine.map(req => `
    <div class="req-row status-${req.status}" data-testid="request-row">
      <span class="req-cat">${req.category}</span>
      <span class="req-status">${statusLabel(req.status)}</span>
      <span class="req-desc">${req.description}</span>
    </div>`).join('')
}

function renderBookingStatus() {
  const el = document.querySelector<HTMLElement>('#booking-status')
  if (!el) return
  const mine = bookings.filter(b => b.residentUnit === RESIDENT_UNIT)
  if (mine.length === 0) { el.textContent = 'No upcoming reservations'; return }
  el.innerHTML = mine.map(b => {
    const amenity = amenities.find(a => a.id === b.amenityId)
    return `<div class="booking-row">${amenity?.name ?? b.amenityId} · ${b.date} · ${b.startTime}–${b.endTime}</div>`
  }).join('')
}

function renderVoteStatus() {
  const el = document.querySelector<HTMLElement>('#vote-status')
  if (!el) return
  const open = votes.filter(v => v.status === 'open')
  if (open.length === 0) { el.textContent = 'No open votes'; return }
  el.innerHTML = open.map(v => {
    const myVote = castVotes.get(v.id)
    const myOption = v.options.find(o => o.id === myVote)
    return `<div class="vote-row">
      <span class="vote-title">${v.title}</span>
      <span class="vote-deadline">Closes ${formatDate(v.deadline)}</span>
      ${myOption ? `<span class="voted">You voted: ${myOption.label}</span>` : '<span class="not-voted">Not yet voted</span>'}
    </div>`
  }).join('')
}

// --- Model cascade ---

function commonsModelCascade(mode: string) {
  if (mode === 'none') return [createModelProvider({ id: 'no-model', label: 'No model', resolve: async () => null })]
  if (mode === 'webllm') return [webLLM({ modelSize: 'about 400 MB' })]
  if (mode === 'cascade') return [chromeAI(), webLLM({ modelSize: 'about 400 MB' })]
  return [chromeAI()]
}

function toolsForInput(input: string) {
  const lower = input.toLowerCase()
  if (/\b(book|reserve|reservation|clubhouse|tennis|ev|charging)\b/.test(lower))
    return { checkAmenityAvailability, bookAmenity }
  if (/\b(maintenance|repair|broken|leak|fix|issue|problem|request)\b/.test(lower))
    return { submitMaintenanceRequest, checkRequestStatus }
  if (/\b(vote|ballot|budget|proposal)\b/.test(lower))
    return { getOpenVotes, castVote }
  if (/\b(event|rsvp|party|meeting|movie|garden)\b/.test(lower))
    return { getUpcomingEvents, rsvpEvent }
  if (/\b(document|bylaw|rule|policy|ccr|minutes|financial|report)\b/.test(lower))
    return { getDocuments }
  return allTools
}

function staticFallback(input: string) {
  const lower = input.toLowerCase()
  if (/\b(announcement|notice|news|update)\b/.test(lower)) {
    const urgent = announcements.filter(a => a.priority === 'urgent')
    return urgent.length > 0
      ? `Browser AI unavailable. Urgent notices: ${urgent.map(a => a.title).join('; ')}.`
      : `Browser AI unavailable. Latest: ${announcements[0]?.title ?? 'No announcements'}.`
  }
  if (/\b(event|happening|schedule)\b/.test(lower)) {
    return `Browser AI unavailable. Upcoming: ${events.slice(0, 2).map(e => `${e.title} on ${e.date}`).join(', ')}.`
  }
  return 'Browser AI is unavailable. Browse announcements, events, and amenities above.'
}

// --- Scripted mode for CI / demos ---

function scriptedProvider() {
  return createModelProvider({
    id: 'scripted',
    label: 'Scripted agent',
    resolve: async () => ({ provider: 'scripted', modelId: 'commons-workflow', specificationVersion: 'v3' } as LanguageModelV3),
  })
}

function createScriptedStream() {
  return (options: { messages?: unknown[]; tools?: Record<string, unknown> }) => {
    const messages = options.messages ?? []
    const approval = findLatestApprovalResponse(messages)
    if (approval) {
      return approval.approved
        ? createApprovedStream(options.tools ?? {}, approval.toolCall)
        : createRejectedStream(approval.toolCall)
    }
    const input = latestUserInput(messages)
    if (/\b(maintenance|repair|leak|broken|issue)\b/i.test(input))
      return createMaintenanceStream(options.tools ?? {})
    return createAnnouncementsStream(options.tools ?? {})
  }
}

async function* announcementsGenerator(tools: Record<string, unknown>): AsyncGenerator<Record<string, unknown>> {
  const callId = 'call-announcements'
  yield { type: 'tool-call', toolCallId: callId, toolName: 'getAnnouncements', input: {} }
  const output = await executeTool(tools.getAnnouncements, {})
  yield { type: 'tool-result', toolCallId: callId, toolName: 'getAnnouncements', output }
  const results = isRecord(output) && Array.isArray(output.results) ? output.results as Announcement[] : []
  const urgent = results.filter(a => a.priority === 'urgent')
  const delta = urgent.length > 0
    ? `${urgent.length} urgent notice${urgent.length > 1 ? 's' : ''}: ${urgent.map(a => a.title).join(', ')}.`
    : `${results.length} recent announcements retrieved.`
  yield { type: 'text-delta', delta }
}

function createAnnouncementsStream(tools: Record<string, unknown>) {
  return {
    fullStream: announcementsGenerator(tools),
    response: Promise.resolve({ messages: [{ role: 'assistant', content: [{ type: 'text', text: 'Announcements loaded.' }] }] }),
  }
}

async function* maintenanceGenerator(_tools: Record<string, unknown>): AsyncGenerator<Record<string, unknown>> {
  const callId = 'call-maintenance'
  const toolInput = { category: 'plumbing', description: 'Slow drain in bathroom', urgency: 'routine' }
  yield { type: 'text-delta', delta: 'I can submit a maintenance request. Please review the details below.' }
  yield {
    type: 'tool-approval-request', approvalId: 'approval-maintenance',
    toolCall: { type: 'tool-call', toolCallId: callId, toolName: 'submitMaintenanceRequest', input: toolInput },
  }
}

function createMaintenanceStream(tools: Record<string, unknown>) {
  const callId = 'call-maintenance'
  const toolInput = { category: 'plumbing', description: 'Slow drain in bathroom', urgency: 'routine' }
  return {
    fullStream: maintenanceGenerator(tools),
    response: Promise.resolve({
      messages: [{
        role: 'assistant',
        content: [{ type: 'tool-approval-request', approvalId: 'approval-maintenance', toolCall: { type: 'tool-call', toolCallId: callId, toolName: 'submitMaintenanceRequest', input: toolInput } }],
      }],
    }),
  }
}

function createApprovedStream(tools: Record<string, unknown>, approvedToolCall: ApprovalToolCall | null) {
  const tc = approvedToolCall ?? { type: 'tool-call', toolCallId: 'call-action', toolName: 'submitMaintenanceRequest', input: { category: 'plumbing', description: 'Slow drain in bathroom', urgency: 'routine' } }
  return {
    fullStream: (async function* () {
      yield { type: 'tool-call', toolCallId: tc.toolCallId, toolName: tc.toolName, input: tc.input }
      const output = await executeTool(tools[tc.toolName], tc.input)
      yield { type: 'tool-result', toolCallId: tc.toolCallId, toolName: tc.toolName, output }
      yield { type: 'text-delta', delta: 'Done. Your request has been submitted and our team will follow up.' }
    })(),
    response: Promise.resolve({ messages: [{ role: 'assistant', content: [{ type: 'text', text: 'Request submitted.' }] }] }),
  }
}

function createRejectedStream(rejectedToolCall: ApprovalToolCall | null) {
  const name = rejectedToolCall?.toolName.replace(/([A-Z])/g, ' $1').toLowerCase() ?? 'action'
  return {
    fullStream: (async function* () { yield { type: 'text-delta', delta: `Cancelled — no ${name} was submitted.` } })(),
    response: Promise.resolve({ messages: [{ role: 'assistant', content: [{ type: 'text', text: 'Cancelled.' }] }] }),
  }
}

// --- Utilities ---

function latestUserInput(messages: unknown[]) {
  const msg = [...messages].reverse().find(
    (m): m is { role: string; content: unknown } => isRecord(m) && m.role === 'user')
  return typeof msg?.content === 'string' ? msg.content : ''
}

function findLatestApprovalResponse(messages: unknown[]) {
  const toolMsg = [...messages].reverse().find(
    (m): m is { role: string; content: unknown } => isRecord(m) && m.role === 'tool')
  const content = Array.isArray(toolMsg?.content) ? toolMsg.content : []
  const approval = content.find(
    (p): p is { type: string; approved: boolean; toolCall?: unknown } =>
      isRecord(p) && p.type === 'tool-approval-response' && typeof p.approved === 'boolean')
  return approval ? { ...approval, toolCall: normalizeToolCall(approval.toolCall) } : undefined
}

function normalizeToolCall(value: unknown): ApprovalToolCall | null {
  if (!isRecord(value) || typeof value.toolCallId !== 'string' || typeof value.toolName !== 'string' || !isRecord(value.input)) return null
  return { type: typeof value.type === 'string' ? value.type : undefined, toolCallId: value.toolCallId, toolName: value.toolName, input: value.input }
}

async function executeTool(toolDef: unknown, input: Record<string, unknown>) {
  const t = toolDef as { execute?: (i: Record<string, unknown>) => unknown | Promise<unknown> }
  return t?.execute ? t.execute(input) : { error: 'Not executable.' }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function ensureEdgeChatDefined() {
  if (!customElements.get('edge-chat')) customElements.define('edge-chat', EdgeChatElement)
}

function amenityIcon(id: string): string {
  const icons: Record<string, string> = {
    pool: '🏊', gym: '🏋️', clubhouse: '🏛️', tennis: '🎾', 'dog-park': '🐾', 'ev-station': '⚡',
  }
  return icons[id] ?? '🏢'
}

function statusLabel(status: string): string {
  return ({ open: 'Open', 'in-progress': 'In Progress', resolved: 'Resolved' } as Record<string, string>)[status] ?? status
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function shortMonth(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
}

function dayOfMonth(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00`).getDate()
}
