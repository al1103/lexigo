const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Mock test để demo API pronunciation comparison
async function testPronunciationAPI() {
  try {
    console.log('🧪 Testing Pronunciation Comparison API...');

    // Thông tin test
    const baseURL = 'http://localhost:3000'; // Thay đổi theo port app
    const testToken = 'your_jwt_token_here'; // Thay đổi theo token thực

    console.log('📋 Test Configuration:');
    console.log(`  Base URL: ${baseURL}`);
    console.log(`  Transcribe Service: http://192.168.31.225:5000/transcribe`);
    console.log(`  Test Word: "hello"`);

    // Test data
    const testData = {
      word_id: 1,
      reference_text: 'hello'
    };

    console.log('\n🎤 Simulating API call...');
    console.log('Note: This is a demonstration. In real usage:');
    console.log('1. User would record audio file');
    console.log('2. Audio file would be uploaded via multipart/form-data');
    console.log('3. API would forward to transcribe service');
    console.log('4. Results would be processed and returned');

    // Demo response structure
    const mockResponse = {
      status: '200',
      message: 'Pronunciation comparison completed',
      data: {
        word_id: testData.word_id,
        reference_text: testData.reference_text,
        transcribed_text: 'hello',
        scores: {
          overall: 85,
          pronunciation: 82,
          accuracy: 88,
          fluency: 80,
          confidence: 95,
          similarity: 85
        },
        feedback: {
          summary: 'Great pronunciation! Minor improvements can be made.',
          detailed: 'Your pronunciation is clear and accurate.',
          word_analysis: [
            {
              word: 'hello',
              score: 85,
              status: 'correct'
            }
          ]
        },
        match_quality: 'good'
      }
    };

    console.log('\n📊 Expected API Response:');
    console.log(JSON.stringify(mockResponse, null, 2));

    // Test với transcribe service trực tiếp (nếu available)
    console.log('\n🔗 Testing direct connection to transcribe service...');

    try {
      const testResponse = await axios.get('http://192.168.31.225:5000/health', {
        timeout: 5000
      });
      console.log('✅ Transcribe service is reachable');
      console.log('Health check response:', testResponse.data);
    } catch (transcribeError) {
      if (transcribeError.code === 'ECONNREFUSED') {
        console.log('❌ Transcribe service is not running or unreachable');
        console.log('   Make sure the service is running on http://192.168.31.225:5000/');
      } else if (transcribeError.code === 'ETIMEDOUT') {
        console.log('⏰ Transcribe service connection timeout');
      } else {
        console.log('⚠️ Transcribe service connection issue:', transcribeError.message);
      }
    }

    // Frontend usage example
    console.log('\n💻 Frontend Integration Example:');
    console.log(`
// HTML
<input type="file" id="audioFile" accept="audio/*">
<button onclick="comparePronunciation()">Compare Pronunciation</button>

// JavaScript
async function comparePronunciation() {
  const audioFile = document.getElementById('audioFile').files[0];
  if (!audioFile) {
    alert('Please select an audio file');
    return;
  }

  const formData = new FormData();
  formData.append('audio', audioFile);
  formData.append('word_id', 123);
  formData.append('reference_text', 'hello');

  try {
    const response = await fetch('/api/speaking/compare-pronunciation', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      },
      body: formData
    });

    const result = await response.json();

    if (result.status === '200') {
      console.log('Pronunciation Score:', result.data.scores.overall);
      console.log('Feedback:', result.data.feedback.summary);
      console.log('Transcribed:', result.data.transcribed_text);
    } else {
      console.error('Error:', result.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}
    `);

    // cURL example
    console.log('\n🌐 cURL Test Example:');
    console.log(`
curl -X POST http://localhost:3000/api/speaking/compare-pronunciation \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -F "audio=@path/to/audio/file.wav" \\
  -F "word_id=123" \\
  -F "reference_text=hello"
    `);

    console.log('\n🎉 Pronunciation API test demonstration completed!');
    console.log('\n📝 Next Steps:');
    console.log('1. Start your Express server');
    console.log('2. Ensure transcribe service is running on http://192.168.31.225:5000/');
    console.log('3. Get JWT token from login API');
    console.log('4. Test with real audio file using frontend or Postman');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Helper function để tạo mock audio file (demo only)
function createMockAudioFile() {
  const mockAudioPath = path.join(__dirname, '../uploads/test-audio.wav');

  // Tạo file WAV header đơn giản (demo - không phải audio thực)
  const wavHeader = Buffer.alloc(44);
  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36, 4);
  wavHeader.write('WAVE', 8);
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(1, 20);
  wavHeader.writeUInt16LE(1, 22);
  wavHeader.writeUInt32LE(44100, 24);
  wavHeader.writeUInt32LE(88200, 28);
  wavHeader.writeUInt16LE(2, 32);
  wavHeader.writeUInt16LE(16, 34);
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(0, 40);

  fs.writeFileSync(mockAudioPath, wavHeader);
  console.log(`📁 Created mock audio file: ${mockAudioPath}`);
  return mockAudioPath;
}

// Chạy test nếu được gọi trực tiếp
if (require.main === module) {
  testPronunciationAPI()
    .then(() => {
      console.log('✅ Test completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testPronunciationAPI, createMockAudioFile };
