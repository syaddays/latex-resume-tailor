# LaTeX Resume Tailor Chrome Extension

A Chrome extension that automatically tailors your LaTeX resume for job applications using AI-powered analysis.

## Features

- 🔍 Automatic job description extraction from any job posting website
- 🤖 AI-powered analysis of job requirements and skills
- ✍️ Smart resume customization based on job requirements
- 📄 LaTeX resume formatting and processing
- 🔗 LinkedIn referral contact generation
- 💼 Support for multiple job boards and company career pages

## Installation

1. Clone this repository:
   ```bash
   git clone [your-repo-url]
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right

4. Click "Load unpacked" and select the extension directory

5. Add your OpenRouter API key in `utils/llm.js`:
   ```javascript
   const OPENROUTER_API_KEY = "your-api-key-here";
   ```

## Usage

1. **Automatic Job Description Extraction**
   - Visit any job posting page
   - Click the extension icon
   - The extension will automatically detect and extract the job description

2. **Manual Input**
   - Click the extension icon
   - Paste the job description or URL in the input field
   - Click "Fetch JD" if using a URL

3. **Resume Customization**
   - Paste your LaTeX resume in the input field
   - Select relevant skills detected by the AI
   - Add/modify projects as needed
   - Click "Tailor Resume" to generate the customized version

4. **Export**
   - Copy the generated LaTeX code
   - Download as a .tex file
   - Use the referral link to find potential contacts

## Development

### Project Structure
```
latex-resume-tailor/
├── manifest.json               # Extension configuration
├── background.js              # Background service worker
├── content/
│   └── jdScraper.js          # Job description extraction
├── popup/
│   ├── popup.html            # Extension UI
│   ├── popup.css             # Styles
│   └── popup.js              # UI logic
├── utils/
│   ├── llm.js                # OpenRouter API integration
│   └── resumeProcessor.js    # LaTeX processing
└── icons/                    # Extension icons
```

### Technologies Used
- Chrome Extension APIs
- OpenRouter API for AI analysis
- JavaScript Modules
- LaTeX processing

### Building
1. Make changes to the source code
2. Test using "Load unpacked" in Chrome
3. For production, zip the directory for Chrome Web Store submission

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
MIT License - feel free to use this code for your own projects!

## Credits
- OpenRouter API for AI capabilities
- Chrome Extension APIs
- Contributors and testers