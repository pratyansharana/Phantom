import random
import firebase_admin
from firebase_admin import credentials, firestore
from faker import Faker

# ==========================================
# 1. INITIALIZE FIREBASE ADMIN
# ==========================================
print("\033[94m[1/3] Loading Firebase Service Account Credentials...\033[0m")
try:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("\033[92m✔ Firebase Admin SDK successfully initialized.\033[0m")
except Exception as e:
    print(f"\033[91m✕ ERROR Initializing Firebase: {e}\nMake sure 'serviceAccountKey.json' is in this folder.\033[0m")
    exit(1)

# Initialize Faker with Indian Locale Data
fake = Faker('en_IN')
RECORD_COUNT = 15

BRANCH_CONFIG = {
    "Army": {
        "prefix": "AR",  # ← EXPLICIT PREFIX FOR CONSISTENCY
        "ranks": ["Lieutenant", "Captain", "Major", "Lieutenant Colonel"],
        "units": ["1st Battalion", "2nd Battalion", "4th Gurkha Rifles"],
        "postings": ["Fort William, Kolkata", "Northern Command, Udhampur", "Leh Base"]
    },
    "Navy": {
        "prefix": "NA",  # ← EXPLICIT PREFIX FOR CONSISTENCY
        "ranks": ["Sub-Lieutenant", "Lieutenant", "Commander", "Captain"],
        "units": ["INS Vikramaditya", "Western Naval Command", "INS Arihant"],
        "postings": ["Mumbai Dockyard", "Visakhapatnam Base", "Karwar Base"]
    },
    "Air Force": {
        "prefix": "AF",  # ← EXPLICIT PREFIX FOR CONSISTENCY
        "ranks": ["Flying Officer", "Flight Lieutenant", "Squadron Leader"],
        "units": ["No. 1 Squadron", "TACDE"],
        "postings": ["Ambala AFS", "Gwalior AFS", "Sulur AFS"]
    }
}

# ==========================================
# 2. SEEDING ENGINE
# ==========================================
print(f"\n\033[96m[2/3] Starting direct Firestore upload ({RECORD_COUNT} entries)...\033[0m")

personnel_uploaded = 0
dependents_uploaded = 0
generated_service_numbers = []  # Track for verification

for i in range(1, RECORD_COUNT + 1):
    # Generates Implementation-Ready Personnel Profiles
    p_id = fake.uuid4()
    gender_choice = random.choice(["Male", "Female"])
    f_name = fake.first_name_male() if gender_choice == "Male" else fake.first_name_female()
    l_name = fake.last_name()
    
    branch = random.choice(["Army", "Navy", "Air Force"])
    b_meta = BRANCH_CONFIG[branch]
    rank_choice = random.choice(b_meta["ranks"])
    
    # ← FIX: Use explicit prefix from config instead of branch[:2]
    service_num = f"{b_meta['prefix']}-2026-{random.randint(1000, 9999)}"
    generated_service_numbers.append(service_num)
    
    created_at = "2026-01-10T08:30:00Z"
    updated_at = "2026-05-15T14:22:18Z"
    
    personnel_data = {
        "personnel_id": p_id,
        "service_number": service_num,  # ← THIS MUST MATCH SIGNUP QUERY FORMAT
        "authentication": {
            "password_hash": "$2b$12$K3vR2...[hashed_password]...",
            "dilithium_public_key_b64": "[MOCK_DILITHIUM_87_PUBLIC_KEY_BASE64]",
            "kyber_public_key_b64": "[MOCK_KYBER_1024_PUBLIC_KEY_BASE64]",
            "pqc_version": "ML-DSA-87 / ML-KEM-1024",
            "clearance_level": "Level_3"
        },
        "military_profile": {
            "branch": branch,
            "rank": rank_choice,
            "regiment_corps": random.choice(b_meta["units"]),
            "commission_year": random.randint(2010, 2022),
            "commission_date": "2018-06-12",
            "current_posting_location": random.choice(b_meta["postings"]),
            "current_unit": random.choice(b_meta["units"]),
            "status": "Active"
        },
        "personal_information": {
            "first_name": f_name,
            "last_name": l_name,
            "date_of_birth": "1995-04-18",
            "national_id": f"NID-{random.randint(1000, 9999)}",
            "gender": gender_choice,
            "contact": {
                "email": f"{f_name.lower()}.{l_name.lower()}@defence.gov.in",
                "phone": f"+91-98765-{random.randint(10000, 99999)}"
            }
        },
        "metadata": { 
            "created_at": created_at, 
            "updated_at": updated_at, 
            "last_login_at": updated_at 
        }
    }
    
    # Save Personnel to Cloud
    db.collection("personnel").document(p_id).set(personnel_data)
    personnel_uploaded += 1
    print(f" -> [{i}/{RECORD_COUNT}] Seeded Personnel: {rank_choice} {f_name} {l_name} (Service#: {service_num})")
    
    # Generates Implementation-Ready Dependent Profiles
    d_id = fake.uuid4()
    dep_f_name = fake.first_name_female() if gender_choice == "Male" else fake.first_name_male()
    dep_gender = "Female" if gender_choice == "Male" else "Male"
    
    dependent_data = {
        "dependent_id": d_id,
        "sponsor_id": p_id,
        "dependent_card_number": f"DEP-{random.randint(1000, 9999)}-A",
        "authentication": {
            "password_hash": "$2b$12$X9zP1...[hashed_password]...",
            "dilithium_public_key_b64": "[MOCK_DILITHIUM_65_PUBLIC_KEY_BASE64]",
            "kyber_public_key_b64": "[MOCK_KYBER_768_PUBLIC_KEY_BASE64]",
            "pqc_version": "ML-DSA-65 / ML-KEM-768",
            "clearance_level": "Level_1"
        },
        "relationship_profile": {
            "relationship": "Spouse",
            "is_active_dependent": True,
            "eligibility_expiry_date": "2035-12-31"
        },
        "personal_information": {
            "first_name": dep_f_name,
            "last_name": l_name,
            "date_of_birth": "1997-11-23",
            "national_id": f"NID-{random.randint(1000, 9999)}",
            "gender": dep_gender,
            "contact": {
                "email": f"{dep_f_name.lower()}.{l_name.lower()}@defence-family.nic.in",
                "phone": f"+91-98765-{random.randint(10000, 99999)}"
            }
        },
        "metadata": { 
            "created_at": created_at, 
            "updated_at": created_at, 
            "last_login_at": updated_at 
        }
    }
    
    # Save Dependent to Cloud
    db.collection("dependents").document(d_id).set(dependent_data)
    dependents_uploaded += 1

# ==========================================
# 3. VERIFICATION METRICS
# ==========================================
print("\n\033[95m[3/3] Finalizing Transmission Audit...\033[0m")
print(f"\033[42m\033[30m✔ SUCCESS: {personnel_uploaded} Personnel records and {dependents_uploaded} bound Dependents instances successfully pushed to Firestore!\033[0m")

# ← NEW: Print sample service numbers for debugging
print("\n\033[93m📋 Sample Generated Service Numbers:\033[0m")
for sn in generated_service_numbers[:5]:
    print(f"   {sn}")
print(f"   ... and {len(generated_service_numbers) - 5} more")
