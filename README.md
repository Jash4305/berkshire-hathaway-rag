<div align="center">

# 🏦 Berkshire Hathaway RAG Intelligence

### AI-Powered Investment Wisdom from Warren Buffett's Shareholder Letters

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Mastra](https://img.shields.io/badge/Mastra-000000?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkw0IDZWMThMMTIgMjJMMjAgMThWNkwxMiAyWiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=)](https://mastra.ai/)

**Ask questions, get insights, learn from decades of investment wisdom.**

[Features](#-features) • [Quick Start](#-quick-start) • [Usage](#-usage) • [Architecture](#-architecture)

</div>

---

## 🎯 What is This?

A production-ready RAG (Retrieval-Augmented Generation) system that lets you have intelligent conversations about Warren Buffett's investment philosophy using his annual shareholder letters (2019-2024).

**Try asking:**

- _"What is Warren Buffett's investment philosophy?"_
- _"How does Berkshire evaluate companies?"_
- _"What does Charlie Munger say about patience?"_

---

## ✨ Features

- 🤖 **GPT-4o Powered** - Advanced AI conversations with precise citations
- 📚 **Vector Search** - Semantic search across shareholder letters using PostgreSQL + PgVector
- 💾 **Conversation Memory** - Maintains context across chat sessions
- 🎨 **Modern UI** - Clean, responsive interface with streaming responses
- 📊 **Source Attribution** - Every answer cites the original shareholder letter
- ⚡ **Real-time Streaming** - Watch answers appear as they're generated

---

## 🚀 Quick Start

### Prerequisites

| Tool               | Version             | Purpose             |
| ------------------ | ------------------- | ------------------- |
| Node.js            | ≥20.9.0             | Runtime             |
| PostgreSQL         | ≥14.0               | Vector database     |
| pgVector Extension | same as PostgresSQL | Store Vectors       |
| OpenAI API Key     | -                   | GPT-4o & embeddings |

### Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd berkshire-hathaway-rag

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.sample .env
# Edit .env with your credentials

# 4. Setup database
psql -U postgres -c "CREATE DATABASE berkshire_rag;"
psql -U postgres -d berkshire_rag -f database/schema.sql

# 5. Load documents (one-time setup)
npm run ingest

# 6. Start the application
npm run dev
```

## ⚙️ Configuration

### `.env` File

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-your-key-here

# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/berkshire_rag
```

### Available Scripts

```bash
npm run ingest    # Load PDFs and generate embeddings (one-time)
npm run dev       # Start development server with UI
npm run build     # Build for production
npm run start     # Run production server
```

---

## 💬 Usage

### 1. Start the Application

```bash
npm run dev
```

### 2. Setup database

```bash
psql -U postgres -c "CREATE DATABASE berkshire_rag;"
psql -U postgres -d berkshire_rag -f src/database/schema.sql
```

### 3. Open the Chat Interface

Navigate to `http://localhost:4111` in your browser

### 3. Ask Questions

**Example Conversation:**

```
You: What companies does Berkshire own the largest stakes in?
```
