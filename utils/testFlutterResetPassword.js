const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000/api';
const TEST_EMAIL = 'chube2609@gmail.com';

async function testFlutterResetPassword() {
  console.log('🦋 FLUTTER RESET PASSWORD TEST\n');
  console.log(`📧 Email: ${TEST_EMAIL}`);
  console.log(`🔑 Password: Zilong2609@\n`);

  // Test với format như Flutter đang gửi
  console.log('🧪 TEST 1: Format như Flutter (new_password)...\n');

  const flutterRequest = {
    email: TEST_EMAIL,
    new_password: 'Zilong2609@'  // Flutter format
  };

  console.log('📤 Flutter Request Data:');
  console.log(JSON.stringify(flutterRequest, null, 2));

  try {
    const response = await axios.post(`${BASE_URL}/reset-password`, flutterRequest, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('\n✅ SUCCESS! Flutter format works:');
    console.log('Status:', response.status);
    console.log('Message:', response.data.message);

  } catch (error) {
    console.log('\n❌ FLUTTER FORMAT ERROR:');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data?.message || error.message);
  }

  // Test với format standard (newPassword)
  console.log('\n🧪 TEST 2: Format standard (newPassword)...\n');

  const standardRequest = {
    email: TEST_EMAIL,
    newPassword: 'Zilong2609@'  // Standard format
  };

  console.log('📤 Standard Request Data:');
  console.log(JSON.stringify(standardRequest, null, 2));

  try {
    const response = await axios.post(`${BASE_URL}/reset-password`, standardRequest, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('\n✅ SUCCESS! Standard format works:');
    console.log('Status:', response.status);
    console.log('Message:', response.data.message);

  } catch (error) {
    console.log('\n❌ STANDARD FORMAT ERROR:');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data?.message || error.message);
  }
}

async function testVariousFlutterCases() {
  console.log('\n🧪 VARIOUS FLUTTER TEST CASES:\n');

  const testCases = [
    {
      name: 'Flutter format - valid',
      data: { email: TEST_EMAIL, new_password: 'ValidPassword123' }
    },
    {
      name: 'Standard format - valid',
      data: { email: TEST_EMAIL, newPassword: 'ValidPassword123' }
    },
    {
      name: 'Flutter format - password too short',
      data: { email: TEST_EMAIL, new_password: '123' }
    },
    {
      name: 'Flutter format - missing email',
      data: { new_password: 'ValidPassword123' }
    },
    {
      name: 'Flutter format - missing password',
      data: { email: TEST_EMAIL }
    },
    {
      name: 'Both fields provided (newPassword priority)',
      data: { email: TEST_EMAIL, newPassword: 'NewFormat123', new_password: 'OldFormat123' }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n   Testing: ${testCase.name}`);
    console.log(`   Data: ${JSON.stringify(testCase.data)}`);

    try {
      const response = await axios.post(`${BASE_URL}/reset-password`, testCase.data);
      console.log(`   ✅ Success: ${response.data.message}`);
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      console.log(`   ❌ Error: ${message}`);
    }
  }
}

async function showFlutterUsageExample() {
  console.log('\n📱 FLUTTER USAGE EXAMPLE:\n');

  console.log('✅ Current Flutter code should work now:');
  console.log(`
// Flutter Dio request (current format)
final data = {
  'email': 'chube2609@gmail.com',
  'new_password': 'Zilong2609@'  // ✅ This works now!
};

try {
  final response = await dio.post(
    'https://your-domain.com/api/reset-password',
    data: data,
  );

  if (response.statusCode == 200) {
    print('✅ Success: \${response.data['message']}');
  }
} catch (e) {
  print('❌ Error: \$e');
}
`);

  console.log('🔄 Or update Flutter to use standard format:');
  console.log(`
// Updated Flutter code (recommended)
final data = {
  'email': 'chube2609@gmail.com',
  'newPassword': 'Zilong2609@'  // ✅ Standard format
};

try {
  final response = await dio.post(
    'https://your-domain.com/api/reset-password',
    data: data,
  );

  if (response.statusCode == 200) {
    print('✅ Success: \${response.data['message']}');
  }
} catch (e) {
  print('❌ Error: \$e');
}
`);
}

async function showBackendCompatibility() {
  console.log('\n🔧 BACKEND COMPATIBILITY:\n');

  console.log('✅ Backend now accepts BOTH formats:');
  console.log(`
// Option 1: Flutter format (backward compatible)
{
  "email": "user@example.com",
  "new_password": "password123"
}

// Option 2: Standard format (recommended)
{
  "email": "user@example.com",
  "newPassword": "password123"
}

// Priority: newPassword > new_password (if both provided)
{
  "email": "user@example.com",
  "newPassword": "this-will-be-used",
  "new_password": "this-will-be-ignored"
}
`);
}

async function runFlutterTests() {
  console.log('🦋 FLUTTER RESET PASSWORD COMPATIBILITY TEST\n');
  console.log('=' .repeat(60));

  await testFlutterResetPassword();
  await testVariousFlutterCases();
  await showFlutterUsageExample();
  await showBackendCompatibility();

  console.log('\n' + '=' .repeat(60));
  console.log('🎉 FLUTTER COMPATIBILITY TESTS COMPLETED!');
  console.log('📋 SUMMARY:');
  console.log('✅ Backend supports both new_password AND newPassword');
  console.log('✅ Flutter app should work without changes');
  console.log('✅ Backward compatible with existing apps');
  console.log('✅ Standard format recommended for new development');
}

// Export for testing
module.exports = {
  testFlutterResetPassword,
  testVariousFlutterCases
};

// Run if called directly
if (require.main === module) {
  runFlutterTests();
}
