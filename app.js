const STORAGE_KEY = 'coffee-tracker-v1'
const FIELD_IDS = ['date', 'cups', 'notes']

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch(e){ return [] }
}

function save(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }

function $(id){ return document.getElementById(id) }

const state = { entries: load(), editingId: null }

function todayValue() {
  return new Date().toISOString().slice(0,10)
}

function getFormData() {
  return {
    date: $('date').value,
    type: $('type').value,
    cups: Number($('cups').value),
    notes: $('notes').value.trim()
  }
}

function setFieldError(id, message) {
  $(id).setAttribute('aria-invalid', message ? 'true' : 'false')
  $(`${id}Error`).textContent = message || ''
}

function clearFieldErrors() {
  FIELD_IDS.forEach(id => setFieldError(id, ''))
}

function validateEntry(data) {
  const errors = {}
  if(!data.date) errors.date = 'Choose a date for this coffee entry.'
  if(!Number.isInteger(data.cups) || data.cups < 1) errors.cups = 'Enter at least 1 whole cup.'
  if(data.notes.length > 100) errors.notes = 'Keep notes to 100 characters or fewer.'
  return errors
}

function showStatus(message, isError){
  const status = $('formStatus')
  status.textContent = message || ''
  const classes = ['status-message']
  if(message) classes.push(isError ? 'is-error' : 'is-success')
  status.className = classes.join(' ')
}

function setFormMode() {
  const isEditing = state.editingId !== null
  $('formTitle').textContent = isEditing ? 'Edit entry' : 'Add entry'
  $('submitButton').textContent = isEditing ? 'Save changes' : 'Add entry'
  $('submitButton').setAttribute('aria-label', isEditing ? 'Save coffee entry changes' : 'Add coffee entry')
  $('cancelEdit').hidden = !isEditing
}

function resetForm(keepStatus){
  $('entryForm').reset()
  $('date').value = todayValue()
  $('cups').value = '1'
  state.editingId = null
  clearFieldErrors()
  setFormMode()
  if(!keepStatus) showStatus('', false)
}

function startEdit(id){
  const entry = state.entries.find(item => item.id === id)
  if(!entry) return
  state.editingId = id
  $('date').value = entry.date
  $('type').value = entry.type
  $('cups').value = String(entry.cups)
  $('notes').value = entry.notes || ''
  clearFieldErrors()
  setFormMode()
  showStatus('Update the fields below, then save your changes.', false)
  $('cups').focus()
}

function render() {
  const list = $('entriesList')
  list.innerHTML = ''
  $('onboarding').hidden = state.entries.length > 0
  $('emptyState').hidden = state.entries.length > 0

  state.entries.slice().sort((a,b)=> b.id - a.id).forEach(e=>{
    const li = document.createElement('li')
    const info = document.createElement('div')
    info.className = 'entry-info'
    info.innerHTML = `<div><strong>${escapeHtml(e.type)}</strong> — ${e.cups} cup(s) on ${e.date}</div><div class="muted">${escapeHtml(e.notes||'')}</div>`

    const actions = document.createElement('div')
    actions.className = 'entry-actions'
    const editBtn = document.createElement('button')
    editBtn.type = 'button'
    editBtn.textContent = 'Edit'
    editBtn.setAttribute('aria-label', `Edit ${e.type} entry from ${e.date}`)
    editBtn.onclick = ()=> startEdit(e.id)
    const delBtn = document.createElement('button')
    delBtn.type = 'button'
    delBtn.textContent = 'Delete'
    delBtn.setAttribute('aria-label', `Delete ${e.type} entry from ${e.date}`)
    delBtn.onclick = ()=> deleteEntry(e.id)

    actions.appendChild(editBtn)
    actions.appendChild(delBtn)
    li.appendChild(info)
    li.appendChild(actions)
    list.appendChild(li)
  })

  // summaries
  const total = state.entries.reduce((s,it)=> s + Number(it.cups),0)
  $('totalCups').textContent = total
  const today = new Date().toISOString().slice(0,10)
  const todayTotal = state.entries.filter(it=> it.date===today).reduce((s,it)=> s+Number(it.cups),0)
  $('todayCups').textContent = todayTotal
}

function addEntry(data){
  const entry = Object.assign({ id: Date.now() }, data)
  state.entries.push(entry)
  save(state.entries)
  render()
}

function deleteEntry(id){
  if(!confirm('Delete this entry?')) return
  state.entries = state.entries.filter(e=> e.id !== id)
  if(state.editingId === id) resetForm(true)
  save(state.entries)
  render()
  showStatus('Entry deleted.', false)
}

function updateEntry(id, data){
  const entry = state.entries.find(item => item.id === id)
  if(!entry) return
  Object.assign(entry, data)
  save(state.entries)
  render()
}

function escapeHtml(s){ if(!s) return '';
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
}

function initForm(){
  const form = $('entryForm')
  resetForm()

  FIELD_IDS.forEach(id => {
    const eventName = id === 'notes' ? 'input' : 'change'
    $(id).addEventListener(eventName, ()=>{
      const errors = validateEntry(getFormData())
      setFieldError(id, errors[id] || '')
      if(!errors[id] && $('formStatus').classList.contains('is-error')) showStatus('', false)
    })
  })

  form.addEventListener('submit', e=>{
    e.preventDefault()
    const data = getFormData()
    const errors = validateEntry(data)

    clearFieldErrors()
    FIELD_IDS.forEach(id => setFieldError(id, errors[id] || ''))

    if(Object.keys(errors).length){
      showStatus('Please fix the highlighted fields and try again.', true)
      const firstInvalid = FIELD_IDS.find(id => errors[id])
      if(firstInvalid) $(firstInvalid).focus()
      return
    }

    if(state.editingId !== null){
      updateEntry(state.editingId, data)
      resetForm(true)
      showStatus('Entry updated.', false)
      return
    }

    addEntry(data)
    resetForm(true)
    showStatus('Entry added.', false)
  })

  form.addEventListener('keydown', e=>{
    if(e.key === 'Escape' && state.editingId !== null){
      resetForm()
      showStatus('Edit cancelled.', false)
      $('date').focus()
    }
  })

  $('cancelEdit').addEventListener('click', ()=>{
    resetForm()
    showStatus('Edit cancelled.', false)
    $('date').focus()
  })
}

initForm()
render()
