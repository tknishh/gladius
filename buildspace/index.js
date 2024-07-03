require("dotenv").config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const OpenAI = require('openai');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const credentials = require('./client_secret.json');

const app = express();
const port = 3000;

app.use(express.json());

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Ensure credentials are loaded correctly
if (!credentials || !credentials.installed) {
  throw new Error('Missing or invalid client_secret.json');
}

// Initialize SQLite database
const db = new sqlite3.Database(':memory:');

// Create emails table
db.serialize(() => {
  db.run(`CREATE TABLE emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient TEXT,
    sender TEXT,
    subject TEXT,
    date TEXT,
    snippet TEXT,
    body TEXT
  )`);
});

// Function to list unread messages
async function listMessages(auth) {
  const gmail = google.gmail({ version: 'v1', auth });

  // List unread messages
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: 'is:unread',
  });
  const messages = res.data.messages || [];

  for (const message of messages) {
    const msg = await gmail.users.messages.get({
      userId: 'me',
      id: message.id,
    });

    const headers = msg.data.payload.headers;
    const snippet = msg.data.snippet;

    const getHeader = (name) => headers.find(header => header.name === name)?.value;

    const to = getHeader('To');
    const from = getHeader('From');
    const subject = getHeader('Subject');
    const date = getHeader('Date');
    const body = msg.data.payload.parts?.find(part => part.mimeType === 'text/plain')?.body?.data;
    const decodedBody = body ? Buffer.from(body, 'base64').toString('utf8') : '';

    // Save message to the database
    db.run(
      'INSERT INTO emails (recipient, sender, subject, date, snippet, body) VALUES (?, ?, ?, ?, ?, ?)',
      [to, from, subject, date, snippet, decodedBody]
    );
  }
}

function getOAuth2Client() {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
}

// Function to store token
function storeToken(token) {
  const tokenPath = path.join(__dirname, 'token.json');
  fs.writeFileSync(tokenPath, JSON.stringify(token));
}

// OAuth2 callback route
app.get('/oauth2callback', async (req, res) => {
  try {
    const oAuth2Client =  getOAuth2Client();
    const { code } = req.query;
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    storeToken(tokens);
    res.status(200).send('Authorization successful. You can now fetch emails.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error during authorization.');
  }
});

// Fetch latest emails since last fetched
app.get('/fetch-latest-emails', async (req, res) => {
  try {
    const oAuth2Client = getOAuth2Client();

    // Check if we have previously stored a token.
    const tokenPath = path.join(__dirname, 'token.json');
    if (fs.existsSync(tokenPath)) {
      const token = fs.readFileSync(tokenPath);
      oAuth2Client.setCredentials(JSON.parse(token));
      await listMessages(oAuth2Client);
      res.status(200).send('Emails fetched and saved successfully.');
    } else {
      // Generate a new token
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/gmail.readonly'],
      });
      res.status(200).send(`Authorize this app by visiting this url: ${authUrl}`);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching emails.');
  }
});

// Process email body to find answers to 8 pre-written prompts
app.post('/process-email', async (req, res) => {
  try {
    const { emailId } = req.body;
    db.get('SELECT * FROM emails WHERE id = ?', [emailId], async (err, email) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error querying the database.');
      }

      if (!email) {
        return res.status(404).send('Email not found.');
      }

      const prompts = [
        "According to your intellect, would you define the given mail, as a response for a job application? It could be a mail for next round or just the confirmation of application submitted.",
        "According to you intellect, classify the mail in one of the following types: Application Submitted, Selected for Next Round, Offer Letter, Is not anything related to job.",
        "What is the company name from whom the response came?",
        "Do you find any link to the company website or search for the one and return the link only?",
        "Do you find the interviewers name if, this is the mail for the next round, if yes, return the name of the interviewer.",
        "If you did find the interviewer's name find the LinkedIn profile of the interviewer based on the company name and other details, or return N/A.",
        "If there's a meeting link of zoom, google meet, or any other video platform to conduct the interview, return the link only.",
        "If the email includes information about the next steps in the application process, describe the next steps briefly."
      ];      

      const responses = [];
      for (const prompt of prompts) {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          prompt: `${prompt}\n\nEmail Body: ${email.body}`,
          max_tokens: 150,
        });
        responses.push(response.data.choices[0].text.trim());
      }

      res.status(200).json({ responses });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error processing email.');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});