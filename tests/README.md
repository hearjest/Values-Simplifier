# Basic Playwright Tests

This folder contains a small, basic Playwright suite for the auth UI.

## What is covered

- Login screen renders
- Login/Register form toggle
- Username + password validation in shared error area
- Login error message handling
- Successful login transitions to upload view

## Run tests

```powershell
npx playwright test tests/e2e/basic-auth-ui.spec.js
```

or:

```powershell
npx playwright test
```
