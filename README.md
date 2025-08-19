# Dallosh - Enterprise Chatbot Service

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)

**Dallosh** is a powerful chatbot service designed for enterprises to integrate into their social network applications like Twitter, Facebook, Instagram, and more. It provides intelligent conversational AI capabilities with seamless integration to social media platforms.

## 🏗️ Architecture Overview

Dallosh consists of two main components that work together:

### 1. **Dallosh** - Chatbot Service
- **Clients**: Next.js web applications for user interaction
- **Servers**: AI-powered chatbot backend with voice capabilities
- **Features**: Multi-modal chat, voice interaction, sentiment analysis

### 2. **Sodular** - Database Management Platform
- **Clients**: Web-based admin interface (similar to Firebase Admin)
- **Servers**: Database management and API services
- **Features**: Easy database setup, user management, real-time data


## 📁 Project Structure

```
dallosh/
├── clients/
│   └── dallosh_web/          # Next.js chatbot interface
├── servers/
│   ├── dallosh_bot/          # Python AI chatbot server
│   └── dallosh_functions/    # Node.js serverless functions
└── docker-compose.yml

sodular/
├── clients/
│   └── sodular_web/          # Next.js admin interface
├── servers/
│   ├── sodular_server/       # Python database server
│   └── sodular_mongodb/      # MongoDB database
└── docker-compose.yml
```


## 🚀 Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.8+ (for local development)

### Step 1: Set Up Sodular Environment Variables

First, configure the environment variables for Sodular services:

#### Sodular Server Environment
Create `.env` file in `./sodular/servers/sodular_server/`:

```bash
# Database Configuration
DATABASE_URL=mongodb://localhost:27017/sodular
DATABASE_NAME=sodular

# Server Configuration
PORT=5005
HOST=0.0.0.0

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:3004
```

#### Sodular Client Environment
Create `.env` file in `./sodular/clients/sodular_web/`:

```bash
# API Configuration
NEXT_PUBLIC_SODULAR_BASE_URL=http://localhost:5005/api/v1
NEXT_PUBLIC_SODULAR_AI_BASE_URL=http://localhost:4200/api/v1
```

#### Update Sodular Client Configuration
Update the base URL in `./sodular/clients/sodular_web/src/configs/index.ts`:

```typescript
function getLocalBaseUrl() {
  if (typeof window !== 'undefined') {
    const url = localStorage.getItem('sodular_base_url');
    if (url) return url;
  }
  return undefined;
}

// Update this URL to match your Sodular server
export const apiUrl = getLocalBaseUrl() || process.env.NEXT_PUBLIC_SODULAR_BASE_URL || 'http://localhost:5005/api/v1';
```

### Step 2: Build and Start Sodular

Build the Sodular database admin interface:

```bash
cd sodular
docker-compose up --build
```

Visit the Sodular admin interface at: **http://localhost:3004**

#### Default Login Credentials
- **Email**: `root@sodular.com`
- **Password**: `root@123`


### Step 3: Set Up Database for Dallosh

Follow these steps in the Sodular admin interface to create a new database for Dallosh:

#### 1. Create Database
![Create Database](assets/screenshots/1%20-%20create_database.png)

#### 2. Database Created Successfully
![Database Created](assets/screenshots/2%20-%20database_created.png)

#### 3. Enable Users Feature
![Enable Users](assets/screenshots/3%20-%20enable_users.png)

#### 4. Enable Constraints
![Enable Constraints](assets/screenshots/4%20-%20enable_constraints.png)

#### 5. Create Model (Part 1)
![Create Model Part 1](assets/screenshots/5%20-%20create%20model%20part%201.png)

#### 6. Create Model (Part 2)
![Create Model Part 2](assets/screenshots/5%20-%20create%20model%20part%202.png)

#### 7. Create Model (Part 3)
![Create Model Part 3](assets/screenshots/5%20-%20create%20model%20part%203.png)

#### 8. Create Model (Part 4)
![Create Model Part 4](assets/screenshots/5%20-%20create%20model%20part%204.png)

#### 9. Create Admin User
![Create Admin User](assets/screenshots/6%20-%20create%20admin%20user.png)

#### 10. Create Simple User
![Create Simple User](assets/screenshots/7%20-%20create%20simple%20user.png)

#### 11. Get Database ID
![Get Database ID](assets/screenshots/8%20-%20get%20the%20database%20id.png)

**Important**: Copy the Database ID - you'll need it for Dallosh configuration!

### Step 4: Set Up Dallosh Environment Variables

Now configure the environment variables for Dallosh services:

#### Dallosh Bot Environment
Create `.env` file in `./dallosh/servers/dallosh_bot/`:

```bash
# Visit https://aistudio.google.com/apikey
GEMINI_API_KEY=
# Visit https://app.rime.ai/tokens/
RIME_API_KEY=
LOCAL_SMART_TURN_MODEL_PATH=/app/models/smart-turn

# SODULAR_BASE_URL=http://localhost:5005/api/v1
SODULAR_BASE_URL=http://sodular_server:5005/api/v1

# AI Configuration
DALLOSH_AI_BASE_URL=http://localhost:7860
```

#### Dallosh Client Environment
Create `.env` file in `./dallosh/clients/dallosh_web/`:

```bash
# Sodular Configuration
NEXT_PUBLIC_SODULAR_BASE_URL=http://localhost:5005/api/v1
NEXT_PUBLIC_SODULAR_AI_BASE_URL=http://localhost:4200/api/v1
NEXT_PUBLIC_SODULAR_DATABASE_ID=YOUR_DATABASE_ID_HERE

# Dallosh AI Configuration
NEXT_PUBLIC_DALLOSH_AI_BASE_URL=http://localhost:7860
```

#### Update Dallosh Client Configuration
Update the configuration in `./dallosh/clients/dallosh_web/src/configs/index.ts`:

```typescript
function getLocal(key: string, fallback: string) {
  if (typeof window !== 'undefined') {
    const val = localStorage.getItem(key);
    if (val) return val;
  }
  return fallback;
}
  
// Update these URLs and database ID to match your setup
export const apiUrl = getLocal('sodular_base_url', process.env.NEXT_PUBLIC_SODULAR_BASE_URL || 'http://localhost:5005/api/v1');
export const aiUrl = getLocal('sodular_ai_base_url', process.env.NEXT_PUBLIC_SODULAR_AI_BASE_URL || 'http://localhost:4200/api/v1');
export const databaseID = getLocal('sodular_database_id', process.env.NEXT_PUBLIC_SODULAR_DATABASE_ID || 'YOUR_DATABASE_ID_HERE');
export const dalloshAIBaseUrl = getLocal('dallosh_ai_base_url', process.env.NEXT_PUBLIC_DALLOSH_AI_BASE_URL || 'http://localhost:7860');
```

### Step 5: Build and Start Dallosh

Build the Dallosh chatbot service:

```bash
cd dallosh
docker-compose up --build
```

Visit the Dallosh chatbot interface at: **http://localhost:3005**

## 🏃‍♂️ Quick Start Commands

```bash
# Start Sodular
cd sodular && docker-compose up --build

# Start Dallosh (in another terminal)
cd dallosh && docker-compose up --build

# Stop services
docker-compose down
```

## 🔧 Development

### Local Development Setup

For local development without Docker:

```bash
# Install dependencies
cd sodular/clients/sodular_web && npm install
cd ../../servers/sodular_server && pip install -r requirements.txt

cd ../../dallosh/clients/dallosh_web && npm install
cd ../../servers/dallosh_bot && pip install -r requirements.txt

# Start services
npm run dev  # For Next.js clients
python main.py  # For Python servers
```

### Environment Variables for Development

Create `.env.local` files in each project directory with your local configuration.


## 🌟 Features

### Dallosh Chatbot
- **Multi-modal Chat**: Text, voice, and file support
- **AI Integration**: Powered by advanced language models
- **Social Media Ready**: Easy integration with Twitter, Facebook, etc.
- **Enterprise Security**: Role-based access control
- **Real-time Analytics**: Chat insights and performance metrics

### Sodular Platform
- **Database Management**: Easy setup and configuration
- **User Management**: Admin and user role management
- **API Gateway**: RESTful API for data operations
- **Real-time Updates**: WebSocket support for live data
- **Scalable Architecture**: Built for enterprise workloads

### Diagram Classes

Main classes for Dallosh:

- 'users' : { uid, data:{email, password, username, field:{}, createAt, udatedAt}
- 'posts': {uid, data:{}, }  # a post belongs to users
- 'comments': {uid, data:{}}  # a comment belong to post by user
- 'chat': {uid, data:{}, }  # a chat session has messages
- 'messages': {uid, data:{}} 
- 'requests' : {uid, data:{}}

### For Developers API using Sodular SDK client for services:

`./dallosh/clients/dallosh_web/src/services/client.ts`

```ts
import { SodularClient, SodularClientInstance, Ref, Table, User } from '@/lib/sodular';

const sodularClientFactory = SodularClient({ baseUrl: apiUrl, ai: { baseUrl: aiUrl } });
const { client, isReady, error } = await sodularClientFactory.connect();
if (error || !isReady) {
console.error("Failed to connect to Sodular backend:", error);
return null;
}

// Use existing database
if (databaseID) client.use(databaseID);

// client.setToken(token);

const result  = await client.auth.login({data:{email, password}}) // client.auth.register({})

//----------------- (optional)

// get the uid of an existing database

const databaseResult = await client.database.get({filter:{'data.name':'dallosh'}}) // like mongodb

const databaseId =  databaseResult.data.uid

// create database dynamically

const databaseResult = await client.database.create({name:'dallosh'})

const databaseId =  databaseResult.data.uid

// if you created dynamically ou have to set it again with .use()
// if (databaseID) client.use(databaseID);

//----------------- (optional)

//Check if table exists

const tableResult = await client.tables.get({filter:{'data.name':'posts'}}) // like mongodb

if(tableResult.data.data.name) {

}

// create a Table
const tableResult = await client.tables.create({data:{name:'posts'}})

// Work with documents

const documentResult = await client.ref.from(tableResult.data.uid).create({data:{...object}})

const documentResult = await client.ref.from(tableResult.data.uid).get({filter:{'data.[key]':value}}) // return object

//get many 

const documentResult = await client.ref.from(tableResult.data.uid).query({filter:{'data.[key]':value}}) // return {list:[]}

// list events

await client.ref.from(tableResult.data.uid).on('created', callback) // 'created', 'replaced', 'patched', 'deleted'


````

## 🤝 Contributing

We welcome contributions! Please read our contributing guidelines and submit pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

**Dallosh** is developed by:

- **Ivan Joel SOBGUI** - Project Lead & Full-Stack Developer
- **Ben Lol** - Backend Developer
- **Mohammed** - AI/ML Engineer
- **Nagui** - Frontend Developer
- **Cyrile** - DevOps Engineer
- **Pascal** - Database Architect

## 📞 Support

For support and questions:
- Create an issue in this repository
- Contact the development team
- Check our documentation

---

**Dallosh** - Empowering enterprises with intelligent conversational AI 🚀


