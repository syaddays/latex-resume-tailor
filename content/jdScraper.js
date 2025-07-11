// Common selectors that might contain job descriptions
const JD_SELECTORS = [
  // Generic job description containers
  '[class*="job-description"]',
  '[class*="description"]',
  '[class*="posting"]',
  '[class*="position"]',
  '[id*="job-description"]',
  '[id*="description"]',
  // Common article/content containers
  'article',
  '.content',
  'main',
  // Specific selectors for known sites
  '.jobs-description__content',
  '#jobDescriptionText',
  '.jobDescriptionContent',
  // Expertia.ai specific
  '[class*="job-detail"]',
  '[class*="requirement"]'
];

// Common selectors that might contain company names
const COMPANY_SELECTORS = [
  // Generic company name containers
  '[class*="company"]',
  '[class*="organization"]',
  '[class*="employer"]',
  // Meta tags
  'meta[property="og:site_name"]',
  'meta[name="application-name"]',
  'meta[property="og:title"]',
  // Common heading patterns
  'h1',
  'h2',
  '.title'
];

function findJobDescription() {
  let bestMatch = {
    text: '',
    score: 0
  };

  // Try each selector
  for (const selector of JD_SELECTORS) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const text = element.innerText.trim();
      if (text.length > 100) { // Minimum length for a job description
        const score = scoreJobDescription(text);
        if (score > bestMatch.score) {
          bestMatch = { text, score };
        }
      }
    }
  }

  // If no good match found through selectors, try main content
  if (bestMatch.score < 0.5) {
    const mainContent = document.body.innerText;
    const score = scoreJobDescription(mainContent);
    if (score > bestMatch.score) {
      bestMatch = {
        text: mainContent,
        score: score
      };
    }
  }

  return bestMatch.score > 0.3 ? bestMatch.text : null;
}

function findCompanyName() {
  // First try meta tags
  const metaTags = [
    'meta[property="og:site_name"]',
    'meta[name="application-name"]',
    'meta[property="og:title"]'
  ];

  for (const selector of metaTags) {
    const meta = document.querySelector(selector);
    if (meta?.content) {
      const company = extractCompanyName(meta.content);
      if (company) return company;
    }
  }

  // Try common selectors
  for (const selector of COMPANY_SELECTORS) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const text = element.innerText || element.content;
      if (text) {
        const company = extractCompanyName(text);
        if (company) return company;
      }
    }
  }

  // Try to extract from URL
  const urlCompany = extractCompanyFromURL(window.location.hostname);
  if (urlCompany) return urlCompany;

  return '';
}

function scoreJobDescription(text) {
  // Keywords that indicate job description content
  const jobKeywords = [
    'requirements', 'qualifications', 'responsibilities', 'experience',
    'skills', 'about the role', 'job description', 'position',
    'salary', 'benefits', 'required', 'preferred', 'education',
    'background', 'knowledge', 'opportunity', 'team', 'work with'
  ];

  const lowercaseText = text.toLowerCase();
  let score = 0;

  // Check for presence of job-related keywords
  jobKeywords.forEach(keyword => {
    if (lowercaseText.includes(keyword.toLowerCase())) {
      score += 0.1;
    }
  });

  // Check for common job description patterns
  if (/(\d+\+?\s*(year|yr)s?\s*(of\s*)?experience)/i.test(text)) score += 0.2;
  if (/bachelor'?s?\s*degree/i.test(text)) score += 0.2;
  if (/full[\s-]time|part[\s-]time/i.test(text)) score += 0.2;
  if (/we\s*(are\s*)?looking\s*for/i.test(text)) score += 0.2;
  if (/apply|join|hiring/i.test(text)) score += 0.1;

  // Normalize score to 0-1 range
  return Math.min(score, 1);
}

function extractCompanyName(text) {
  // Remove common suffixes
  text = text.replace(/(Inc\.|LLC|Ltd\.?|Limited|Corp\.?|Corporation)$/i, '').trim();
  // Remove common job posting prefixes/suffixes
  text = text.replace(/(Hiring|Job|Position|Opening|at|with|-).*$/i, '').trim();
  return text;
}

function extractCompanyFromURL(hostname) {
  // Remove common domains
  const company = hostname.replace(/\.(com|org|net|io|ai|co|jobs)$/i, '')
    // Split by dots and dashes
    .split(/[.-]/)
    // Get the most likely company name part
    .filter(part => part.length > 2)
    .pop();
  
  return company ? company.charAt(0).toUpperCase() + company.slice(1) : '';
}

function extractJD() {
  console.log('Attempting to extract JD...');
  
  const jdText = findJobDescription();
  console.log('Extracted text length:', jdText?.length);
  
  if (!jdText || jdText.length < 100) {
    console.warn('JD extraction failed or content too short');
    return null;
  }

  const company = findCompanyName();
  console.log('Company found:', company);

  return {
    jdText: jdText.substring(0, 10000),
    company,
    sourceUrl: window.location.href,
    timestamp: Date.now()
  };
}

// Listen for extraction requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  if (message.type === 'EXTRACT_JD') {
    const data = extractJD();
    if (data) {
      chrome.runtime.sendMessage({
        type: 'JD_EXTRACTED',
        data
      });
    }
  }
});

// Main execution
function init() {
  console.log('Content script initializing...');
  const extractedData = extractJD();
  if (extractedData) {
    console.log('Sending extracted JD to background...');
    chrome.runtime.sendMessage({
      type: 'JD_EXTRACTED',
      data: extractedData
    });
  } else {
    console.log('No JD found on initial extraction');
  }
}

// Wait for page to be fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}