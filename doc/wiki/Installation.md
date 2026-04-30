# Installation Guide

Complete installation guide for VCSA in different environments.

## Development Installation

Follow the [Getting Started](Getting-Started.md) guide for local development setup.

## Production Deployment

### Docker Deployment (Recommended)

VCSA includes Docker configuration for easy deployment:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Deployment

#### Backend Requirements

```bash
# System packages
sudo apt update
sudo apt install python3.9 python3-pip mongodb nginx

# Python dependencies
cd backend
pip install -r requirements.txt

# Environment variables
cp .env.example .env
# Edit .env with production values
```

#### Frontend Requirements

```bash
# Install dependencies
cd frontend
yarn install

# Build for production
yarn build

# Output will be in frontend/build/
```

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Environment Variables

### Backend (.env)

```env
# Database
MONGO_URL=mongodb://localhost:27017
DB_NAME=vcsa

# Authentication
JWT_SECRET=your-secret-key
GOOGLE_OAUTH_CLIENT_ID=your-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret

# Stripe
STRIPE_API_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Frontend (.env)

```env
REACT_APP_BACKEND_URL=https://your-domain.com
REACT_APP_STRIPE_PUBLIC_KEY=pk_live_...
```

## Database Migration

```bash
# Run database setup scripts
cd backend
python scripts/setup_database.py

# Seed initial data
python scripts/seed_data.py
```

## SSL Setup

```bash
# Using Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Health Checks

Monitor your deployment:

```bash
# Backend health
curl https://your-domain.com/api/health

# Frontend accessibility
curl https://your-domain.com
```

## Scaling Considerations

### Backend
- Use Gunicorn with multiple workers
- Implement Redis caching
- Load balance with Nginx

### Database
- Configure MongoDB replica sets
- Enable sharding for large datasets
- Regular backups

### Frontend
- Serve static files via CDN
- Enable browser caching
- Use service workers for offline support
