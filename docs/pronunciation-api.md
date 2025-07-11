# Pronunciation Comparison API

## Endpoint

`POST /api/speaking/compare-pronunciation`

## Description

So sánh phát âm của user với text gốc sử dụng AI transcribe service.

## Authentication

Requires Bearer token in Authorization header.

## Request

### Headers

```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

### Body (Form Data)

- `audio` (file, required): Audio file (WAV, MP3, M4A, etc.)
- `word_id` (number, required): ID của từ vựng
- `reference_text` (string, required): Text gốc để so sánh

### Example Request

```javascript
const formData = new FormData();
formData.append("audio", audioFile);
formData.append("word_id", 123);
formData.append("reference_text", "hello");

fetch("/api/speaking/compare-pronunciation", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + token,
  },
  body: formData,
});
```

## Response

### Success Response (200)

```json
{
  "status": "200",
  "message": "Pronunciation comparison completed",
  "data": {
    "word_id": 123,
    "reference_text": "hello",
    "transcribed_text": "hello",
    "scores": {
      "overall": 85,
      "pronunciation": 82,
      "accuracy": 88,
      "fluency": 80,
      "confidence": 95,
      "similarity": 85
    },
    "feedback": {
      "summary": "Great pronunciation! Minor improvements can be made.",
      "detailed": "Your pronunciation is clear and accurate.",
      "word_analysis": [
        {
          "word": "hello",
          "score": 85,
          "status": "correct"
        }
      ]
    },
    "match_quality": "good"
  }
}
```

### Error Responses

#### 400 - Bad Request

```json
{
  "status": 400,
  "message": "Audio file is required"
}
```

#### 401 - Unauthorized

```json
{
  "status": 401,
  "message": "User authentication required"
}
```

#### 503 - Service Unavailable

```json
{
  "status": 503,
  "message": "Transcribe service is unavailable. Please try again later."
}
```

#### 408 - Request Timeout

```json
{
  "status": 408,
  "message": "Request timeout. Please try with a shorter audio file."
}
```

## Score Ranges

- **90-100**: Excellent pronunciation
- **80-89**: Great pronunciation
- **70-79**: Good pronunciation
- **60-69**: Fair pronunciation
- **0-59**: Needs improvement

## Match Quality

- `good`: Score ≥ 70
- `fair`: Score 50-69
- `needs_improvement`: Score < 50

## Audio File Requirements

- **Max file size**: 25MB
- **Supported formats**: WAV, MP3, M4A, OGG, etc.
- **Recommended**: WAV format for best quality
- **Duration**: Keep under 30 seconds for optimal response time

## Integration with Speaking System

Function này được tích hợp với speaking statistics system:

1. **Automatic Stats Update**: Kết quả sẽ được tự động lưu vào speaking session
2. **XP Calculation**: XP được tính dựa trên overall_score
3. **Word Mastery**: Words với score ≥ 70 được tính là mastered
4. **Streak Update**: Speaking activity tự động update daily streak

## Example Usage Flow

1. User starts speaking session: `POST /api/speaking/start-session`
2. User records audio for a word
3. Call pronunciation comparison: `POST /api/speaking/compare-pronunciation`
4. Submit speaking result: `POST /api/speaking/submit-result`
5. Complete session: `POST /api/speaking/complete-session`

## Error Handling

The API includes comprehensive error handling:

- **Network errors**: Retry mechanism suggested
- **File cleanup**: Temporary files are automatically cleaned up
- **Timeout handling**: 30-second timeout for transcribe service
- **Service availability**: Graceful degradation when transcribe service is down

## Backend Service

Calls external transcribe service at: `http://192.168.31.225:5000/transcribe`

The service should accept:

- `audio` (file): Audio file to transcribe
- `reference_text` (string): Reference text for comparison

And return:

- `transcribed_text`: What was heard
- `overall_score`: Pronunciation score (0-100)
- `feedback`: Detailed feedback message
- `word_analysis`: Per-word analysis (optional)
