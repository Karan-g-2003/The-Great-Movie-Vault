```
  ████████╗██╗  ██╗███████╗     ██████╗ ██████╗ ███████╗ █████╗ ████████╗
  ╚══██╔══╝██║  ██║██╔════╝    ██╔════╝ ██╔══██╗██╔════╝██╔══██╗╚══██╔══╝
     ██║   ███████║█████╗      ██║  ███╗██████╔╝█████╗  ███████║   ██║
     ██║   ██╔══██║██╔══╝      ██║   ██║██╔══██╗██╔══╝  ██╔══██║   ██║
     ██║   ██║  ██║███████╗    ╚██████╔╝██║  ██║███████╗██║  ██║   ██║
     ╚═╝   ╚═╝  ╚═╝╚══════╝     ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝

  ███╗   ███╗ ██████╗ ██╗   ██╗██╗███████╗    ██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗
  ████╗ ████║██╔═══██╗██║   ██║██║██╔════╝    ██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝
  ██╔████╔██║██║   ██║██║   ██║██║█████╗      ██║   ██║███████║██║   ██║██║     ██║
  ██║╚██╔╝██║██║   ██║╚██╗ ██╔╝██║██╔══╝      ╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║
  ██║ ╚═╝ ██║╚██████╔╝ ╚████╔╝ ██║███████╗     ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║
  ╚═╝     ╚═╝ ╚═════╝   ╚═══╝  ╚═╝╚══════╝      ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝

        🌟 Discover Your Next Favourite Film — Neon Dreams, Perfect Picks 🌟
```

<div align="center">

![License](https://img.shields.io/badge/license-MIT-08DB89?style=flat-square)
![Version](https://img.shields.io/badge/version-2.0.0-08DB89?style=flat-square)
![Status](https://img.shields.io/badge/status-active-08DB89?style=flat-square)

**Netflix-level movie discovery powered by Bayesian scoring algorithms. Search by vibe, mood, genre, or actor — no account needed.**

[Live Demo](https://the-great-movie-vault.vercel.app/) • [Documentation](#getting-started) • [Issues](https://github.com/Karan-g-2003/cine-gpt/issues)

</div>

---

## ✨ What is The Great Movie Vault?

The Great Movie Vault is a **free, intelligent movie discovery platform** that understands your taste with unprecedented precision. No more endless scrolling — just tell us your mood, genre, vibe, decade, or favourite actor, and we'll find your next obsession.

Built with **React 19 + Vite 7** and powered by **The Movie Database API**, The Great Movie Vault combines a stunning glassmorphism UI with **Bayesian-scored recommendation algorithms** that rival Netflix.

---

## 🎯 Core Features

<table>
<tr>
<td width="50%">

### 🤖 Smart Search Engine
Search intuitively by:
- **Genres** – Action, Drama, Comedy, Sci-Fi, Horror...
- **Moods** – Happy, Sad, Scary, Tense, Nostalgic, Jolly
- **Vibes** – Mind-bending, Cyberpunk, Noir, Surreal
- **Regions** – Bollywood, Korean, Japanese, French...
- **Decades** – 80s, 90s, 2000s, Classics
- **Keywords** – Plot Twist, Heist, Time Travel, Revenge
- **Combinations** – "90s Bollywood thriller", "feel-good Korean drama"

</td>
<td width="50%">

### 🧮 Netflix-Level Algorithm
- **Bayesian Weighted Rating** – IMDB Top 250 formula
- **Composite Scoring** – 5 weighted signals
- **MMR Diversity** – No monotonous results
- **Levenshtein Fuzzy Match** – Typo tolerance
- **Weighted Shuffle** – Controlled randomness
- **Taste Profile** – Learns your preferences
- **Multi-source Blending** – 3 recommendation sources

</td>
</tr>
<tr>
<td width="50%">

### 🎨 Playful Dynamic UI
- **Gradient mesh background** – Animated hue shifts
- **3D tilt movie cards** – Hover glow effects
- **Glassmorphism panels** – Backdrop blur + transparency
- **SVG Rating Rings** – Circular progress indicators
- **Skeleton shimmer loading** – Premium feel
- **Staggered entrance animations** – Page transitions
- **Google Fonts (Outfit)** – Modern typography

</td>
<td width="50%">

### 🌍 Global Cinema
- **Bollywood** – Hindi cinema masterpieces
- **Hollywood** – English-language blockbusters
- **Korean Cinema** – Award-winning K-movies
- **Japanese Films** – Anime & live-action
- **French Cinema** – Artistic excellence
- **Tamil & Telugu** – South Indian gems
- **Spanish, Chinese, German** – World cinema

</td>
</tr>
</table>

---

## 🚀 Tech Stack

<div align="center">

| Technology | Purpose |
|:---:|:---|
| **React 19** | ⚛️ UI Component Library |
| **Vite 7** | ⚡ Next-Gen Build Tool |
| **Tailwind CSS 3** | 🎨 Utility-First Styling |
| **Lucide React** | 🎭 Icon System |
| **TMDb API** | 🎬 Movie Database |
| **Custom Scoring Engine** | 🧮 Bayesian WR + MMR + Fuzzy |

</div>

---

## 🎬 How It Works

```
┌─────────────────────────────────────────────────────────┐
│  User Input (Mood, Genre, Keyword, Region, Decade)      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Tokenized Query Parser                                 │
│  • Fuzzy Matching    • Genre/Mood ID Lookup             │
│  • Region Detection  • Keyword Extraction               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Multi-Strategy Fallback Chain                          │
│  • Discovery Search (with vote relaxation)              │
│  • Person Search (actor/director filmography)           │
│  • Title Search (with Levenshtein fuzzy match)          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Bayesian Scoring Engine                                │
│  • WR = (v/(v+m))·R + (m/(v+m))·C                      │
│  • Composite: Title + Rating + Popularity + Freshness   │
│  • MMR Diversity Injection                              │
│  • Fisher-Yates Weighted Shuffle                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  🎨 Glassmorphism Results Display                       │
│  ✨ 3D Cards • Rating Rings • Streaming • Trailers      │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Getting Started

### Prerequisites
```
✓ Node.js 16 or higher
✓ npm or yarn package manager
✓ Git for version control
```

### Quick Setup

```bash
# 1️⃣ Clone the repository
git clone https://github.com/Karan-g-2003/cine-gpt.git
cd cine-gpt

# 2️⃣ Create .env file with your TMDB API key
echo "VITE_TMDB_API_KEY=your_api_key_here" > .env

# 3️⃣ Install dependencies
npm install

# 4️⃣ Start development server
npm run dev
```

Your app is now running at **http://localhost:5173** ✨

### Build for Production

```bash
npm run build     # Create optimized production build
npm run preview   # Preview production build locally
```

---

## 📂 Project Architecture

```
the-great-movie-vault/
│
├── 📄 index.html              # SEO-optimized HTML (OG, Twitter, JSON-LD, FAQ schema)
├── 📦 package.json            # Dependencies & scripts
├── 🔒 .env                    # API key (not committed)
│
├── 📁 public/
│   ├── favicon.svg            # Custom compass/clapperboard logo
│   ├── og-image.png           # Social sharing preview
│   ├── manifest.json          # PWA manifest
│   ├── robots.txt             # Crawler rules (15+ AI bots)
│   ├── sitemap.xml            # Search engine sitemap
│   ├── llms.txt               # AI/LLM discovery file
│   ├── llms-full.txt          # Extended AI documentation
│   ├── ai.txt                 # AI usage policy
│   ├── humans.txt             # Developer credits
│   ├── browserconfig.xml      # Windows tiles
│   └── .well-known/
│       └── security.txt       # Security disclosure
│
└── 📁 src/
    ├── 🎯 App.jsx             # Main application component
    ├── 🧮 scoring.js          # Bayesian scoring engine
    ├── 🗄️ db.js               # Storage layer (localStorage)
    ├── 🧩 components.jsx      # RatingRing, MovieCard, SkeletonGrid
    ├── 🎨 App.css             # Glassmorphism design system
    ├── 📱 main.jsx            # React DOM entry
    └── 🌐 index.css           # Tailwind directives
```

---

## 🔌 API Configuration

This project integrates with **The Movie Database (TMDb) API**.

### Setup Steps:
1. Visit [TMDb Settings](https://www.themoviedb.org/settings/api)
2. Create an API account
3. Generate your API key
4. Add to `.env` file:
   ```
   VITE_TMDB_API_KEY=your_api_key_here
   ```

---

## 📝 Available Scripts

```bash
npm run dev      # 🚀 Start dev server with hot reload
npm run build    # 📦 Production-optimized build
npm run preview  # 👁️  Preview production build locally
npm run lint     # ✅ Run ESLint code quality checks
```

---

## 🧮 Scoring Algorithm Deep Dive

### Bayesian Weighted Rating
```
WR = (v / (v + m)) × R + (m / (v + m)) × C

v = number of votes for the movie
m = minimum votes threshold (dynamic)
R = average rating for the movie
C = mean rating across the dataset
```

### Composite Relevance Score (0-100)
| Signal | Weight | Method |
|--------|--------|--------|
| Title Match | 25% | Levenshtein similarity |
| Bayesian Rating | 30% | WR formula above |
| Popularity | 15% | Log-normalized |
| Freshness | 10% | Exponential decay |
| Genre Boost | 20% | Jaccard overlap |

### Diversity: Maximal Marginal Relevance (MMR)
Prevents result monotony by penalizing movies too similar to already-selected results. Lambda parameter balances relevance vs. diversity.

---

## 🤝 Contributing

We love contributions! Here's how you can help:

```
1. 🍴 Fork the repository
2. 🌿 Create your feature branch (git checkout -b feature/amazing-feature)
3. 📝 Commit changes (git commit -m 'Add amazing feature')
4. 🚀 Push to branch (git push origin feature/amazing-feature)
5. 🔄 Open a Pull Request
```

---

## 📄 License

This project is licensed under the **MIT License** – feel free to use it however you'd like!

```
MIT License © 2025 Karan-g-2003
```

---

## 🌟 Showcase

> "The Great Movie Vault changed how I discover movies. The algorithm understands my taste better than friends!" – A satisfied user

---

<div align="center">

### 🎬 Ready to Discover Your Next Favourite Film?

```
Start Exploring Now → https://github.com/Karan-g-2003/cine-gpt
```

**Made with 💚 and 🎥 by Karan**

⭐ If you love The Great Movie Vault, consider giving us a star on GitHub! ⭐

```
    🌟 NEON DREAMS, PERFECT PICKS 🌟
```

</div>
