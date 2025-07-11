// Add imports at the top
import { callLLM, createJDAnalysisPrompt, createSummaryPrompt } from '../utils/llm.js';
import { processResume } from '../utils/resumeProcessor.js';

let currentJD = null;
let resumeContent = '';
let analysisResults = null;

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/jdScraper.js']
    });
    return true;
  } catch (error) {
    console.error('Script injection failed:', error);
    return false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  showLoader('Initializing...');
  
  try {
    const tab = await getCurrentTab();
    if (!tab) {
      throw new Error('No active tab found');
    }

    console.log('Current tab:', tab.url);
    
    // First try to get stored JD
    const { currentJD: storedJD } = await chrome.storage.local.get('currentJD');
    
    if (storedJD) {
      console.log('Found stored JD');
      currentJD = storedJD;
      renderJD(currentJD);
      analyzeJD(currentJD.jdText);
    } else {
      console.log('No stored JD, attempting extraction');
      showLoader('Analyzing page content...');
      
      // Inject content script
      const injected = await injectContentScript(tab.id);
      if (!injected) {
        throw new Error('Failed to inject content script');
      }

      // Wait for content script to initialize and try to extract JD
      try {
        const response = await new Promise((resolve, reject) => {
          // Set a timeout for the extraction
          const timeout = setTimeout(() => {
            reject(new Error('Extraction timed out'));
          }, 5000);

          // Listen for the extraction result
          chrome.runtime.onMessage.addListener(function listener(message) {
            if (message.type === 'JD_EXTRACTED') {
              clearTimeout(timeout);
              chrome.runtime.onMessage.removeListener(listener);
              resolve(message.data);
            }
          });

          // Trigger the extraction
          chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_JD' });
        });

        if (response) {
          console.log('Extraction successful:', response);
          currentJD = response;
          renderJD(currentJD);
          analyzeJD(currentJD.jdText);
        } else {
          throw new Error('No job description found');
        }
      } catch (error) {
        console.error('Extraction error:', error);
        showFallbackSection();
      }
    }
  } catch (error) {
    console.error('Initialization error:', error);
    showFallbackSection();
  }

  // Set up resume content and event listeners
  resumeContent = localStorage.getItem('resumeContent') || '';
  document.getElementById('resume-input').value = resumeContent;

  document.getElementById('fetch-jd').addEventListener('click', fetchManualJD);
  document.getElementById('resume-input').addEventListener('input', saveResume);
  document.getElementById('process-btn').addEventListener('click', handleResumeProcessing);
  document.getElementById('rewrite-summary').addEventListener('click', rewriteSummary);
  document.getElementById('add-project').addEventListener('click', addProject);
  document.getElementById('copy-resume').addEventListener('click', copyResume);
  document.getElementById('download-resume').addEventListener('click', downloadResume);
});

function showFallbackSection() {
  document.getElementById('fallback-section').classList.remove('hidden');
  document.getElementById('jd-status').textContent = 'Ready for manual input';
  document.getElementById('jd-status').classList.remove('error');
}

function showLoader(message = 'Processing...') {
  const statusEl = document.getElementById('jd-status');
  statusEl.textContent = message;
  statusEl.classList.remove('error');
}

function saveResume() {
  resumeContent = document.getElementById('resume-input').value;
  localStorage.setItem('resumeContent', resumeContent);
}

function renderJD(jdData) {
  const jdSection = document.getElementById('jd-section');
  jdSection.classList.remove('hidden');

  document.getElementById('jd-status').textContent = 
    `✅ JD loaded from ${new URL(jdData.sourceUrl).hostname}`;
  
  document.getElementById('company-name').textContent = 
    jdData.company || 'Unknown Company';
  
  const seniority = detectSeniority(jdData.jdText);
  document.getElementById('job-level').textContent = 
    seniority ? ` | ${seniority}` : '';

  document.getElementById('jd-preview').textContent = 
    jdData.jdText.substring(0, 500) + (jdData.jdText.length > 500 ? '...' : '');
}

function detectSeniority(jdText) {
  const levels = [
    { regex: /(senior|sr\.?|lead|principal)/i, level: 'Senior' },
    { regex: /(mid-level|mid|experienced)/i, level: 'Mid-Level' },
    { regex: /(junior|jr\.?|entry-level|graduate)/i, level: 'Junior' },
    { regex: /(intern|internship)/i, level: 'Intern' }
  ];
  
  for (const { regex, level } of levels) {
    if (regex.test(jdText)) return level;
  }
  return '';
}

async function analyzeJD(jdText) {
  showLoader();
  try {
    const response = await callLLM(createJDAnalysisPrompt(jdText));
    analysisResults = JSON.parse(response);
    
    renderSkills(analysisResults.techSkills);
    document.getElementById('skills-section').classList.remove('hidden');
    document.getElementById('process-btn').disabled = false;
    
    if (analysisResults.company) {
      renderReferralSection(analysisResults.company);
    }
  } catch (error) {
    showError('Analysis failed. Please try again or paste manually.');
  } finally {
    hideLoader();
  }
}

function renderSkills(skills) {
  const skillsList = document.getElementById('skills-list');
  skillsList.innerHTML = '';

  const prioritized = prioritizeSkills(skills);
  
  prioritized.forEach(skill => {
    const div = document.createElement('div');
    div.className = 'skill-item';
    div.innerHTML = `
      <input type="checkbox" id="skill-${skill.skill}" ${skill.critical ? 'checked' : ''}>
      <label for="skill-${skill.skill}">${skill.skill}${skill.critical ? ' (⭐)' : ''}</label>
    `;
    skillsList.appendChild(div);
  });
}

function prioritizeSkills(skills) {
  const MUST_HAVE_KEYWORDS = ['required', 'must have', 'mandatory'];
  return skills.map(skill => ({
    skill,
    critical: MUST_HAVE_KEYWORDS.some(kw => skill.toLowerCase().includes(kw))
  }));
}

function renderReferralSection(company) {
  if (!company) return;
  
  const section = document.getElementById('referral-section');
  section.classList.remove('hidden');
  
  const link = document.getElementById('referral-link');
  link.href = `https://linkedin.com/search/results/people/?company=${encodeURIComponent(company)}`;
  link.textContent = `Find ${company} Employees on LinkedIn`;
  
  document.getElementById('referral-tip').textContent = 
    'Pro Tip: Message 2nd-degree connections for referrals';
}

async function fetchManualJD() {
  const input = document.getElementById('jd-input').value.trim();
  if (!input) return;
  
  showLoader();
  try {
    if (input.startsWith('http')) {
      const jdData = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'FETCH_JD', url: input }, response => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });
      
      if (jdData.error) throw new Error('Fetch failed');
      currentJD = jdData;
      renderJD(currentJD);
      analyzeJD(currentJD.jdText);
    } else {
      // Handle manual text input
      currentJD = {
        jdText: input,
        sourceUrl: 'manual-input',
        company: '',  // Can be extracted from text if needed
        timestamp: Date.now()
      };
      document.getElementById('jd-section').classList.remove('hidden');
      document.getElementById('jd-status').textContent = '✅ JD loaded from manual input';
      document.getElementById('jd-preview').textContent = input.substring(0, 500) + (input.length > 500 ? '...' : '');
      analyzeJD(input);
    }
  } catch (error) {
    console.error('JD fetch error:', error);
    showError('Could not fetch JD. Please check URL or paste directly.');
  } finally {
    hideLoader();
  }
}

async function rewriteSummary() {
  const summaryInput = document.getElementById('summary-input');
  const originalSummary = summaryInput.value;
  if (!originalSummary) return;
  
  showLoader();
  try {
    const skills = getSelectedSkills();
    const newSummary = await callLLM(createSummaryPrompt(originalSummary, skills));
    summaryInput.value = newSummary;
    document.getElementById('summary-section').classList.remove('hidden');
  } catch (error) {
    showError('Summary rewrite failed. Please try again.');
  } finally {
    hideLoader();
  }
}

function addProject() {
  const projectsList = document.getElementById('projects-list');
  const projectCount = projectsList.children.length;
  
  const div = document.createElement('div');
  div.className = 'project-item';
  div.innerHTML = `
    <input type="text" placeholder="Project title" class="project-title">
    <textarea placeholder="Project description (1-2 sentences)"></textarea>
  `;
  projectsList.appendChild(div);
  document.getElementById('projects-section').classList.remove('hidden');
}

function getSelectedSkills() {
  const checkboxes = document.querySelectorAll('#skills-list input[type="checkbox"]:checked');
  return Array.from(checkboxes).map(cb => {
    const label = cb.nextElementSibling;
    return label.textContent.replace(' (⭐)', '');
  });
}

function getAddedProjects() {
  const projects = [];
  document.querySelectorAll('.project-item').forEach(item => {
    const title = item.querySelector('.project-title').value;
    const description = item.querySelector('textarea').value;
    if (title && description) {
      projects.push(`\\textbf{${title}}: ${description}`);
    }
  });
  return projects;
}

async function handleResumeProcessing() {
  const resumeInput = document.getElementById('resume-input').value;
  if (!resumeInput) {
    showError('Please paste your resume first');
    return;
  }
  
  showLoader();
  try {
    const selectedSkills = getSelectedSkills();
    const summary = document.getElementById('summary-input').value;
    const projects = getAddedProjects();
    
    const processed = processResume(
      resumeInput,
      {
        techSkills: analysisResults.techSkills,
        keywords: analysisResults.keywords,
        company: analysisResults.company
      },
      {
        selectedSkills,
        newSummary: summary,
        newProjects: projects,
        includeReferral: true
      }
    );
    
    showOutput(processed);
  } catch (error) {
    showError('Resume processing failed: ' + error.message);
  } finally {
    hideLoader();
  }
}

function showOutput(processedResume) {
  const outputSection = document.getElementById('output-section');
  outputSection.classList.remove('hidden');
  document.getElementById('resume-output').value = processedResume;
}

function copyResume() {
  const textarea = document.getElementById('resume-output');
  textarea.select();
  document.execCommand('copy');
  alert('Copied to clipboard!');
}

function downloadResume() {
  const content = document.getElementById('resume-output').value;
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tailored_resume.tex';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function showError(message) {
  const statusEl = document.getElementById('jd-status');
  statusEl.textContent = `❌ ${message}`;
  statusEl.classList.add('error');
}