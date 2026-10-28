# Carteira de Acordos: Agreement Tracking Dashboard

[![CI](https://github.com/brunohinz/carteira-acordos/actions/workflows/ci.yml/badge.svg)](https://github.com/brunohinz/carteira-acordos/actions/workflows/ci.yml)

**Live demo:** https://brunohinz.github.io/carteira-acordos/

![Main dashboard](assets/dashboard.png)

## Overview

Carteira de Acordos is a front-end dashboard for tracking financial agreements (payment agreements), built as a portfolio project with **plain HTML, CSS and JavaScript**, without frameworks. Everything runs in the browser and is saved with `localStorage`. All data shown is fictitious.

## Features

- KPIs: amount generated this month, amount paid (total and paid this month), amount open, and overdue count.
- A configurable monthly goal ("Alterar meta"), calculated only from agreements paid in the current month, showing how much is left and the daily pace needed until month end.
- Demo dataset included, and you can restore it at any time.
- Create agreements with a formatted-value preview and due-date validation.
- Edit client, contract, amount and due date in an accessible dialog (blocks duplicate contracts and previews the amount).
- Search by contract, client or amount (8.420,50, 8420,50 or 8420.50), ignoring accents and case. `Esc` clears the search.
- Status filters: all, open, paid, overdue, due today, and next 7 days.
- Sort by due date, creation date or amount.
- Mark agreements as paid, reopen them, and delete them with undo.
- **CSV export** of the current view. It respects search and filters and opens directly in Excel with pt-BR settings.
- **JSON backup and import**. The import validates the data and skips duplicate contracts.
- Persists agreements, filters, search and goal in `localStorage`.
- Statuses and KPIs refresh automatically when you return to the tab on a new day.
- Responsive layout for desktop and mobile.

## Tech stack

- HTML, without frameworks
- CSS (Grid and Flexbox, responsive)
- Vanilla JavaScript for state, rendering, filters, sorting and financial calculations
- `localStorage` for persistence
- `node --test` for unit tests plus a jsdom DOM smoke test (the app itself has no dependencies), with CI on GitHub Actions

## Getting started

Open the live demo, or run it locally:

```bash
git clone https://github.com/brunohinz/carteira-acordos.git
cd carteira-acordos
# open index.html in your browser
```

Tests (Node.js 18+):

```bash
npm install     # installs jsdom (tests only)
npm test        # unit tests plus a DOM smoke test (add, filter, export, edit, undo, import)
npm run check   # syntax check of utils.js and script.js
```

## Project structure

```text
index.html                 App markup
favicon.svg                Tab icon
style.css                  Styles and responsiveness
script.js                  State, rendering and DOM interactions
utils.js                   Pure functions: currency, dates, filters, CSV, backup, storage
tests/utils.test.js        Unit tests for the pure functions
.github/workflows/ci.yml   Check + tests on every push
```

## Screenshots

The screenshots below are from an earlier version; the edit dialog and the goal pace are not shown yet.

| New agreement | "Atrasados" (overdue) filter + search |
|---|---|
| ![New agreement form](assets/new-agreement.png) | ![Filter and search](assets/filters.png) |

| Change goal | Undo delete |
|---|---|
| ![Change goal](assets/goal.png) | ![Undo delete](assets/undo-delete.png) |

Mobile layout (about 390 px):

<img src="assets/mobile.png" alt="Mobile layout" width="260">

## What this project demonstrates

DOM manipulation without frameworks, client-side state management, filtering, search and sorting, financial KPI calculations, browser persistence, a responsive admin-style layout, and automated tests with CI.

## Note

All data is fictitious and exists only to demonstrate the interface and workflow.
