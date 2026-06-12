export function renderEntriesPage({ listEl, paginationEl, entries, page, pageSize, onEdit, onDelete }) {
  listEl.innerHTML = ''

  if(!entries.length) {
    const li = document.createElement('li')
    li.className = 'entry-placeholder'
    li.textContent = 'No entries yet.'
    listEl.appendChild(li)
    paginationEl.hidden = true
    return
  }

  const start = (page - 1) * pageSize
  const pageEntries = entries.slice(start, start + pageSize)

  pageEntries.forEach(entry => {
    const li = document.createElement('li')

    const info = document.createElement('div')
    info.className = 'entry-info'

    const title = document.createElement('div')
    const strong = document.createElement('strong')
    strong.textContent = entry.type
    const meta = document.createElement('span')
    meta.textContent = ` — ${entry.cups} cup(s) on ${entry.date}`
    title.appendChild(strong)
    title.appendChild(meta)
    info.appendChild(title)

    if(entry.notes) {
      const notes = document.createElement('div')
      notes.className = 'muted'
      notes.textContent = entry.notes
      info.appendChild(notes)
    }

    const actions = document.createElement('div')
    actions.className = 'entry-actions'

    const editBtn = document.createElement('button')
    editBtn.type = 'button'
    editBtn.textContent = 'Edit'
    editBtn.onclick = () => onEdit(entry.id)

    const deleteBtn = document.createElement('button')
    deleteBtn.type = 'button'
    deleteBtn.textContent = 'Delete'
    deleteBtn.onclick = () => onDelete(entry.id)

    actions.appendChild(editBtn)
    actions.appendChild(deleteBtn)
    li.appendChild(info)
    li.appendChild(actions)
    listEl.appendChild(li)
  })

  const pageCount = Math.max(1, Math.ceil(entries.length / pageSize))
  const prevPage = paginationEl.querySelector('[data-role="prev-page"]')
  const nextPage = paginationEl.querySelector('[data-role="next-page"]')
  const pageStatus = paginationEl.querySelector('[data-role="page-status"]')

  prevPage.disabled = page === 1
  nextPage.disabled = page >= pageCount
  pageStatus.textContent = `Page ${page} of ${pageCount}`
  paginationEl.hidden = entries.length <= pageSize
}
