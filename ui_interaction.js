/* The JavaScript file which is responsible in extracting the meaningful information and process them to backend
Also file is responsible to display the reports or inspect the insights from backend to html page */
document.getElementById('generateReport').addEventListener('click', async () => {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
  
    if (!startDate || !endDate) {
      alert('Please select both start and end dates to fetch the summary within timeframe.');
      return;
    }
    

    
    // Send dates to background.js
    chrome.runtime.sendMessage({ action: 'generateReport', startDate, endDate }, (response) => {
      const reportResult = document.getElementById('reportResult');
      preReportNote.innerHTML ='Fetching the emails and processing....';
      if (response.success) {
        reportResult.innerHTML = `<a href="${response.reportUrl}" download="report.txt">Download Report</a>`;
      } else {
        reportResult.innerHTML = 'Error generating report.';
      }
    });
  });