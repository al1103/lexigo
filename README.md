# Learn English API

A Flask API for speech recognition and English pronunciation analysis.

---

## 📦 Installation

Install all required dependencies with:

```bash
pip install -r requirements.txt
```

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory and add the following environment variables:

```env
# Example
SECRET_KEY=your_secret_key
DEBUG=True
```

---

## 🚀 Running the Application

### ▶️ Local Development

```bash
python app.py
```

### 🌐 Public Access with Ngrok

Option 1: Run with Ngrok:

```bash
ngrok http 5000
```

Option 2: Start Flask first, then open another terminal:

```bash
python app.py
ngrok http 5000
```

---

## 📖 API Documentation

### 🎙️ Speech Recognition Endpoints

| Method | Endpoint      | Description                                |
| ------ | ------------- | ------------------------------------------ |
| POST   | `/transcribe` | Transcribe audio and analyze pronunciation |

#### ✅ Request Format

- `Content-Type`: `multipart/form-data`
- Required parameter: `file` (audio file – **WAV** format recommended)

#### ✅ Response Format

Returns transcribed text and pronunciation feedback in JSON format.

---

## ❗ Error Handling

| Status Code | Meaning                     |
| ----------- | --------------------------- |
| '200'       | Success                     |
| 400         | Bad Request (Invalid input) |
| 500         | Internal Server Error       |

---

## 📝 Notes

- For best results, use **clear audio recordings** in a **quiet environment**.
- Pronunciation analysis works best with **English words**.
- The API attempts to provide **IPA phonetic transcriptions** for recognized words.

---

Happy Learning! 🚀
