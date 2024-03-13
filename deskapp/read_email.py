from simplegmail import Gmail
from simplegmail.query import construct_query
import csv

# Create a Gmail object
gmail = Gmail()

query_params = {
    "newer_than": (3, "day"),    
}

messages = gmail.get_messages(query=construct_query(query_params))

# Open the CSV file in write mode
with open('email_results.csv', 'w', newline='', encoding='utf-8') as csvfile:
    writer = csv.writer(csvfile)

    # Write the headers
    writer.writerow(['To', 'From', 'Subject', 'Date', 'Preview', 'Message Body'])

    # Iterate over the messages
    for message in messages:
        # Write the data for each message
        writer.writerow([message.recipient, message.sender, message.subject, message.date, message.snippet, message.plain])