# 🍽️ AI-Powered Revenue & Voice Copilot for Restaurants

![Hackathon](https://img.shields.io/badge/Hackathon-Project-orange)
![AI](https://img.shields.io/badge/AI-Restaurant%20Intelligence-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Status-Prototype-success)


> An AI-powered system that analyzes restaurant PoS data to optimize menu profitability and automates phone-based ordering using a multilingual voice assistant.

---

# 📑 Table of Contents

- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [Solution](#-solution)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Dashboard Features](#-dashboard-features)
- [Voice Ordering Flow](#-voice-ordering-flow)
- [Dataset Format](#-dataset-format)
- [Installation Guide](#-installation-guide)
- [API Endpoints](#-api-endpoints)
- [Demo Workflow](#-demo-workflow)
- [Business Impact](#-business-impact)
- [Future Improvements](#-future-improvements)
- [Team](#-team)
- [License](#-license)

---

# 📌 Overview

Restaurants generate massive volumes of transactional data through **Point-of-Sale (PoS) systems**, yet most businesses fail to leverage this data effectively.

At the same time, **phone-based ordering remains manual**, error-prone, and inefficient.

This project introduces an **AI Revenue & Voice Copilot** that:

- Analyzes PoS data to uncover hidden revenue opportunities
- Optimizes menu profitability using AI insights
- Suggests intelligent item combos
- Automates voice-based ordering
- Recommends upsells in real time

---

# ❗ Problem Statement

Restaurants face several operational and revenue challenges:

• High-margin items that sell poorly  
• Low-margin items dominating sales  
• Inefficient pricing strategies  
• Missed upselling opportunities  
• Manual phone ordering errors  
• Lack of data-driven menu decisions  

---

# 💡 Solution

Our system uses **AI analytics and voice automation** to improve restaurant operations.

Core capabilities include:

- Revenue intelligence from PoS data
- Menu engineering analysis
- Smart combo generation
- AI-powered voice ordering
- Real-time upsell recommendations

---

# 🚀 Key Features

## 📊 Revenue Intelligence Engine

Analyzes restaurant menu performance using AI.

Capabilities:

- Contribution margin calculation
- Item profitability analysis
- Sales velocity tracking
- Low-performing SKU detection
- Price optimization suggestions
- Menu classification using Menu Engineering Matrix

Menu Engineering Matrix:

| Category | Description |
|--------|-------------|
| ⭐ Star | High profit + High popularity |
| 🧩 Puzzle | High profit + Low popularity |
| 🐎 Plowhorse | Low profit + High popularity |
| 🐶 Dog | Low profit + Low popularity |

---

## 🧠 Smart Combo Recommendation Engine

Uses **Market Basket Analysis (Apriori Algorithm)** to detect frequently ordered items.

Example:

```

Pizza → Coke
Burger → Fries
Pasta → Garlic Bread

```

Generated Combo Example:

```

Pizza + Coke → ₹280 instead of ₹300

```

This increases **Average Order Value (AOV)**.

---

## 🎤 AI Voice Ordering Copilot

Automates food ordering using natural language voice interaction.

Capabilities:

- Speech-to-text processing
- Natural language understanding
- Menu item detection
- Modifier recognition (size, add-ons, spice level)
- Order confirmation
- Structured order generation
- Real-time upsell suggestions

Example Voice Input:

```

User: One paneer pizza and two coke

````

Generated Order:

```json
{
 "items":[
   {"name":"Paneer Pizza","qty":1},
   {"name":"Coke","qty":2}
 ]
}
````

---

# 🌍 Multi-Language Support

Designed for Indian restaurants.

Supported languages:

* English
* Hindi
* Hinglish

Example:

```
"Ek paneer pizza aur ek coke"
```

---

# 🏗 System Architecture

```
                    ┌────────────────────────┐
                    │      Web Dashboard     │
                    │     (Next.js/React)    │
                    └─────────────┬──────────┘
                                  │
                                  │ REST API
                                  │
                    ┌─────────────▼──────────┐
                    │       Backend API      │
                    │   (FastAPI / Node.js)  │
                    └─────────────┬──────────┘
                                  │
       ┌──────────────────────────┼─────────────────────────┐
       │                          │                         │
       ▼                          ▼                         ▼

Revenue Intelligence        Recommendation Engine       Voice Ordering Engine

• Margin Analysis           • Combo Suggestions          • Speech Recognition
• Menu Classification       • Basket Analysis            • Intent Detection
• Sales Analytics           • Upsell Logic               • Order Generation
• Price Optimization        • AOV Optimization           • Multilingual Support
```

---

# ⚙️ Technology Stack

## Frontend

* Next.js
* React
* TailwindCSS
* Recharts / Chart.js

## Backend

* FastAPI / Node.js
* REST API

## Machine Learning

* Python
* Pandas
* Scikit-learn
* Apriori Algorithm

## Voice Processing

* Whisper
* Vosk

## Database

* SQLite
* PostgreSQL

---

# 📂 Project Structure

```
restaurant-ai-copilot
│
├── frontend
│   ├── components
│   ├── pages
│   ├── dashboard
│   └── voice-ui
│
├── backend
│   ├── api
│   ├── revenue_engine
│   ├── recommendation_engine
│   └── voice_agent
│
├── data
│   └── sample_pos_data.csv
│
├── models
│   └── apriori_model.pkl
│
├── docs
│   └── architecture.png
│
└── README.md
```

---

# 📊 Dashboard Features

The web dashboard provides restaurant owners with **actionable business insights**.

Includes:

* Revenue overview
* Average Order Value (AOV)
* Top-selling items
* Low-margin items
* Menu Engineering Matrix
* Combo recommendations
* Upsell analytics

---

# 🎤 Voice Ordering Flow

```
Customer Voice
      ↓
Speech-to-Text Conversion
      ↓
Intent Detection
      ↓
Menu Item Mapping
      ↓
Upsell Suggestion Engine
      ↓
Order Confirmation
      ↓
Structured Order JSON
```

---

# 🧪 Dataset Format

Example PoS dataset:

| Item         | Price | Food Cost | Quantity Sold |
| ------------ | ----- | --------- | ------------- |
| Paneer Pizza | 250   | 120       | 50            |
| Garlic Bread | 120   | 40        | 5             |
| Coke         | 50    | 20        | 200           |

Contribution Margin Formula:

```
Contribution Margin = Selling Price - Food Cost
```

---

# 🖥 Installation Guide

## Clone Repository

```
git clone https://github.com/yourusername/restaurant-ai-copilot.git
```

---

## Install Backend Dependencies

```
pip install -r requirements.txt
```

Run backend server:

```
python main.py
```

---

## Install Frontend

```
cd frontend
npm install
```

Run frontend:

```
npm run dev
```

---

# 📡 API Endpoints

### Upload PoS Data

```
POST /upload-data
```

---

### Get Revenue Analysis

```
GET /revenue-analysis
```

---

### Get Combo Recommendations

```
GET /combo-recommendations
```

---

### Process Voice Order

```
POST /voice-order
```

---

# 🎬 Demo Workflow

1️⃣ Upload restaurant PoS dataset
2️⃣ AI analyzes menu performance
3️⃣ Dashboard displays profitability insights
4️⃣ System recommends combos and pricing improvements
5️⃣ Voice assistant takes order
6️⃣ AI suggests upsells during ordering
7️⃣ Order is converted into structured JSON

---

# 📈 Business Impact

This system helps restaurants:

✔ Increase **Average Order Value (AOV)**
✔ Improve **menu profitability**
✔ Reduce **manual order-taking errors**
✔ Automate **phone ordering**
✔ Enable **data-driven business decisions**

---

# 🔮 Future Improvements

Potential extensions:

* Full phone-call AI ordering
* Live PoS integration
* Inventory-aware recommendations
* Dynamic menu pricing
* AI demand forecasting
* Real-time restaurant analytics

---

# 👨‍💻 Team

Hackathon Team Project

Roles:

* Frontend Developer – Dashboard & UI
* Backend Developer – APIs & Data Processing
* ML Engineer – Revenue Intelligence & Recommendation Engine
* AI Engineer – Voice Ordering System

---

# 🏆 Vision

Our goal is to build an **AI Copilot for Restaurants** that converts **raw PoS data into actionable revenue intelligence** while automating customer ordering experiences.

This system bridges **AI analytics, voice automation, and restaurant operations** to help restaurants maximize revenue.

---

# 📄 License

This project is licensed under the **MIT License**.

---

# ⭐ Support

If you like this project, please give it a ⭐ on GitHub!

```


