# Coffee Tracker

Simple single-page coffee tracker using HTML/CSS/JS. Data is stored locally in `localStorage`.

Usage
- Serve the app over HTTP so the offline cache can register:

  ```bash
  python -m http.server 8000
  # then open http://localhost:8000
  ```

- Add entries (date, type, cups, notes). Entries persist in your browser.

Performance and reliability updates
- The non-critical entries list is lazy-loaded after the main form and stats render.
- Entry history is paginated in groups of 10 and summary totals are indexed in memory for faster updates.
- Static assets are cached with a service worker for repeat visits and offline resilience.
- Lightweight browser monitoring logs load/error signals to the console, and background setup uses retry logic.
