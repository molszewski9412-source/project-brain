# 📡 Project Brain API Documentation

## Overview

Project Brain exposes a REST API for integration with external tools and services.

## Base URL

```
http://localhost:3000/api
```

## Authentication

All API requests require an API key in the header:

```
Authorization: Bearer YOUR_API_KEY
```

---

## Modules API

### List Modules

```
GET /modules
```

**Response:**
```json
{
  "modules": [
    {
      "id": "mod-1",
      "name": "Authentication",
      "type": "FEATURE",
      "status": "DONE",
      "description": "User authentication module",
      "files": ["src/auth/login.ts", "src/auth/logout.ts"],
      "locked": true
    }
  ],
  "total": 25
}
```

### Create Module

```
POST /modules
```

**Body:**
```json
{
  "name": "New Module",
  "type": "FEATURE",
  "description": "Module description"
}
```

### Update Module

```
PUT /modules/:id
```

**Body:**
```json
{
  "name": "Updated Name",
  "status": "IN_PROGRESS",
  "locked": false
}
```

### Delete Module

```
DELETE /modules/:id
```

---

## Ideas API

### List Ideas

```
GET /ideas
```

**Query Parameters:**
- `status` - Filter by status (BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE)
- `moduleId` - Filter by module

### Create Idea

```
POST /ideas
```

**Body:**
```json
{
  "title": "Add dark mode",
  "description": "Implement dark theme",
  "moduleId": "mod-1",
  "tags": ["UI", "feature"]
}
```

### Update Idea Status

```
PATCH /ideas/:id/status
```

**Body:**
```json
{
  "status": "IN_PROGRESS"
}
```

---

## Decisions API

### List Decisions

```
GET /decisions
```

### Create Decision

```
POST /decisions
```

**Body:**
```json
{
  "title": "Use PostgreSQL",
  "description": "Database choice",
  "rationale": "ACID compliance",
  "alternatives": ["MongoDB", "MySQL"],
  "chosenOption": "PostgreSQL",
  "type": "ARCHITECTURAL"
}
```

---

## AI API

### Analyze Project

```
POST /ai/analyze
```

**Body:**
```json
{
  "path": "/path/to/project"
}
```

**Response:**
```json
{
  "modules": [...],
  "technologies": ["React", "Node.js"],
  "dependencies": ["express", "mongoose"]
}
```

### Generate Code

```
POST /ai/generate
```

**Body:**
```json
{
  "moduleId": "mod-1",
  "prompt": "Create a REST API for users"
}
```

### Ask Question

```
POST /ai/chat
```

**Body:**
```json
{
  "message": "How should I structure the auth module?"
}
```

---

## Architecture API

### Get Architecture

```
GET /architecture
```

### Update Architecture

```
PUT /architecture
```

**Body:**
```json
{
  "nodes": [...],
  "connections": [...]
}
```

---

## Webhooks

### Configure Webhook

```
POST /webhooks
```

**Body:**
```json
{
  "url": "https://your-server.com/webhook",
  "events": ["module.created", "idea.status_changed"]
}
```

### Events

| Event | Description |
|-------|-------------|
| `module.created` | New module created |
| `module.updated` | Module updated |
| `module.deleted` | Module deleted |
| `idea.created` | New idea created |
| `idea.status_changed` | Idea moved to different status |
| `decision.created` | New decision recorded |
| `ai.generated` | AI generated code |

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "MODULE_NOT_FOUND",
    "message": "Module with ID xyz not found"
  }
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 500 | Internal Error |

---

## Rate Limiting

- **Free tier:** 100 requests/minute
- **Pro tier:** 1000 requests/minute

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { ProjectBrainClient } from '@projectbrain/sdk';

const client = new ProjectBrainClient({
  apiKey: 'YOUR_API_KEY',
  baseUrl: 'http://localhost:3000/api'
});

// List modules
const modules = await client.modules.list();

// Create idea
await client.ideas.create({
  title: 'New Feature',
  description: 'Description here'
});
```

### Python

```python
from projectbrain import Client

client = Client(
    api_key='YOUR_API_KEY',
    base_url='http://localhost:3000/api'
)

# List modules
modules = client.modules.list()

# Create idea
client.ideas.create(
    title='New Feature',
    description='Description here'
)
```

### cURL

```bash
# List modules
curl -X GET http://localhost:3000/api/modules \
  -H "Authorization: Bearer YOUR_API_KEY"

# Create module
curl -X POST http://localhost:3000/api/modules \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Auth", "type": "FEATURE"}'
```
