# VCSA Monitoring Guide

## Overview

This guide covers the monitoring infrastructure for the VCSA platform, including error tracking (Sentry), performance monitoring, logging, and analytics.

## Table of Contents

1. [Sentry Setup](#sentry-setup)
2. [Backend Monitoring](#backend-monitoring)
3. [Frontend Monitoring](#frontend-monitoring)
4. [Error Handling Best Practices](#error-handling-best-practices)
5. [Performance Monitoring](#performance-monitoring)
6. [Troubleshooting](#troubleshooting)

---

## Sentry Setup

### 1. Create Sentry Account

1. Go to [sentry.io](https://sentry.io)
2. Sign up for a free account (up to 5,000 errors/month)
3. Create a new project:
   - **Backend**: Select "FastAPI"
   - **Frontend**: Select "React"

### 2. Get DSN (Data Source Name)

After creating a project, you'll get a DSN like:
```
https://your-sentry-dsn@sentry.io/project-id
```

### 3. Configure Environment Variables

**Backend** (`.env`):
```bash
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

**Frontend** (`.env`):
```bash
REACT_APP_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
REACT_APP_SENTRY_ENVIRONMENT=development
REACT_APP_SENTRY_TRACES_SAMPLE_RATE=0.1
```

### 4. Install Dependencies

**Backend:**
```bash
cd backend
pip install sentry-sdk[fastapi]
```

**Frontend:**
```bash
cd frontend
npm install @sentry/react
```

---

## Backend Monitoring

### Initialization

The backend Sentry integration is in `backend/sentry_config.py` and initialized in `backend/server.py`:

```python
from sentry_config import init_sentry, capture_exception, set_user

# Initialize Sentry
init_sentry(
    dsn=os.environ.get('SENTRY_DSN'),
    environment=os.environ.get('SENTRY_ENVIRONMENT', 'development'),
    traces_sample_rate=0.1,
    debug=False
)
```

### Usage Examples

#### 1. Capture Exceptions

```python
from sentry_config import capture_exception

try:
    # Some operation that might fail
    result = risky_operation()
except Exception as e:
    # Log to Sentry
    capture_exception(e, tags={"operation": "risky_operation"})
    # Handle error
    raise
```

#### 2. Capture Messages

```python
from sentry_config import capture_message

# Send info message
capture_message("User completed onboarding", level="info")

# Send warning
capture_message("High memory usage detected", level="warning")

# Send error
capture_message("Payment processing failed", level="error")
```

#### 3. Set User Context

```python
from sentry_config import set_user

# When user logs in
set_user(
    user_id=str(user.user_id),
    email=user.email,
    username=user.name
)
```

#### 4. Add Breadcrumbs

```python
from sentry_config import add_breadcrumb

# Track user actions
add_breadcrumb(
    message="User clicked purchase button",
    category="user",
    level="info",
    data={"course_id": course_id}
)
```

### FastAPI Integration

Sentry automatically integrates with FastAPI to capture:

- **HTTP Errors**: 4xx and 5xx responses
- **Request Data**: Headers, body, query params
- **Performance**: Request duration, database queries
- **User Context**: When set with `set_user()`

### Error Filtering

The backend filters out:
- 404 errors (not useful in Sentry)
- CORS errors
- Sensitive data (passwords, tokens)

### Performance Monitoring

Enable tracing to monitor:
- API endpoint performance
- Database query performance
- External API calls

```python
# Check traces in Sentry dashboard
# https://sentry.io/performance/
```

---

## Frontend Monitoring

### Initialization

The frontend Sentry integration is in `frontend/src/sentry.js` and initialized in `frontend/src/App.js`:

```javascript
import { initSentry } from './sentry';

// Initialize Sentry on app load
initSentry();
```

### Usage Examples

#### 1. Capture Exceptions

```javascript
import { captureException } from './sentry';

try {
  // Some operation
  riskyOperation();
} catch (error) {
  // Send to Sentry
  captureException(error, {
    tags: { component: 'PurchaseForm' }
  });
}
```

#### 2. Capture Messages

```javascript
import { captureMessage } from './sentry';

// Send message
captureMessage('User completed purchase', 'info');
```

#### 3. Set User Context

```javascript
import { setSentryUser } from './sentry';

// When user logs in
setSentryUser({
  id: user.user_id,
  email: user.email,
  username: user.name
});
```

#### 4. Clear User Context

```javascript
import { clearSentryUser } from './sentry';

// When user logs out
clearSentryUser();
```

#### 5. Add Breadcrumbs

```javascript
import { addBreadcrumb } from './sentry';

// Track user actions
addBreadcrumb({
  message: 'User clicked purchase button',
  category: 'user',
  level: 'info',
  data: { courseId: course.id }
});
```

### React Error Boundary

Wrap components with Sentry error boundary:

```javascript
import { SentryErrorBoundary } from './sentry';

<SentryErrorBoundary fallback={<ErrorFallback />}>
  <MyComponent />
</SentryErrorBoundary>
```

### Performance Monitoring

Sentry tracks:
- Page load times
- Component render times
- API call durations
- User interactions

```javascript
// View performance data in Sentry dashboard
// https://sentry.io/performance/
```

### Session Replay

Sentry records user sessions when errors occur (100% replay on error, 10% normal sessions).

Features:
- **Masking**: All text is masked by default
- **Media Blocking**: All media is blocked
- **Privacy**: No sensitive data recorded

---

## Error Handling Best Practices

### 1. Always Log Errors

```python
# Backend
try:
    operation()
except Exception as e:
    logger.error(f"Operation failed: {e}")
    capture_exception(e)
    raise
```

```javascript
// Frontend
try {
  operation();
} catch (error) {
  console.error('Operation failed:', error);
  captureException(error);
}
```

### 2. Set User Context Early

```python
# After successful login
set_user(user_id, email, username)
```

```javascript
// After successful login
setSentryUser({ id, email, username });
```

### 3. Add Breadcrumbs for Important Actions

```python
# Track user journey
add_breadcrumb("User started onboarding", category="user")
add_breadcrumb("User completed step 1", category="onboarding")
```

```javascript
// Track user journey
addBreadcrumb({ message: 'User started onboarding', category: 'user' });
addBreadcrumb({ message: 'User completed step 1', category: 'onboarding' });
```

### 4. Use Tags for Filtering

```python
capture_exception(e, tags={
    "feature": "payments",
    "operation": "stripe_webhook"
})
```

```javascript
captureException(error, {
  tags: { component: 'PaymentForm', action: 'submit' }
});
```

### 5. Don't Send Sensitive Data

- ❌ Passwords, tokens, API keys
- ❌ Credit card numbers
- ❌ Personal health information
- ❌ Location data (unless necessary)

Sentry automatically filters:
- Request headers (authorization, cookie, set-cookie)
- User emails (masked)
- Query parameters (token, api_key, password)

---

## Performance Monitoring

### Backend Performance

Enable tracing to monitor:

1. **API Endpoints**: Which endpoints are slow?
2. **Database Queries**: Which queries need optimization?
3. **External APIs**: Which external calls are slow?

```python
# Automatic with Sentry FastAPI integration
# View in Sentry > Performance
```

### Frontend Performance

Sentry tracks:

1. **Page Load**: Initial page load time
2. **Route Changes**: Time between routes
3. **Component Renders**: Slow components
4. **API Calls**: Fetch duration

```javascript
// Automatic with Sentry React integration
// View in Sentry > Performance
```

### Performance Budgets

Set targets in Sentry:

- **Backend API**: <200ms average response time
- **Frontend Load**: <3s initial load
- **Route Changes**: <500ms between routes

---

## Troubleshooting

### Sentry Not Receiving Events

**Issue**: Events not appearing in Sentry dashboard

**Solutions**:
1. Check DSN is correct
2. Check environment variables are set
3. Check network connectivity
4. Enable debug mode to see logs

```python
# Backend
init_sentry(debug=True)  # Enable debug logging
```

```javascript
// Frontend - check console
// Look for "Sentry initialized" message
```

### Too Many Events

**Issue**: Receiving too many events, hitting quota

**Solutions**:
1. Adjust sampling rates
2. Filter out more errors
3. Use event frequency limits

```python
# Reduce sampling
init_sentry(traces_sample_rate=0.05)  # 5% instead of 10%
```

```javascript
// Frontend - reduce sampling
SENTRY_TRACES_SAMPLE_RATE=0.05  # 5% instead of 10%
```

### Performance Overhead

**Issue**: Sentry slowing down application

**Solutions**:
1. Reduce sampling rates
2. Disable tracing in production
3. Disable session replay

```python
# Disable tracing
init_sentry(traces_sample_rate=0.0)
```

### Sensitive Data Leaks

**Issue**: Sensitive data appearing in Sentry

**Solutions**:
1. Check `beforeSend` filters
2. Review event filtering
3. Add additional filters

```python
# Add custom filter
def event_filter(event, hint):
    # Remove custom field
    event.setdefault("request", {})
    event["request"].pop("custom_data", None)
    return event
```

---

## Monitoring Checklist

### Setup
- [ ] Sentry account created
- [ ] DSN configured in backend `.env`
- [ ] DSN configured in frontend `.env`
- [ ] Dependencies installed
- [ ] Sentry initialized in both apps

### Backend
- [ ] Exceptions captured
- [ ] User context set on login
- [ ] Breadcrumbs added for key actions
- [ ] Performance monitoring enabled
- [ ] Error filtering configured

### Frontend
- [ ] Error boundary configured
- [ ] Exceptions captured
- [ ] User context set on login
- [ ] Breadcrumbs added for key actions
- [ ] Performance monitoring enabled
- [ ] Session replay enabled

### Ongoing
- [ ] Review Sentry dashboard weekly
- [ ] Address top errors
- [ ] Monitor performance metrics
- [ ] Update filters as needed
- [ ] Check quota usage

---

## Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Sentry Python SDK](https://docs.sentry.io/platforms/python/)
- [Sentry React SDK](https://docs.sentry.io/platforms/react/)
- [VCSA API Reference](./docs/wiki/API-Reference.md)
- [VCSA Architecture](./docs/wiki/Architecture.md)

---

**Last Updated**: March 16, 2026
**Status**: Sentry Integration Complete | Next: Review & Test
