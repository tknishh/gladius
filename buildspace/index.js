const express = require('express');
const { Client } = require('pg');
const { Configuration, OpenAIApi } = require('openai');
const { google } = require('googleapis');
const credentials = require('./credentials.json'); // Path to your OAuth2 credentials

const app = express();
const port = 3000;

// Initialize OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Initialize PostgreSQL client
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});
client.connect();

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
    await client.query(
      'INSERT INTO emails (recipient, sender, subject, date, snippet, body) VALUES ($1, $2, $3, $4, $5, $6)',
      [to, from, subject, date, snippet, decodedBody]
    );
  }
}

// Fetch latest emails since last fetched
app.get('/fetch-latest-emails', async (req, res) => {
  try {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Token generation or use existing token process goes here
    // e.g., oAuth2Client.setCredentials(token);

    await listMessages(oAuth2Client);

    res.status(200).send('Emails fetched and saved successfully.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching emails.');
  }
});

// Process email body to find answers to 8 pre-written prompts
app.post('/process-email', async (req, res) => {
  try {
    const { emailId } = req.body;
    const email = await client.query('SELECT * FROM emails WHERE id = $1', [emailId]);

    if (email.rows.length === 0) {
      return res.status(404).send('Email not found.');
    }

    const prompts = [
      "Prompt 1",
      "Prompt 2",
      "Prompt 3",
      "Prompt 4",
      "Prompt 5",
      "Prompt 6",
      "Prompt 7",
      "Prompt 8"
    ];

    const responses = [];
    for (const prompt of prompts) {
      const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `${prompt}\n\nEmail Body: ${email.rows[0].body}`,
        max_tokens: 150,
      });
      responses.push(response.data.choices[0].text.trim());
    }

    res.status(200).json({ responses });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error processing email.');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
