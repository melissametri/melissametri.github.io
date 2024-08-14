import asyncio
import re
from telethon import TelegramClient, events, errors

# client.py (Python)
import requests

data = {'key': 'value'}
response = requests.post('http://localhost:49771/process-data', json=data)

if response.status_code == 200:
    print('Response from Node.js bot:', response.json())


# Use your own API ID and Hash from https://my.telegram.org
api_id = '26375027'
api_hash = '7be5462ca44f8473e94bc1e9a56f4b3c'
phone_number = '+96181365015'

# Initialize the client
client = TelegramClient('session_name', api_id, api_hash)

# Replace with the channel usernames and group chat ID
channel_usernames = ['cointelegraph', 'CoingraphNews']  # Replace with the actual channel usernames
group_chat_id = -1002197584757  # Replace with your group chat ID (as an integer)
crypto_express_channel = -1001151808092  # Replace with the actual channel ID

# Function to remove links and associated link text (e.g., buttons) from the message text
def remove_links(text):
    # Regex pattern to find Markdown-style links [text](url) and remove them completely
    link_pattern = re.compile(r'\[.*?\]\(.*?\)')
    # Return the text with links removed
    return re.sub(link_pattern, '', text).strip()

# Start the client
async def main():
    await client.start(phone_number)

    # Forward analysis messages without links or buttons
    @client.on(events.NewMessage(chats=crypto_express_channel))
    async def forward_analysis_message(event):
        try:
            if event.message.text and "analysis" in event.message.text.lower():
                header = "📊 ANALYSIS\n\n"
                clean_text = remove_links(event.message.text)
                if event.message.photo:
                    caption = f"{header}{clean_text}"
                    await client.send_file(group_chat_id, event.message.photo, caption=caption, reply_to=event.message.id)
                else:
                    message_content = f"{header}{clean_text}"
                    await client.send_message(group_chat_id, message_content, reply_to=event.message.id)
                print("Analysis message forwarded successfully.")

        except errors.FloodWaitError as e:
            print(f"Flood wait error: Waiting for {e.seconds} seconds.")
            await asyncio.sleep(e.seconds)
        except errors.RPCError as e:
            print(f"RPC error: {e}")
        except Exception as e:
            print(f"Unexpected error: {e}")

    # Forward news messages without links or buttons
    @client.on(events.NewMessage(chats=channel_usernames))
    async def forward_message(event):
        try:
            if event.message.text and "news" in event.message.text.lower():
                header = "📰 NEWS\n\n"
                clean_text = remove_links(event.message.text)
                if event.message.photo:
                    caption = f"{header}{clean_text}"
                    await client.send_file(group_chat_id, event.message.photo, caption=caption, reply_to=event.message.id)
                else:
                    message_content = f"{header}{clean_text}"
                    await client.send_message(group_chat_id, message_content, reply_to=event.message.id)
                print("News message forwarded successfully.")

        except errors.FloodWaitError as e:
            print(f"Flood wait error: Waiting for {e.seconds} seconds.")
            await asyncio.sleep(e.seconds)
        except errors.RPCError as e:
            print(f"RPC error: {e}")
        except Exception as e:
            print(f"Unexpected error: {e}")

    
        except Exception as e:
            print(f"Error during testing analysis messages: {e}")

    

    print("Listening for messages...")
    await client.run_until_disconnected()

# Run the main function
asyncio.run(main())
