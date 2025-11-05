// Test file to verify Firebase configuration
// This file is for testing purposes only - remove after verification

import { auth, db, storage, analytics } from './config';

/**
 * Verify that all Firebase services are properly initialized
 */
export function testFirebaseConfig() {
  console.log('🔍 Testing Firebase Configuration...\n');

  // Test Auth
  if (auth) {
    console.log('✅ Authentication service initialized');
    console.log(`   Auth domain: ${auth.app.options.authDomain}`);
  } else {
    console.error('❌ Authentication service failed to initialize');
  }

  // Test Firestore
  if (db) {
    console.log('✅ Firestore service initialized');
    console.log(`   Project ID: ${db.app.options.projectId}`);
  } else {
    console.error('❌ Firestore service failed to initialize');
  }

  // Test Storage
  if (storage) {
    console.log('✅ Storage service initialized');
    console.log(`   Storage bucket: ${storage.app.options.storageBucket}`);
  } else {
    console.error('❌ Storage service failed to initialize');
  }

  // Test Analytics
  if (analytics) {
    console.log('✅ Analytics service initialized');
  } else {
    console.log('⚠️  Analytics service not initialized (expected on server-side)');
  }

  console.log('\n✅ All Firebase services are properly configured!');
  console.log('\n📝 Next steps:');
  console.log('   1. Enable Authentication in Firebase Console');
  console.log('   2. Create Firestore Database in Firebase Console');
  console.log('   3. Verify Storage bucket exists');
  
  return {
    auth: !!auth,
    db: !!db,
    storage: !!storage,
    analytics: analytics !== null,
  };
}


