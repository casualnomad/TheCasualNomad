# 🎒 The Casual Nomad — AI-Powered Packing List Generator

An intelligent, beautifully designed web application that generates personalized packing lists for your trips using Claude AI. Simply tell the app about your destination, activities, and travel style—and it'll create an optimized packing list tailored to your journey.

## ✨ Features

- **AI-Generated Lists** — Powered by Claude AI to create smart, destination-specific packing recommendations
- **Trip Intelligence** — Get insights about climate, activities, local costs, and what makes your destination special
- **Smart Categorization** — Automatically organized sections (Clothing, Tech, Toiletries, Documents, etc.) plus trip-specific categories
- **Weight Tracking** — Monitor total weight against your bag capacity and see progress toward your goal
- **Progress Tracking** — Visual indicator of how many items you've packed
- **One-Bag Optimized** — Suggestions tailored for carry-on and lightweight travel
- **Browser Storage** — Your list is automatically saved locally—close and return anytime
- **CSV Export** — Export your packing list for offline reference or sharing
- **Responsive Design** — Works seamlessly on desktop, tablet, and mobile
- **Dark Mode UI** — Beautiful, modern dark theme with accent colors

## 🚀 Quick Start

### Option 1: Use the Live Demo
Visit the deployed version and start generating packing lists immediately.

### Option 2: Self-Host
1. Clone this repository
2. Open `index.html` in your browser
3. Configure the Cloudflare Worker URL (see below)

## 🛠 Setup & Deployment

### Prerequisites
- A Cloudflare account (free tier works)
- Claude API access key

### Deploying the AI Backend (Cloudflare Worker)

This app relies on a Cloudflare Worker to communicate with Claude AI. Follow these steps:

1. **Create a Cloudflare Worker:**
   - Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Go to **Workers & Pages** → **Create Application** → **Create a Worker**

2. **Deploy the worker code:**
   - Replace the default code with the contents of `worker.js`
   - Set your Claude API key in the Worker secrets:
     ```bash
     wrangler secret put CLAUDE_API_KEY
     # Then paste your Claude API key when prompted
     ```

3. **Update the Worker URL:**
   - In `index.html`, find this line:
     ```javascript
     const WORKER_URL = '';
     ```
   - Replace it with your Worker's URL (found in the Cloudflare dashboard)

4. **Test it:**
   - Open `index.html` and generate a test packing list

## 📋 How It Works

### User Flow
1. **Setup Screen** — Enter trip details:
   - Destination / Trip type
   - Bag/Kit model
   - Weight limit
   - Travel dates and duration
   - Activities and trip style
   - Climate and personal notes

2. **AI Generation** — The app sends your trip details to Claude AI via the Cloudflare Worker, which:
   - Analyzes your destination and activities
   - Tailors recommendations to local climate and culture
   - Creates 6–10 organized categories
   - Estimates item weights
   - Suggests cost-effective options

3. **Your Packing List** — Interactive list with:
   - Checkboxes to track progress
   - Weight tracking
   - Color-coded badges (Key Item, To Buy, Buy Local, Hire Locally)
   - Destination-specific tips for each item

4. **Export & Share** — Download as CSV or reset and start a new trip

## 📁 Project Structure

```
TheCasualNomad/
├── index.html          # Main app (HTML + CSS + JavaScript)
├── worker.js           # Cloudflare Worker for AI integration
├── dummy.data          # Sample packing list data
├── .gitignore          # Git configuration
└── README.md           # This file
```

## 🎨 Customization

### Change Colors
Edit the CSS variables in `index.html`:
```css
:root {
  --bg: #0f1117;           /* Background */
  --accent: #f4a622;       /* Primary accent */
  --accent2: #e8623a;      /* Secondary accent */
  --green: #4ecb71;        /* Success/checked */
  --red: #e84f4f;          /* Warnings/errors */
  /* ... etc */
}
```

### Add More Emoji Icons
Update the `EMOJIS` array in `index.html`:
```javascript
const EMOJIS = ['👕','🧥','👟','👜', /* add more */];
```

### Adjust AI Prompt
Edit the `buildPrompt()` function in `index.html` to change how Claude generates recommendations.

## 💾 Data Storage

- **Local Storage** — Lists are saved to browser localStorage with key `packListData_v2`
- **No Server Required** — Your data never leaves your device (except the AI generation prompt)
- **Manual Export** — Use the CSV export feature to backup or share lists

## 🔑 Key Features Explained

### Badges
- **🔥 Key Item** — Essential; don't forget this
- **🛒 To Buy** — Purchase before the trip
- **📍 Buy Local** — Cheaper or better to buy at destination
- **🤝 Hire Locally** — Rent or hire at your destination

### Weight Tracking
- Displays packed weight vs. total weight
- Shows progress toward your bag's capacity limit
- Color-coded: green (under limit), orange (close), red (over limit)

### Trip Intelligence
- Destination overview
- Activity recommendations
- Local cost estimates
- Climate details

## 🐛 Troubleshooting

**"API error" when generating a list:**
- Check that the Worker URL in `index.html` is correct
- Verify your Claude API key is set in Cloudflare Secrets
- Ensure you have Claude API credits remaining

**List not saving:**
- Check that localStorage is enabled in your browser
- Try clearing browser cache and reloading

**Cloudflare Worker errors:**
- Review Worker logs in the Cloudflare dashboard
- Check that the request format matches the expected JSON schema

## 🤝 Contributing

Have ideas for improvements? Found a bug? Feel free to:
- Open an issue
- Submit a pull request
- Share feedback

## 📄 License

This project is open source. Feel free to use, modify, and share.

## 🙏 Credits

- Built with [Claude AI](https://claude.ai) for intelligent packing recommendations
- Deployed on [Cloudflare Workers](https://workers.cloudflare.com)
- Inspired by the minimalist travel philosophy of one-bag travel

---

**Happy travels! 🌍✈️**
