# LaTeX Resume Tailor Chrome Extension

AI-powered resume customization tool that automatically:
1. Fetches job descriptions from LinkedIn/Indeed/Glassdoor
2. Analyzes required skills using LLMs
3. Tailors your LaTeX resume for each application
4. Generates referral contacts

## Setup Instructions

### 1. Prerequisites
- Chrome browser
- [OpenRouter API key](https://openrouter.ai/) (free tier available)

### 2. Installation
1. Create a new folder for the extension
2. Download all files into the folder
3. In `utils/llm.js`, add your OpenRouter API key:
   ```js
   const OPENROUTER_API_KEY = "your-api-key-here";
```