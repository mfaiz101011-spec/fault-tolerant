
# Fault-Tolerant Data Processing System

A full-stack data processing system designed to handle incoming data reliably, validate and normalize it, and continue processing even when individual records or requests fail.

The project focuses on building a simple and practical fault-tolerant architecture using a TypeScript backend and React frontend.

## Features

* Process incoming data through a backend API
* Validate and normalize input data
* Handle invalid records without stopping the complete process
* Store processed data in a database
* Provide a simple web interface to interact with the system
* Clear separation between frontend and backend
* Environment variables for configuration

## Tech Stack

### Frontend

* React
* TypeScript
* Vite
* CSS

### Backend

* Node.js
* TypeScript
* Express

### Database

* SQL

## Project Structure

```text
fault-tolerant-data-processing-system/
│
├── backend/
│   ├── src/
│   │   ├── db.ts
│   │   ├── normalize.ts
│   │   ├── schema.sql
│   │   └── server.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── package.json
├── README.md
└── SUBMISSION_CHECKLIST.md
```

## How It Works

The system follows a simple processing flow:

```text
Input Data
    ↓
Validation
    ↓
Normalization
    ↓
Processing
    ↓
Database
    ↓
Frontend
```

If a particular record is invalid or causes an error, the system handles that record separately instead of allowing the entire processing operation to fail.

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/mfaiz101011-spec/fault-tolerant.git
cd fault-tolerant
```

### 2. Install dependencies

Install the project dependencies for the backend and frontend.

```bash
cd backend
npm install
```

Then:

```bash
cd ../frontend
npm install
```

### 3. Configure environment variables

Create a `.env` file inside the `backend` directory using `.env.example` as a reference.

```bash
cp .env.example .env
```

On Windows, you can also create the file manually.

### 4. Start the backend

```bash
cd backend
npm run dev
```

### 5. Start the frontend

Open another terminal:

```bash
cd frontend
npm run dev
```

The frontend will then be available at the local Vite development URL shown in the terminal.

## Fault Tolerance

The main idea behind this project is that **one bad input should not bring down the entire data-processing pipeline**.

For example, if 100 records are received and 5 of them contain invalid data, the system should continue processing the valid records while handling the invalid ones appropriately.

This makes the system more reliable when working with real-world data, where malformed or unexpected input is common.

## What I Learned

While building this project, I worked with:

* REST APIs
* TypeScript
* React
* Database integration
* Input validation
* Data normalization
* Error handling
* Environment configuration
* Frontend-backend communication
* Basic fault-tolerant system design

## Future Improvements

Some improvements that could be added in the future:

* Add a message queue for asynchronous processing
* Add retry mechanisms for temporary failures
* Add structured logging and monitoring
* Add authentication and authorization
* Add automated tests
* Add Docker support
* Add batch processing for large datasets
* Add better failure/recovery reporting


---

If you found this project useful, feel free to explore the repository and suggest improvements.
