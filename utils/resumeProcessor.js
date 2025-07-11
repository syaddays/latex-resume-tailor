export function processResume(resume, analysis, options) {
  // 1. Inject keywords
  let modified = injectKeywords(resume, options.selectedSkills);
  
  // 2. Update summary
  if (options.newSummary) {
    modified = replaceSection(modified, 'summary', options.newSummary);
  }
  
  // 3. Add projects
  if (options.newProjects && options.newProjects.length > 0) {
    modified = addProjects(modified, options.newProjects);
  }
  
  // 4. Add referral section
  if (options.includeReferral && analysis.company) {
    modified += `\n\\section{Referral}\nConnect with employees at ${analysis.company}: \\href{https://linkedin.com/search/results/people/?company=${encodeURIComponent(analysis.company)}}{LinkedIn Search}`;
  }
  
  return modified;
}

function injectKeywords(resume, keywords) {
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'gi');
    resume = resume.replace(regex, `\\\\textbf{${keyword}}`);
  });
  return resume;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceSection(resume, sectionName, newContent) {
  const sectionRegex = new RegExp(`\\\\section\\{${sectionName}\\}.*?\\\\section\\{`, 's');
  if (sectionRegex.test(resume)) {
    return resume.replace(sectionRegex, `\\section{${sectionName}}\n${newContent}\n\n\\section{`);
  }
  return `\\section{${sectionName}}\n${newContent}\n\n${resume}`;
}

function addProjects(resume, projects) {
  const projectsTex = projects.map(proj => `\\item ${proj}`).join('\n');
  const projectsSection = `\\section{Projects}\n\\begin{itemize}\n${projectsTex}\n\\end{itemize}`;
  
  if (resume.includes('\\end{document}')) {
    return resume.replace('\\end{document}', `${projectsSection}\n\\end{document}`);
  }
  return `${resume}\n\n${projectsSection}`;
}