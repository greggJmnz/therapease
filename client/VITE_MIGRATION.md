# Vite Migration Complete

This project has been successfully migrated from Create React App (CRA) to Vite.

## What Changed

### Build Tool
- **Before:** Create React App with react-scripts
- **After:** Vite

### Development Command
- **Before:** `npm start`
- **After:** `npm run dev`

### Build Command
- **Before:** `npm run build` (created `build/` folder)
- **After:** `npm run build` (creates `dist/` folder)

### Environment Variables
- **Before:** All variables prefixed with `REACT_APP_`
- **After:** All variables must be prefixed with `VITE_`

### Configuration Files
- Created: `vite.config.js` - Vite configuration
- Created: `vite-env.d.ts` - TypeScript definitions for Vite environment variables
- Created: `vercel.json` - Vercel deployment configuration
- Moved: `index.html` from `public/` to root of `client/`
- Updated: `package.json` scripts

## Environment Variables

### Required Variables for Production

Create a `.env` file in the `client/` directory with:

```
VITE_API_URL=https://your-api-domain.com
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
```

### Migration Notes

1. **Build Output:** Changed from `build/` to `dist/`
   - Update any CI/CD scripts that reference the build folder
   - Vercel automatically detects `dist/` with the configuration provided

2. **Environment Variables:**
   - Rename `REACT_APP_API_URL` to `VITE_API_URL`
   - Rename `REACT_APP_VAPID_PUBLIC_KEY` to `VITE_VAPID_PUBLIC_KEY`
   - Access with `import.meta.env.VITE_*` instead of `process.env.REACT_APP_*`

3. **Service Worker:**
   - The service worker (`sw.js`) in `public/` is automatically included

4. **File Extensions:**
   - Files with JSX content renamed to `.jsx`:
     - `App.js` → `App.jsx`
     - `index.js` → `index.jsx`
     - `AuthContext.js` → `AuthContext.jsx`
     - `SystemSettingsContext.js` → `SystemSettingsContext.jsx`

## Development

```bash
cd client
npm install
npm run dev
```

The app will run on `http://localhost:3000`

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

## Preview Production Build

```bash
npm run preview
```

## Deploying to Vercel

### Automatic Detection
Vercel will automatically detect Vite and use the correct settings with the provided `vercel.json`.

### Manual Configuration
If needed, set these in Vercel dashboard:
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### Environment Variables
Add the following environment variables in Vercel:
- `VITE_API_URL`
- `VITE_VAPID_PUBLIC_KEY`

## Performance Improvements

Vite provides:
- ⚡ Lightning fast HMR (Hot Module Replacement)
- 🎯 Smaller bundle sizes
- 🔧 Better build performance
- 📦 Improved code splitting

## Notes

- The proxy configuration for `/api` is maintained in `vite.config.js`
- All existing features remain functional
- Tailwind CSS continues to work as before
- PostCSS configuration is maintained

