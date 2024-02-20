// API client setup and authorization
const CLIENT_ID = 'YOUR_CLIENT_ID';
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

let accessToken;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'authorize') {
        // Handle authorization flow using your preferred method
        // (e.g., redirect URI, popup window)
    } else if (message.action === 'exportData') {
        fetchData(message.params)
            .then(data => sendResponse(data))
            .catch(error => sendResponse({ error }));
    }
});

function fetchData(params) {
    // Use the Fetch API with access token to make authenticated requests
    // to the Gmail API endpoints based on `params` (similar to Python code)
    // Extract and process relevant data from the responses
}

// Python code converted to JavaScript
const query_params = {
    newer_than: [3, 'month'],
};

const messages = gmail.get_messages(construct_query(query_params));

// Open the CSV file in write mode
const csvData = [['To', 'From', 'Subject', 'Date', 'Preview', 'Message Body']];

// Iterate over the messages
for (const message of messages) {
    // Write the data for each message
    csvData.push([message.recipient, message.sender, message.subject, message.date, message.snippet, message.plain]);
}

// Convert csvData to CSV format
const csvContent = csvData.map(row => row.join(',')).join('\n');

// Create a Blob with the CSV content
const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

// Create a download link and trigger the download
const link = document.createElement('a');
link.href = URL.createObjectURL(blob);
link.download = 'email_results.csv';
link.click();
