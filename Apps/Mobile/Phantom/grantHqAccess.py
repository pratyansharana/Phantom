import sys

import firebase_admin
from firebase_admin import credentials, firestore

EMAIL = (sys.argv[1] if len(sys.argv) > 1 else 'pratyanshrana1@gmail.com').strip().lower()
NAME = sys.argv[2] if len(sys.argv) > 2 else 'Pratyansha Rana'

cred = credentials.Certificate('serviceAccountKey.json')
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()
config_ref = db.collection('hq_operators').document('hq_operator')
snapshot = config_ref.get()
existing = snapshot.to_dict() if snapshot.exists else {}
allowed = [value.strip().lower() for value in existing.get('allowedEmails', []) if isinstance(value, str)]

if EMAIL not in allowed:
    allowed.append(EMAIL)

config_ref.set({
    'active': True,
    'role': 'hq_monitor',
    'name': NAME,
    'allowedEmails': allowed,
}, merge=True)

print(f'HQ access updated on hq_operators/hq_operator for {EMAIL}')
