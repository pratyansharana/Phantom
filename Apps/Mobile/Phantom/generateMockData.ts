import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch } from 'firebase/firestore';
import { faker } from '@faker-js/faker';

// ==========================================
// 1. YOUR FIREBASE CONFIGURATION
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCufcFJ5bJqzIYaJxapvVRJ1tUrneEBqcw",
  authDomain: "template-ed3eb.firebaseapp.com",
  projectId: "template-ed3eb",
  storageBucket: "template-ed3eb.firebasestorage.app",
  messagingSenderId: "489538761629",
  appId: "1:489538761629:web:6485a0a6fb9f4f68e5b574"
};
// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// 2. CONFIGURATION STRINGS FOR SEEDING
// ==========================================
const RECORD_COUNT = 15; // Adjusted to stay safely within Web SDK batch volume limits

const BRANCH_CONFIG = {
  Army: {
    ranks: ['Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel'],
    units: ['1st Battalion', '2nd Battalion', '4th Gurkha Rifles', 'Para SF'],
    postings: ['Fort William, Kolkata', 'Northern Command, Udhampur', 'Leh Base']
  },
  Navy: {
    ranks: ['Sub-Lieutenant', 'Lieutenant', 'Commander', 'Captain'],
    units: ['INS Vikramaditya', 'Western Naval Command', 'INS Arihant'],
    postings: ['Mumbai Dockyard', 'Visakhapatnam Base', 'Karwar Base']
  },
  'Air Force': {
    ranks: ['Flying Officer', 'Flight Lieutenant', 'Squadron Leader', 'Wing Commander'],
    units: ['No. 1 Squadron', 'No. 7 Squadron', 'TACDE'],
    postings: ['Ambala AFS', 'Gwalior AFS', 'Sulur AFS']
  }
};

const generateMockPQCKey = (prefix: string) => {
  const entropy = faker.string.alphanumeric({ length: 40, casing: 'mixed' });
  return Buffer.from(`${prefix}_key_parameters_${entropy}`).toString('base64');
};

// ==========================================
// 3. GENERATION & UPLOAD ENGINE
// ==========================================
async function directPopulatePipeline() {
  console.log('\x1b[36m⚡ Starting direct Firestore seed via Web SDK...\x1b[0m');

  const personnelBatch = writeBatch(db);
  const dependentsBatch = writeBatch(db);

  let totalPersonnel = 0;
  let totalDependents = 0;

  for (let i = 0; i < RECORD_COUNT; i++) {
    const personnelId = faker.string.uuid();
    const gender = faker.helpers.arrayElement(['Male', 'Female']) as 'Male' | 'Female';
    const firstName = faker.person.firstName(gender.toLowerCase() as 'male' | 'female');
    const lastName = faker.person.lastName();
    
    const branch = faker.helpers.arrayElement(['Army', 'Navy', 'Air Force']) as 'Army' | 'Navy' | 'Air Force';
    const branchMeta = BRANCH_CONFIG[branch];
    
    const commissionYear = faker.number.int({ min: 2010, max: 2024 });
    const servicePrefix = branch === 'Army' ? 'AR' : branch === 'Navy' ? 'NV' : 'AF';
    const serviceNumber = `${servicePrefix}-2026-${faker.number.int({ min: 1000, max: 9999 })}`;

    const createdAt = "2026-01-10T08:30:00Z";
    const updatedAt = "2026-05-15T14:22:18Z";

    // Personnel Document Mapping
    const personnelRef = doc(collection(db, 'personnel'), personnelId);
    personnelBatch.set(personnelRef, {
      personnel_id: personnelId,
      service_number: serviceNumber,
      authentication: {
        password_hash: `$2b$12$K3vR2${faker.string.alphanumeric(25)}`,
        dilithium_public_key_b64: generateMockPQCKey('ML-DSA-87'),
        kyber_public_key_b64: generateMockPQCKey('ML-KEM-1024'),
        pqc_version: "ML-DSA-87 / ML-KEM-1024",
        clearance_level: "Level_3"
      },
      military_profile: {
        branch,
        rank: faker.helpers.arrayElement(branchMeta.ranks),
        regiment_corps: faker.helpers.arrayElement(branchMeta.units),
        commission_year: commissionYear,
        commission_date: `${commissionYear}-06-12`,
        current_posting_location: faker.helpers.arrayElement(branchMeta.postings),
        current_unit: faker.helpers.arrayElement(branchMeta.units),
        status: "Active"
      },
      personal_information: {
        first_name: firstName,
        last_name: lastName,
        date_of_birth: faker.date.birthdate({ min: 1985, max: 2000, mode: 'year' }).toISOString().split('T')[0],
        national_id: `NID-${faker.number.int({ min: 1000, max: 9999 })}-0023`,
        gender,
        contact: {
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@defence.gov.in`,
          phone: `+91-${faker.number.int({ min: 70000, max: 99999 })}-43210"}`
        }
      },
      metadata: { created_at: createdAt, updated_at: updatedAt, last_login_at: updatedAt }
    });
    totalPersonnel++;

    // Spousal Dependent Mapping
    const dependentId = faker.string.uuid();
    const depFirstName = faker.person.firstName(gender === 'Male' ? 'female' : 'male');
    const dependentRef = doc(collection(db, 'dependents'), dependentId);
    
    dependentsBatch.set(dependentRef, {
      dependent_id: dependentId,
      sponsor_id: personnelId,
      dependent_card_number: `DEP-${faker.number.int({ min: 1000, max: 9999 })}-A`,
      authentication: {
        password_hash: `$2b$12$X9zP1${faker.string.alphanumeric(25)}`,
        dilithium_public_key_b64: generateMockPQCKey('ML-DSA-65'),
        kyber_public_key_b64: generateMockPQCKey('ML-KEM-768'),
        pqc_version: "ML-DSA-65 / ML-KEM-768",
        clearance_level: "Level_1"
      },
      relationship_profile: {
        relationship: "Spouse",
        is_active_dependent: true,
        eligibility_expiry_date: "2035-12-31"
      },
      personal_information: {
        first_name: depFirstName,
        last_name: lastName,
        date_of_birth: faker.date.birthdate({ min: 1988, max: 2002, mode: 'year' }).toISOString().split('T')[0],
        national_id: `NID-${faker.number.int({ min: 1000, max: 9999 })}-1145`,
        gender: gender === 'Male' ? 'Female' : 'Male',
        contact: {
          email: `${depFirstName.toLowerCase()}.${lastName.toLowerCase()}@defence-family.nic.in`,
          phone: `+91-${faker.number.int({ min: 60000, max: 89999 })}-43211`
        }
      },
      metadata: { created_at: createdAt, updated_at: createdAt, last_login_at: updatedAt }
    });
    totalDependents++;
  }

  // Commit everything directly to your cloud project instances
  console.log('Writing records to Firestore...');
  await personnelBatch.commit();
  await dependentsBatch.commit();

  console.log(`\x1b[32m✔ SUCCESS: Seeded ${totalPersonnel} Personnel profiles and ${totalDependents} Dependents directly into Firestore collections.\x1b[0m`);
}

directPopulatePipeline().catch(console.error);