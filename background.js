let currentJD = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'JD_EXTRACTED' || message.type === 'JD_UPDATED') {
    currentJD = message.data;
    chrome.storage.local.set({ currentJD });
    return false;
  }
  
  if (message.type === 'FETCH_JD') {
    fetchJDContent(message.url)
      .then(jdData => {
        currentJD = jdData;
        chrome.storage.local.set({ currentJD });
        sendResponse(jdData);
      })
      .catch(error => {
        console.error('Fetch error:', error);
        sendResponse({ error: true, message: error.message });
      });
    return true; // Will respond asynchronously
  }
});

async function fetchJDContent(url) {
  try {
    if (url.toLowerCase().endsWith('.pdf')) {
      throw new Error('PDF parsing not supported');
    }
    
    // Use chrome.scripting to inject content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      throw new Error('No active tab found');
    }

    // Try to execute the scraper directly on the page
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const text = document.body.innerText;
        const title = document.title;
        // Try to find company name in common meta tags
        const companyMeta = document.querySelector('meta[property="og:site_name"]') || 
                          document.querySelector('meta[name="application-name"]');
        return {
          jdText: text.substring(0, 10000),
          company: companyMeta ? companyMeta.content : '',
          title: title
        };
      }
    });

    if (!results || !results[0]?.result) {
      throw new Error('Could not extract content from page');
    }

    const { jdText, company, title } = results[0].result;
    
    return {
      jdText,
      company,
      sourceUrl: url,
      title,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Content script injection failed:', error);
    // Fallback to direct fetch if script injection fails
    const response = await fetch(url);
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return {
      jdText: doc.body.innerText.substring(0, 10000),
      sourceUrl: url,
      company: '',
      timestamp: Date.now()
    };
  }
}