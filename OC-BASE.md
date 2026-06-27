# Cartografía Semántica de Desaparecidos - Jalisco

## 🏗️ Overview

This project is an interactive platform designed for the geolocation and analysis of reports of missing persons and forensic records in the state of Jalisco. It integrates a backend built with Python (FastAPI) and PostgreSQL (Supabase), along with a dynamic frontend developed using React + Vite.

## 🧱 Architecture

The repository is structured as a clean, decoupled monorepo:

- **`frontend/`**: User interface application built with React/Vite (ready for deployment on Vercel).
- **`backend/`**: REST API server developed with FastAPI, SQLAlchemy, and PostgreSQL (packaged in Docker).
- **`api/` (Legacy)**: Original PHP scripts from the previous version (maintained for temporary compatibility).

## 🚀 Tech Stack

- **Backend**: Python (FastAPI), SQLAlchemy, PostgreSQL (Supabase)
- **Frontend**: React + Vite
- **Database**: PostgreSQL (Supabase) with indexing and optimization
- **State Management**: Context API, Redux (as needed)
- **Data Visualization**: MapLibre for geospatial rendering, Sigma.js for semantic graph visualization

## 📌 Key Features

1. **Geolocation of Missing Persons**: Interactive map for locating missing persons and forensic records.
2. **Data Migration**: Automated migration from MySQL to PostgreSQL with index collision fixes.
3. **Session Management**: Offline-first approach with local storage (IndexedDB) and synchronization with the backend.
4. **Semantic Graph**: Integration of relational data through a semantic graph using Sigma.js.
5. **Offline Capabilities**: Local data storage and synchronization for offline use.
6. **User Authentication**: Secure login and registration via Supabase.

## 📅 Status

### ✅ Completed Phases

- **Phase 1 (Authentication)**: Implemented Supabase authentication with login and registration screens.
- **Phase 2 (Session Management and Local Persistence)**: Integrated local storage (IndexedDB) for offline data persistence.
- **Phase 3 (Semantic Links)**: Added hooks and components for managing semantic links between data entities.
- **Phase 4 (Unified State Management)**: Merged local and remote data into a unified state for rendering on the map.
- **Phase 5 (Integrated Visualization and UI)**: Added UI components for viewing and managing local data, including a floating action button (FAB) for quick data entry.
- **Phase 6 (WebGL MapLibre and Sigma Conflict Resolution)**: Resolved conflicts between WebGL rendering in MapLibre and Sigma.js graph visualization.

### 🚀 Ongoing Improvements

- **Performance Optimization**: Continued optimization of backend queries and frontend rendering for faster data retrieval and display.
- **User Experience Enhancements**: Refinement of UI/UX for better user interaction and data visualization.

## 📌 Next Steps

- Finalize the documentation by organizing all gathered information into structured sections.
- Review the documentation for clarity and completeness before finalizing it.
- Ensure that all key features, architecture, and tech stack details are clearly explained.
- Include any additional notes or considerations for future development or maintenance.