from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import streamlit as st

# Set up the Google Sign-In flow
flow = Flow.from_client_secrets_file(
    'client_secret.json',
    scopes=['https://www.googleapis.com/auth/gmail.readonly'],
    redirect_uri='http://localhost:8501/'
)

# Define the Streamlit app
def app():
    # Authenticate the user with Google Sign-In
    if 'credentials' not in st.session_state:
        st.session_state.credentials = None

    if st.session_state.credentials is None:
        auth_url, _ = flow.authorization_url(prompt='consent')
        st.write(f'<a href="{auth_url}"><button>Sign in with Google</button></a>', unsafe_allow_html=True)
        code = st.text_input('Enter the authorization code:')
        if code:
            flow.fetch_token(code=code)
            credentials = flow.credentials
            st.session_state.credentials = credentials
            st.write('Successfully authenticated with Google.')
    else:
        credentials = st.session_state.credentials

    # Use the user's credentials to access their Gmail account
    if credentials is not None:
        service = build('gmail', 'v1', credentials=credentials)
        results = service.users().messages().list(userId='me', maxResults=10).execute()
        messages = results.get('messages', [])

        # Display the emails on the Streamlit website
        for message in messages:
            msg = service.users().messages().get(userId='me', id=message['id']).execute()
            st.write(msg['snippet'])
            
        # Add a button to the Streamlit website
        if st.button('Click me!'):
            st.write('You clicked the button!')

if __name__ == '__main__':
    app()