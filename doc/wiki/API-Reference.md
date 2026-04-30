# API Reference

Complete API documentation for the VCSA backend.

## Base URL

```
Production: https://api.vcsa.com
Development: http://localhost:8000
```

## Authentication

Most endpoints require authentication using JWT tokens.

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "role": "member"
  }
}
```

### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

## Development System API

### Get Stages

Get the 4-stage progression system.

```http
GET /api/development/stages
Authorization: Bearer <token>
```

**Response:**
```json
{
  "stages": [
    {
      "id": "stage-1",
      "name": "New Rep",
      "points_required": 150,
      "estimated_weeks": "1-2"
    }
  ]
}
```

### Get Tracks

Get all 6 training tracks.

```http
GET /api/development/tracks
Authorization: Bearer <token>
```

### Get Track Details

Get specific track with modules.

```http
GET /api/development/tracks/{track_id}
Authorization: Bearer <token>
```

### Complete Content

Mark content as completed.

```http
POST /api/development/content/{content_id}/complete
Authorization: Bearer <token>
```

### Get Progress

Get user progress and readiness score.

```http
GET /api/development/progress
Authorization: Bearer <token>
```

**Response:**
```json
{
  "readiness_score": 75,
  "total_points": 350,
  "current_stage": "Developing Rep",
  "training_streak": 5
}
```

## Content API

### Get Deal Breakdowns

Get all deal breakdown scenarios.

```http
GET /api/development/breakdowns
Authorization: Bearer <token>
```

### Get Quick Wins

Get all tactical quick wins.

```http
GET /api/development/quickwins
Authorization: Bearer <token>
```

## Bookmarks API

### Get Bookmarks

Get user's saved bookmarks.

```http
GET /api/development/bookmarks
Authorization: Bearer <token>
```

### Create Bookmark

Save content to Watch Later.

```http
POST /api/development/bookmarks
Authorization: Bearer <token>
Content-Type: application/json

{
  "content_id": "content-123",
  "tags": ["pre_tour", "objections"]
}
```

## Community API

### Get Posts

Get community feed.

```http
GET /api/community/posts
Authorization: Bearer <token>
Query Parameters:
  - limit: number of posts (default: 20)
  - offset: pagination offset
```

### Create Post

Create a new community post.

```http
POST /api/community/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Post title",
  "content": "Post content",
  "category": "general"
}
```

## Events API

### Get Events

Get calendar events.

```http
GET /api/events
Authorization: Bearer <token>
Query Parameters:
  - start_date: ISO date string
  - end_date: ISO date string
```

## Resources API

### Get Resources

Get downloadable resources.

```http
GET /api/resources
Authorization: Bearer <token>
Query Parameters:
  - category: filter by category
  - type: filter by type (pdf, video, etc.)
```

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "detail": "Invalid request data"
}
```

### 401 Unauthorized
```json
{
  "detail": "Invalid authentication credentials"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

## Rate Limiting

API requests are rate limited:
- 100 requests per minute per user
- 1000 requests per hour per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1617187200
```
