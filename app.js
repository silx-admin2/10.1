const STORAGE_KEY = 'coffee-tracker-v1'

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch(e){ return [] }
}

function save(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }

function $(id){ return document.getElementById(id) }

const state = { entries: load() }

function render() {
  const list = $('entriesList')
  list.innerHTML = ''
  state.entries.sort((a,b)=> b.id - a.id).forEach(e=>{
    const li = document.createElement('li')
    const info = document.createElement('div')
    info.className = 'entry-info'
    info.innerHTML = `<div><strong>${escapeHtml(e.type)}</strong> — ${e.cups} cup(s) on ${e.date}</div><div class="muted">${escapeHtml(e.notes||'')}</div>`

    const actions = document.createElement('div')
    actions.className = 'entry-actions'
    const editBtn = document.createElement('button')
    editBtn.textContent = 'Edit'
    editBtn.onclick = ()=> editEntry(e.id)
    const delBtn = document.createElement('button')
    delBtn.textContent = 'Delete'
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
  save(state.entries)
  render()
}

function editEntry(id){
  const e = state.entries.find(x=> x.id===id)
  if(!e) return
  const cups = prompt('Cups', e.cups)
  if(cups==null) return
  const notes = prompt('Notes', e.notes||'')
  e.cups = Number(cups) || e.cups
  e.notes = notes
  save(state.entries)
  render()
}

function escapeHtml(s){ if(!s) return '';
  return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
}

function initForm(){
  const form = $('entryForm')
  const dateInput = $('date')
  dateInput.value = new Date().toISOString().slice(0,10)

  form.addEventListener('submit', e=>{
    e.preventDefault()
    const data = {
      date: $('date').value,
      type: $('type').value,
      cups: Number($('cups').value)||1,
      notes: $('notes').value.trim()
    }
    addEntry(data)
    form.reset()
    dateInput.value = new Date().toISOString().slice(0,10)
  })
}

initForm()
render()
