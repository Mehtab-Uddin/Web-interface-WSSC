# Production Setup Guide

## Connecting to Production Backend

The web interface is configured to connect to your production backend at:
**`https://api.webypixels.com/api`**

## Configuration

### Environment Variables

The `.env` file is already configured with:
```env
VITE_API_URL=https://api.webypixels.com/api
```

### API Service

The frontend uses the API URL from environment variables. The API service (`src/services/api.js`) automatically:
- Adds JWT tokens to all requests
- Handles authentication errors
- Redirects to login on 401 errors

## CORS Configuration

Make sure your production backend (at `api.webypixels.com`) has CORS configured to allow requests from:
- Your frontend domain (when deployed)
- `http://localhost:5173` (for local development)

The backend should allow these origins in the CORS configuration.

## Running Locally with Production Backend

1. **Install dependencies:**
   ```bash
   cd web-interface
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Access the application:**
   - Open `http://localhost:5173`
   - Login with your Super Admin, CEO, or General Manager credentials
   - The frontend will connect to `https://api.webypixels.com/api`

## Building for Production

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder:**
   - Upload the contents of the `dist` folder to your web server
   - Make sure the `.env` file or environment variables are set correctly on your hosting

3. **Environment Variables on Hosting:**
   - Set `VITE_API_URL=https://api.webypixels.com/api` in your hosting environment
   - Or ensure the build uses the correct API URL

## Testing the Connection

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to login
4. Check if requests are going to `https://api.webypixels.com/api`
5. Verify responses are coming back successfully

## Troubleshooting

### CORS Errors
- Ensure backend CORS allows your frontend domain
- Check backend CORS configuration includes your origin

### Connection Errors
- Verify `https://api.webypixels.com/api` is accessible
- Check if SSL certificate is valid
- Verify backend is running and responding

### Authentication Issues
- Check if JWT tokens are being sent in requests
- Verify backend JWT_SECRET matches
- Check token expiration settings

## Switching Between Production and Local Backend

To use local backend for development:

1. Update `.env`:
   ```env
   VITE_API_URL=http://localhost:3000/api
   ```

2. Start local backend:
   ```bash
   cd backend
   npm run dev
   ```

3. Restart frontend dev server

To switch back to production:
```env
VITE_API_URL=https://api.webypixels.com/api
```

