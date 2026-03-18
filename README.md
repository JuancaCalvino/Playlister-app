# Playlister

[![Frontend](https://img.shields.io/badge/Frontend-Next.js_16-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Language](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![AI](https://img.shields.io/badge/AI-OpenAI_GPT--4o_mini-412991?style=flat&logo=openai&logoColor=white)](https://platform.openai.com/)
[![API](https://img.shields.io/badge/API-Spotify_Web_API-1DB954?style=flat&logo=spotify&logoColor=white)](https://developer.spotify.com/)

A web application that creates the perfect Spotify playlist for any mood, vibe, or moment — powered by conversational AI.

Describe what you want to hear in natural language and get a curated, ready-to-save Spotify playlist in seconds.

## 🚀 Features

- **AI-Powered Generation:** Chat naturally with GPT-4o to create playlists by mood, genre, artist, duration, or any context you can describe.
- **Full Spotify Integration:** OAuth 2.0 authentication to search tracks, create playlists, and save them directly to your Spotify account.
- **Drag & Drop Reordering:** Rearrange tracks in your playlist with smooth drag-and-drop powered by Framer Motion.
- **Track Replacement:** Replace any track in the playlist by searching Spotify directly from the app.
- **Smart Genre Filtering:** AI suggestions are validated against Spotify's actual genre metadata to ensure playlist coherence.
- **Real-Time Streaming:** Chat responses stream in real-time with animated loading states and progress indicators.
- **Multi-Language Support:** Available in 6 languages (English, Español, Français, Deutsch, Italiano, Português) with automatic browser language detection.

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router, React 19)
- **Language:** TypeScript
- **AI Model:** OpenAI GPT-4o
- **Music API:** Spotify Web API (via `spotify-web-api-node`)
- **Styling:** Tailwind CSS 4
- **Animations:** Framer Motion
- **Icons:** Lucide React

## 📦 Project Structure

The project follows the standard Next.js App Router structure:

### 1. Frontend (`/src/app`)

The user-facing interface built with React and Tailwind CSS.

- **Landing Page:** Spotify OAuth login screen with session management.
- **Chat Interface:** Conversational AI chat with playlist preview sidebar, drag & drop, track replacement modal, and save-to-Spotify flow.

### 2. API Routes (`/src/app/api`)

Server-side endpoints that handle authentication and business logic.

- **`/api/auth/callback/spotify`** — Handles the Spotify OAuth callback and token exchange.
- **`/api/chat`** — Processes user messages through OpenAI, searches and validates songs on Spotify, and streams results back.
- **`/api/playlist/create`** — Creates a new playlist on the user's Spotify account and adds the selected tracks.
- **`/api/search`** — Searches Spotify tracks with filtering and deduplication for the track replacement feature.

### 3. Libraries (`/src/lib`)

Shared utilities, API clients, and the internationalization system.

- **`spotify.ts`** — Spotify API client configuration and OAuth URL generation.
- **`openai.ts`** — OpenAI client configuration.
- **`i18n/`** — Language provider, context hook, and translation strings for 6 languages.

## ⚙️ Getting Started

### Prerequisites

- Node.js (v18 or later)
- A [Spotify Developer](https://developer.spotify.com/dashboard) application
- An [OpenAI API](https://platform.openai.com/) key

### Setup and Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/JuancaCalvino/Playlister-app.git
   cd Playlister-app
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Copy the example file and fill in your credentials:

   ```bash
   cp .env.example .env.local
   ```

   Then edit `.env.local` with your actual API keys. See [`.env.example`](.env.example) for the required variables.

4. **Configure Spotify redirect URI:**
   In your [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), add the following redirect URI to your application:

   ```
   http://127.0.0.1:3000/api/auth/callback/spotify
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```
   The application will be available at `http://127.0.0.1:3000`.

## 🔄 How It Works

1. **Login** — The user authenticates via Spotify OAuth on the landing page.
2. **Chat** — The user describes what kind of music they want in natural language (e.g., _"2 hours of 90s techno"_, _"songs like Radiohead"_, _"reggaeton para perrear"_).
3. **AI Generation** — GPT-4o interprets the request and generates a buffered song list (2× the requested amount to account for search/validation filtering).
4. **Spotify Validation** — Each AI-suggested song is searched on Spotify and validated against artist genre metadata to ensure playlist coherence.
5. **Playlist Preview** — Matched tracks appear in an interactive sidebar where the user can reorder, remove, or replace songs.
6. **Save to Spotify** — The finalized playlist is saved directly to the user's Spotify account with a custom name.

## 🔒 Spotify OAuth Scopes

The application requires the following permissions:

- **`user-read-private`** — Read user profile information.
- **`user-read-email`** — Read user email address.
- **`playlist-modify-public`** — Create and modify public playlists.
- **`playlist-modify-private`** — Create and modify private playlists.

## 📌 Main Features

- **Conversational Playlist Creation:** Describe any mood, genre, artist, or occasion to generate a curated playlist.
- **Full Playlist Management:** Reorder tracks with drag & drop, remove unwanted songs, and replace individual tracks via Spotify search.
- **Save & Export:** Name your playlist and save it directly to your Spotify library, with deep links to open it in the Spotify app or web player.
- **Multilingual Interface:** Seamlessly switch between 6 languages with a dropdown selector, or let the app auto-detect your browser language.
