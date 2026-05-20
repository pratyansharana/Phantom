"""Remove audio-related fields from chat messages in Firestore."""

import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate('serviceAccountKey.json')
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()
updated = 0
deleted_audio = 0

for chat_doc in db.collection('chats').stream():
    messages = db.collection('chats').document(chat_doc.id).collection('messages').stream()
    for message_doc in messages:
        data = message_doc.to_dict() or {}
        media_kind = data.get('mediaKind')
        mime = (data.get('mimeType') or '').lower()
        is_audio = media_kind == 'audio' or mime.startswith('audio/')

        if not is_audio:
            continue

        message_doc.reference.update({
            'hasMedia': False,
            'mediaKind': firestore.DELETE_FIELD,
            'mimeType': firestore.DELETE_FIELD,
        })
        updated += 1
        deleted_audio += 1

print(f'Cleaned {deleted_audio} audio message record(s).')
