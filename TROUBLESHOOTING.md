# Troubleshooting Guide

## 500 Internal Server Error on JSX Files

If you're seeing 500 errors when loading JSX files, follow these steps:

### 1. Stop and Restart the Dev Server

```bash
# Stop the current dev server (Ctrl+C)
# Then restart it:
npm run dev
```

### 2. Clear Cache and Reinstall Dependencies

```bash
# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall dependencies
npm install

# Start dev server
npm run dev
```

### 3. Check for Missing Dependencies

All required dependencies should be installed. If you see import errors, run:

```bash
npm install
```

### 4. Verify Backend Server is Running

The web interface requires the backend API to be running on port 3000:

```bash
# In the backend directory
cd ../backend
npm start
```

### 5. Check Browser Console

Open browser DevTools (F12) and check:
- Console tab for JavaScript errors
- Network tab for failed requests
- Check if files are being served correctly

### 6. Verify Environment Variables

Make sure `.env` file exists with:

```
VITE_API_URL=http://localhost:3000/api
```

### 7. Common Issues

**Issue: "Cannot find module 'lucide-react'"**
- Solution: `npm install lucide-react`

**Issue: "Cannot find module 'react-bootstrap'"**
- Solution: `npm install react-bootstrap bootstrap`

**Issue: Port 5173 already in use**
- Solution: Change port in `vite.config.js` or kill the process using port 5173

**Issue: CORS errors**
- Solution: Make sure backend allows requests from `http://localhost:5173`

### 8. Full Clean Install

If nothing works, do a complete clean install:

```bash
# Remove all generated files
rm -rf node_modules dist .vite package-lock.json

# Reinstall
npm install

# Start fresh
npm run dev
```

## Still Having Issues?

1. Check that Node.js version is 16 or higher: `node --version`
2. Verify all files are saved correctly
3. Check for syntax errors in the console
4. Make sure you're in the `web-interface` directory when running commands

