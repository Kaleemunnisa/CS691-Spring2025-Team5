/* The file is used to communicate with Gmail API and extract emails */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'generateReport') {
      const { startDate, endDate } = request;
  
      // Authenticate and fetch emails
      authenticateAndFetchEmails(startDate, endDate)
        .then(emails => {
          const parsedEmails = emails.map(email => parseEmail(email));
          // Send emails to app.py for NLP processing
          // Local Host Configuration setup needs to be done. TBC (To be completed)

          fetch('http://localhost:5000/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({emails: parsedEmails })
          })
            .then(response => response.json())
            .then(data => {
              sendResponse({ success: true, reportUrl: data.reportUrl });
            })
            .catch(error => {
              console.error('Error processing emails:', error);
              sendResponse({ success: false });
            });
        })
        .catch(error => {
          console.error('Error fetching emails:', error);
          sendResponse({ success: false });
        });
  
      return true; // Keep the message channel open for sendResponse
    }
  });
  
  async function authenticateAndFetchEmails(startDate, endDate) {
    // To be implemented, work with Gmail API to get the emails
    // Implementation of Gmail API
    return new Promise(async (resolve, reject) => {
      try {
        // Step 1: We Authenticate using OAuth2
        const token = await authenticateWithOAuth2();
  
        // Step 2: We Fetch emails using the Gmail API
        const emails = await fetchEmailsFromGmail(token, startDate, endDate);
  
        // Step 3: Resolve with the fetched emails
        resolve(emails);
      } catch (error) {
        reject(error);
        // Handling the error
      }
    });
  }
  async function authenticateWithOAuth2() {
    return new Promise((resolve, reject) => {
      const clientId = '693601175348-fo5r4764em8p7m4sbren1imrblp4ntil.apps.googleusercontent.com'; // Replace with your OAuth2 client ID
      const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];
  
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError || !token) {
          reject(new Error('OAuth2 authentication failed.'));
        } else {
          resolve(token);
        }
      });
    });
  }
  async function fetchEmailsFromGmail(token, startDate, endDate) {
    return new Promise(async (resolve, reject) => {
      try {
        const query = `after:${startDate} before:${endDate}`;
        const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`;
  
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
  
        if (!response.ok) {
          throw new Error(`Failed to fetch emails: ${response.statusText}`);
        }
  
        const data = await response.json();
        const emails = [];
  
        // Fetch full details of each email
        for (const message of data.messages) {
          const email = await fetchEmailDetails(token, message.id);
          emails.push(email);
        }
  
        resolve(emails);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  async function fetchEmailDetails(token, messageId) {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`;
  
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  
    if (!response.ok) {
      throw new Error(`Failed to fetch email details: ${response.statusText}`);
    }
  
    const email = await response.json();
    return email;
  }

  // The below funtions is added to code as this will reduce the latency in the code
  function parseEmail(email) {
    const headers = email.payload.headers;
    const parsedEmail = {};

    // To Extract relevant headers
    headers.forEach(header => {
        switch (header.name) {
            case 'From':
                parsedEmail.from = header.value;
                break;
            case 'To':
                parsedEmail.to = header.value;
                break;
            case 'Cc':
                parsedEmail.cc = header.value;
                break;
            case 'Subject':
                parsedEmail.subject = header.value;
                break;
            case 'Date':
                parsedEmail.date = header.value;
                break;
        }
    });
    if (email.payload.parts) {
      email.payload.parts.forEach(part => {
          if (part.mimeType === 'text/plain') {
              parsedEmail.body = Buffer.from(part.body.data, 'base64').toString('utf-8');
          } else if (part.mimeType === 'text/html') {
              parsedEmail.htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
          }
      });
  } else if (email.payload.body.data) {
      parsedEmail.body = Buffer.from(email.payload.body.data, 'base64').toString('utf-8');
  }

  return parsedEmail;
}

