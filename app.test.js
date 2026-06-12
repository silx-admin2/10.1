/**
 * @jest-environment jsdom
 */

'use strict'

const FORM_HTML = `
  <form id="entryForm">
    <input type="date" id="date" value="2024-01-15" />
    <select id="type"><option>Espresso</option><option>Latte</option></select>
    <input type="number" id="cups" value="1" />
    <input type="text" id="notes" value="" />
  </form>
  <strong id="totalCups">0</strong>
  <strong id="todayCups">0</strong>
  <ul id="entriesList"></ul>
`

let escapeHtml, load, save, state, addEntry, deleteEntry, editEntry, render

beforeEach(() => {
  // Reset DOM and localStorage before each test
  document.body.innerHTML = FORM_HTML
  localStorage.clear()
  jest.resetModules()
  // Load a fresh copy of app.js for each test
  ;({ escapeHtml, load, save, state, addEntry, deleteEntry, editEntry, render } = require('./app.js'))
})

// ─── escapeHtml ────────────────────────────────────────────────────────────────

describe('escapeHtml', () => {
  test('returns empty string for null or empty input', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml('')).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })

  test('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  test('escapes less-than signs', () => {
    expect(escapeHtml('<tag>')).toBe('&lt;tag&gt;')
  })

  test('escapes greater-than signs', () => {
    expect(escapeHtml('x > y')).toBe('x &gt; y')
  })

  test('escapes all special characters together', () => {
    expect(escapeHtml('<b>Hello & "World"</b>')).toBe('&lt;b&gt;Hello &amp; "World"&lt;/b&gt;')
  })

  test('leaves plain text unchanged', () => {
    expect(escapeHtml('plain text 123')).toBe('plain text 123')
  })
})

// ─── load / save ───────────────────────────────────────────────────────────────

describe('load', () => {
  test('returns empty array when localStorage is empty', () => {
    localStorage.clear()
    jest.resetModules()
    const { load: freshLoad } = require('./app.js')
    expect(freshLoad()).toEqual([])
  })

  test('returns previously saved entries', () => {
    const entries = [{ id: 1, type: 'Espresso', cups: 1, date: '2024-01-01', notes: '' }]
    localStorage.setItem('coffee-tracker-v1', JSON.stringify(entries))
    jest.resetModules()
    const { load: freshLoad } = require('./app.js')
    expect(freshLoad()).toEqual(entries)
  })

  test('returns empty array when localStorage contains invalid JSON', () => {
    localStorage.setItem('coffee-tracker-v1', '{invalid}')
    jest.resetModules()
    const { load: freshLoad } = require('./app.js')
    expect(freshLoad()).toEqual([])
  })
})

describe('save', () => {
  test('persists entries to localStorage', () => {
    const entries = [{ id: 2, type: 'Latte', cups: 2, date: '2024-01-02', notes: 'nice' }]
    save(entries)
    expect(JSON.parse(localStorage.getItem('coffee-tracker-v1'))).toEqual(entries)
  })

  test('overwrites previously saved data', () => {
    save([{ id: 1 }])
    save([{ id: 2 }])
    expect(JSON.parse(localStorage.getItem('coffee-tracker-v1'))).toEqual([{ id: 2 }])
  })
})

// ─── addEntry ─────────────────────────────────────────────────────────────────

describe('addEntry', () => {
  test('adds a new entry to state', () => {
    expect(state.entries).toHaveLength(0)
    addEntry({ date: '2024-01-15', type: 'Espresso', cups: 1, notes: '' })
    expect(state.entries).toHaveLength(1)
    expect(state.entries[0].type).toBe('Espresso')
    expect(state.entries[0].cups).toBe(1)
  })

  test('assigns a numeric id to each entry', () => {
    addEntry({ date: '2024-01-15', type: 'Latte', cups: 2, notes: '' })
    expect(typeof state.entries[0].id).toBe('number')
  })

  test('persists entry to localStorage', () => {
    addEntry({ date: '2024-01-15', type: 'Espresso', cups: 1, notes: 'test' })
    const stored = JSON.parse(localStorage.getItem('coffee-tracker-v1'))
    expect(stored).toHaveLength(1)
    expect(stored[0].type).toBe('Espresso')
  })

  test('renders updated list to the DOM', () => {
    addEntry({ date: '2024-01-15', type: 'Cappuccino', cups: 1, notes: '' })
    const items = document.querySelectorAll('#entriesList li')
    expect(items.length).toBe(1)
  })
})

// ─── deleteEntry ──────────────────────────────────────────────────────────────

describe('deleteEntry', () => {
  test('removes the entry with the given id', () => {
    addEntry({ date: '2024-01-15', type: 'Espresso', cups: 1, notes: '' })
    const id = state.entries[0].id
    window.confirm = jest.fn(() => true)
    deleteEntry(id)
    expect(state.entries).toHaveLength(0)
  })

  test('does nothing when user cancels the confirmation', () => {
    addEntry({ date: '2024-01-15', type: 'Espresso', cups: 1, notes: '' })
    const id = state.entries[0].id
    window.confirm = jest.fn(() => false)
    deleteEntry(id)
    expect(state.entries).toHaveLength(1)
  })

  test('persists removal to localStorage', () => {
    addEntry({ date: '2024-01-15', type: 'Americano', cups: 1, notes: '' })
    const id = state.entries[0].id
    window.confirm = jest.fn(() => true)
    deleteEntry(id)
    const stored = JSON.parse(localStorage.getItem('coffee-tracker-v1'))
    expect(stored).toHaveLength(0)
  })
})

// ─── editEntry ────────────────────────────────────────────────────────────────

describe('editEntry', () => {
  test('updates cups and notes for the given entry', () => {
    addEntry({ date: '2024-01-15', type: 'Espresso', cups: 1, notes: 'old' })
    const id = state.entries[0].id
    window.prompt = jest.fn()
      .mockReturnValueOnce('3')  // cups
      .mockReturnValueOnce('new note')  // notes
    editEntry(id)
    expect(state.entries[0].cups).toBe(3)
    expect(state.entries[0].notes).toBe('new note')
  })

  test('does nothing when user cancels cups prompt', () => {
    addEntry({ date: '2024-01-15', type: 'Espresso', cups: 1, notes: 'keep' })
    const id = state.entries[0].id
    window.prompt = jest.fn().mockReturnValueOnce(null)
    editEntry(id)
    expect(state.entries[0].cups).toBe(1)
    expect(state.entries[0].notes).toBe('keep')
  })

  test('does nothing when id is not found', () => {
    expect(() => editEntry(9999)).not.toThrow()
  })
})

// ─── render – summary statistics ──────────────────────────────────────────────

describe('render – summary statistics', () => {
  test('totalCups reflects sum of all entries', () => {
    addEntry({ date: '2024-01-10', type: 'Espresso', cups: 2, notes: '' })
    addEntry({ date: '2024-01-11', type: 'Latte', cups: 3, notes: '' })
    expect(document.getElementById('totalCups').textContent).toBe('5')
  })

  test('todayCups only counts entries for today', () => {
    const today = new Date().toISOString().slice(0, 10)
    addEntry({ date: today, type: 'Espresso', cups: 2, notes: '' })
    addEntry({ date: '2000-01-01', type: 'Latte', cups: 10, notes: '' })
    expect(document.getElementById('todayCups').textContent).toBe('2')
  })
})
