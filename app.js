const STORAGE_KEY = 'coffee-tracker-v1'
const PAGE_SIZE = 10
const IDLE_CALLBACK_TIMEOUT = 1200

function $(id){ return document.getElementById(id) }

function getTodayDateString() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeCups(value) {
  const cups = Number(value)
  return Number.isFinite(cups) && cups >= 1 ? cups : null
}

function updateStatus(message, tone = 'info') {
  const status = $('appStatus')
  if(!status) return
  status.textContent = message
  status.dataset.tone = tone
}

function reportError(label, error) {
  console.error(`[monitor] ${label}`, error)
}

function reportMetric(name, value) {
  console.info(`[metric] ${name}`, value)
}

window.addEventListener('error', event => {
  reportError('Unexpected error', event.error || event.message)
  updateStatus('Something went wrong. Please refresh.', 'error')
})

window.addEventListener('unhandledrejection', event => {
  reportError('Async error', event.reason)
  updateStatus('Background task failed. Retrying when possible.', 'warn')
})

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch(error) {
    reportError('Saved history could not be read', error)
    updateStatus('Saved history could not be read. Starting fresh.', 'warn')
    return []
  }
}

function save(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }

async function retry(operation, { retries = 2, delay = 250, label = 'Operation failed' } = {}) {
  let lastError

  for(let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation()
    } catch(error) {
      lastError = error
      reportError(`${label} (attempt ${attempt + 1})`, error)
      if(attempt === retries) break
      updateStatus(`${label}. Retrying…`, 'warn')
      await new Promise(resolve => window.setTimeout(resolve, delay * (attempt + 1)))
    }
  }

  throw lastError
}

const state = {
  entries: load(),
  currentPage: 1,
  totalCups: 0,
  todayCups: 0,
  entriesByDate: new Map(),
  sortedEntries: [],
  renderEntriesPage: null
}

function rebuildEntryIndex() {
  const today = getTodayDateString()
  const entriesByDate = new Map()
  let totalCups = 0
  let todayCups = 0

  state.entries.forEach(entry => {
    const cups = Number(entry.cups) || 0
    totalCups += cups
    if(entry.date === today) todayCups += cups

    const bucket = entriesByDate.get(entry.date) || []
    bucket.push(entry)
    entriesByDate.set(entry.date, bucket)
  })

  state.entriesByDate = entriesByDate
  state.sortedEntries = [...state.entries].sort((a, b) => b.id - a.id)
  state.totalCups = totalCups
  state.todayCups = todayCups
}

function getPageCount() {
  return Math.max(1, Math.ceil(state.entries.length / PAGE_SIZE))
}

function clampPage() {
  state.currentPage = Math.min(state.currentPage, getPageCount())
}

function renderSummary() {
  $('totalCups').textContent = state.totalCups
  $('todayCups').textContent = state.todayCups
  const trackedDays = state.entriesByDate.size || 0
  const dayLabel = trackedDays === 1 ? 'day' : 'days'
  $('entriesSummary').textContent = `${state.entries.length} saved across ${trackedDays} ${dayLabel}`
}

function renderListFallback() {
  const list = $('entriesList')
  list.innerHTML = ''

  const li = document.createElement('li')
  li.className = 'entry-placeholder'
  li.textContent = state.entries.length ? 'Loading recent entries…' : 'No entries yet.'
  list.appendChild(li)

  $('paginationControls').hidden = true
}

function render() {
  clampPage()
  renderSummary()

  if(!state.renderEntriesPage) {
    renderListFallback()
    return
  }

  state.renderEntriesPage({
    listEl: $('entriesList'),
    paginationEl: $('paginationControls'),
    entries: state.sortedEntries,
    page: state.currentPage,
    pageSize: PAGE_SIZE,
    onEdit: editEntry,
    onDelete: deleteEntry
  })
}

function persistState(successMessage = 'Saved locally.') {
  rebuildEntryIndex()

  try {
    save(state.entries)
    updateStatus(successMessage)
  } catch(error) {
    reportError('Local save failed', error)
    updateStatus('Saving failed. Your latest change is still available until you refresh.', 'error')
  }

  render()
}

function addEntry(data){
  const entry = Object.assign({ id: Date.now() }, data)
  state.entries.push(entry)
  state.currentPage = 1
  persistState('Saved locally.')
}

function deleteEntry(id){
  if(!confirm('Delete this entry?')) return
  state.entries = state.entries.filter(entry => entry.id !== id)
  persistState('Entry deleted.')
}

function editEntry(id){
  const entry = state.entries.find(item => item.id === id)
  if(!entry) return

  const cups = prompt('Cups', entry.cups)
  if(cups == null) return

  const nextCups = normalizeCups(cups)
  if(nextCups == null) {
    updateStatus('Please enter at least 1 cup.', 'warn')
    return
  }

  const notes = prompt('Notes', entry.notes || '')
  if(notes == null) return

  entry.cups = nextCups
  entry.notes = notes.trim()
  persistState('Entry updated.')
}

function initForm(){
  const form = $('entryForm')
  const dateInput = $('date')

  function resetDateInput() {
    dateInput.value = getTodayDateString()
  }

  resetDateInput()

  form.addEventListener('submit', event => {
    event.preventDefault()
    const cups = normalizeCups($('cups').value)
    if(cups == null) {
      updateStatus('Please enter at least 1 cup.', 'warn')
      return
    }

    const data = {
      date: $('date').value,
      type: $('type').value,
      cups,
      notes: $('notes').value.trim()
    }
    addEntry(data)
    form.reset()
    resetDateInput()
  })
}

function initPagination() {
  $('prevPage').addEventListener('click', () => {
    if(state.currentPage === 1) return
    state.currentPage -= 1
    render()
  })

  $('nextPage').addEventListener('click', () => {
    const pageCount = getPageCount()
    if(state.currentPage >= pageCount) return
    state.currentPage += 1
    render()
  })
}

function scheduleNonCriticalWork(callback) {
  if('requestIdleCallback' in window) {
    try {
      window.requestIdleCallback(callback, { timeout: IDLE_CALLBACK_TIMEOUT })
      return
    } catch(error) {
      reportError('Idle callback scheduling failed', error)
    }
  }

  window.setTimeout(callback, 0)
}

let entriesViewPromise

async function ensureEntriesViewLoaded() {
  if(state.renderEntriesPage) return state.renderEntriesPage

  if(!entriesViewPromise) {
    performance.mark('entries-view-start')
    entriesViewPromise = retry(
      () => import('./entries-view.js'),
      { retries: 2, delay: 300, label: 'Entry history failed to load' }
    ).then(module => {
      state.renderEntriesPage = module.renderEntriesPage
      performance.mark('entries-view-end')
      performance.measure('entries-view-latency', 'entries-view-start', 'entries-view-end')
      const measures = performance.getEntriesByName('entries-view-latency', 'measure')
      const measure = measures[measures.length - 1]
      if(measure) reportMetric('entries_view_load_ms', Math.round(measure.duration))
      return state.renderEntriesPage
    })
  }

  return entriesViewPromise
}

function bootEntriesView() {
  scheduleNonCriticalWork(async () => {
    try {
      if(state.entries.length) updateStatus('Loading recent entries…')
      await ensureEntriesViewLoaded()
      render()
      updateStatus('Ready')
    } catch(error) {
      reportError('Entry history unavailable', error)
      updateStatus('Entry history is temporarily unavailable. Please refresh.', 'error')
    }
  })
}

async function registerServiceWorker() {
  if(!('serviceWorker' in navigator)) return
  if(!/^https?:$/.test(window.location.protocol)) return

  try {
    await retry(
      () => navigator.serviceWorker.register('./service-worker.js'),
      { retries: 2, delay: 400, label: 'Offline cache setup failed' }
    )
    reportMetric('service_worker', 'registered')
  } catch(error) {
    reportError('Offline cache unavailable', error)
    updateStatus('Offline cache unavailable. Continuing without it.', 'warn')
  }
}

rebuildEntryIndex()
initForm()
initPagination()
render()
bootEntriesView()
window.addEventListener('load', registerServiceWorker)
