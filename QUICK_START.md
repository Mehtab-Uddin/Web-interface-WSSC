# Quick Start Guide

## Quick Setup (Using Production Backend)

The frontend is configured to connect to the production backend at `https://api.webypixels.com/api`.

### Step 1: Install Frontend Dependencies

Open a new terminal:

```bash
# In web-interface directory
npm install
npm run dev
```

Frontend will run on `http://localhost:5173`

## Access the Application

1. Open browser: `http://localhost:5173`
2. Login with Super Admin, CEO, or General Manager credentials
3. Start using the web interface!

## Running Both Servers

You need **two terminal windows**:

**Terminal 1 - Backend:**
```bash
cd web-interface/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd web-interface
npm run dev
```

## Troubleshooting

### Backend won't start
- Check MySQL is running
- Verify database credentials in `.env`
- Ensure database exists

### Frontend can't connect to backend
- Verify backend is running on port 3000
- Check `VITE_API_URL` in frontend `.env` (should be `http://localhost:3000/api`)
- Check browser console for CORS errors

### Database connection errors
- Verify MySQL service is running
- Check database credentials
- Ensure database exists and schema is loaded

