from simplegmail import Gmail
from simplegmail.query import construct_query

# Create a Gmail object
gmail = Gmail()

query_params = {
    "newer_than": (3, "month"),    
}

messages = gmail.get_messages(query=construct_query(query_params))

for message in messages:
    print("To: " + message.recipient)
    print("From: " + message.sender)
    print("Subject: " + message.subject)
    print("Date: " + message.date)
    print("Preview: " + message.snippet)
    
    # print("Message Body: " + message.html)