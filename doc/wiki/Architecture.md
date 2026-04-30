# Architecture Overview

Detailed architecture documentation for the VCSA platform.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Web App    │  │   Mobile     │  │    Admin     │      │
│  │  (React 19)  │  │  (Future)    │  │   Dashboard  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         API Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │     Auth     │  │ Development  │  │  Community   │      │
│  │   Service    │  │    System    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Data Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   MongoDB    │  │    Redis     │  │   Storage    │      │
│  │  (Primary)   │  │   (Cache)    │  │   (Future)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Backend Architecture

### Technology Stack

- **Framework**: FastAPI (Python 3.9+)
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT with http-only cookies
- **Validation**: Pydantic models

### Directory Structure

```
backend/
├── server.py              # Main FastAPI application
├── phase1_routes.py       # Phase 1 development routes
├── models/               # Database models
├── schemas/              # Pydantic schemas
├── services/             # Business logic
├── middleware/           # Custom middleware
└── tests/                # Test suite
```

### API Router Structure

```python
# Main Router (/api)
├── /auth                 # Authentication endpoints
├── /users                # User management
├── /development          # Phase 1 system
│   ├── /stages          # 4-stage progression
│   ├── /tracks          # 6 training tracks
│   ├── /content         # Content management
│   ├── /breakdowns      # Deal breakdowns
│   ├── /quickwins       # Quick wins library
│   ├── /progress        # User progress
│   └── /badges          # Achievement badges
├── /community            # Social features
├── /events               # Calendar events
├── /resources            # Downloadable content
└── /admin                # Admin panel
```

## Frontend Architecture

### Technology Stack

- **Framework**: React 19
- **Styling**: Tailwind CSS + shadcn/ui
- **Animation**: Framer Motion
- **State**: Context API + React Query
- **Routing**: React Router v6

### Directory Structure

```
frontend/
├── src/
│   ├── pages/           # Page components
│   ├── components/      # Reusable components
│   │   ├── ui/         # shadcn/ui components
│   │   └── layout/     # Layout components
│   ├── contexts/       # React contexts
│   ├── hooks/          # Custom hooks
│   ├── services/       # API services
│   └── utils/          # Utility functions
└── public/             # Static assets
```

### Component Architecture

**Page Components**: Default exports, route-level components
```javascript
export default function DashboardPage() {
  return <div>...</div>
}
```

**Reusable Components**: Named exports
```javascript
export const Button = ({ children }) => {
  return <button>{children}</button>
}
```

## Database Schema

### Collections

**users**
```javascript
{
  _id: ObjectId,
  email: String,
  password_hash: String,
  name: String,
  role: String, // admin, member
  created_at: Date,
  updated_at: Date
}
```

**user_progress**
```javascript
{
  user_id: ObjectId,
  completed_modules: [ObjectId],
  completed_breakdowns: [ObjectId],
  completed_quickwins: [ObjectId],
  points: Number,
  current_stage: String,
  training_streak: Number,
  badges_earned: [String],
  readiness_score: Number
}
```

**bookmarks**
```javascript
{
  user_id: ObjectId,
  content_id: ObjectId,
  content_type: String, // module, breakdown, quickwin
  tags: [String],
  created_at: Date
}
```

**user_activity**
```javascript
{
  user_id: ObjectId,
  action: String,
  metadata: Object,
  timestamp: Date
}
```

## Key Algorithms

### Readiness Score Calculation

```python
def calculate_readiness_score(user_progress):
    video_completion = (completed_modules / total_modules) * 40
    track_progress = (track_points / total_track_points) * 30
    quick_wins = (completed_quickwins / total_quickwins) * 10
    breakdowns = (completed_breakdowns / total_breakdowns) * 10
    streak_bonus = min(training_streak * 2, 10)

    return video_completion + track_progress + quick_wins + breakdowns + streak_bonus
```

### Points System

- Training Module: 10 points
- Deal Breakdown: 5 points
- Quick Win: 3 points

### Training Streak Logic

```python
def update_training_streak(user_progress, last_activity):
    now = datetime.utcnow()
    time_diff = now - last_activity

    if time_diff <= timedelta(hours=24):
        return user_progress.streak + 1
    elif time_diff <= timedelta(hours=48):
        return user_progress.streak
    else:
        return 0
```

## Security Considerations

### Authentication
- JWT tokens with short expiry (15 minutes)
- Refresh tokens with longer expiry (7 days)
- http-only cookies to prevent XSS
- CSRF protection

### Authorization
- Role-based access control (RBAC)
- Admin-only endpoints
- Resource-level permissions

### Data Protection
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting on API endpoints
- CORS configuration

## Performance Optimization

### Backend
- Async/await for I/O operations
- Database indexing on frequently queried fields
- Redis caching for expensive operations
- Connection pooling for MongoDB

### Frontend
- Code splitting with React.lazy
- Memoization with React.memo
- Virtual scrolling for long lists
- Image optimization and lazy loading

## Scalability Strategy

### Horizontal Scaling
- Stateless API design
- Load balancer support
- Database sharding ready
- CDN for static assets

### Monitoring
- Application logs (Winston/Papertrail)
- Performance metrics (Prometheus)
- Error tracking (Sentry)
- Uptime monitoring

## Future Enhancements

- GraphQL API alternative
- WebSocket for real-time features
- Microservices architecture
- Multi-region deployment
