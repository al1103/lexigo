from flask import Flask, request, jsonify
import whisper
import os
import uuid
import pronouncing
import eng_to_ipa
import difflib
import json  # Add this to load JSON file

app = Flask(__name__)
model = whisper.load_model("tiny")  # hoặc "tiny", "small" cho nhanh hơn

# Load reference data from JSON file
def load_reference_data():
    try:
        with open('words_with_letters.json', 'r') as file:
            return json.load(file)
    except Exception as e:
        print(f"Error loading reference data: {str(e)}")
        return []

# Load the reference data when the app starts
reference_data = load_reference_data()

@app.route("/transcribe", methods=["POST"])
def transcribe_audio():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    # Tạo tên file tạm duy nhất
    temp_filename = f"temp_audio_{uuid.uuid4().hex}.wav"
    file_path = os.path.join("./", temp_filename)
    file.save(file_path)

    try:
        result = model.transcribe(file_path)
        text = result.get("text", "")
        
        # Analyze basic pronunciation
        words = text.strip().split()
        pronunciation_data = []
        
        for word in words:
            # Remove punctuation for better matching
            clean_word = ''.join(c for c in word.lower() if c.isalpha())
            if clean_word:
                # Get IPA transcription
                ipa_transcription = eng_to_ipa.convert(clean_word)
                
                # Still use pronouncing for syllables and rhymes
                phonetic = pronouncing.phones_for_word(clean_word)
                syllable_count = pronouncing.syllable_count(phonetic[0]) if phonetic else 0
                
                pronunciation_data.append({
                    "word": word,
                    "phonetic": ipa_transcription,  # IPA format
                    "syllables": syllable_count,
                    "rhymes": pronouncing.rhymes(clean_word)[:5] if phonetic else []
                })
        
        # Calculate pronunciation score using reference data
        scoring_results = calculate_pronunciation_score(text, reference_data)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

    # Return both basic pronunciation data and scoring results
    return jsonify({
        "text": text,
        "pronunciation": pronunciation_data,
        "scoring": scoring_results
    })

def calculate_pronunciation_score(actual_text, reference_data):
    """
    Compare pronunciation of actual text against reference phonetic data from JSON.
    
    Args:
        actual_text (str): The transcribed text to score
        reference_data (list): List of word objects from the JSON file
        
    Returns:
        dict: Scoring results with total score, word-by-word breakdown, and statistics
    """
    words = actual_text.strip().lower().split()
    word_scores = []
    total_score = 0
    scorable_words = 0
    
    # Create a lookup dictionary for faster word matching
    reference_lookup = {}
    for entry in reference_data:
        if "answer" in entry and "word" in entry["answer"]:
            reference_lookup[entry["answer"]["word"].lower()] = entry["answer"]
    
    for word in words:
        # Clean word (remove punctuation)
        clean_word = ''.join(c for c in word.lower() if c.isalpha())
        
        if not clean_word:
            continue
            
        # Find reference phonetics
        reference_entry = reference_lookup.get(clean_word)
        reference_phonetic = None
        audio_url = None
        
        if reference_entry and "phonetics" in reference_entry and len(reference_entry["phonetics"]) > 0:
            reference_phonetic = reference_entry["phonetics"][0]["text"]
            audio_url = reference_entry["phonetics"][0].get("audio", "")
        
        # Get IPA transcription for the word
        ipa_transcription = eng_to_ipa.convert(clean_word)
        
        # Calculate score and comparison details
        score, comparison = compare_phonetics(ipa_transcription, reference_phonetic)
        
        if reference_phonetic:
            total_score += score
            scorable_words += 1
        
        word_scores.append({
            "word": clean_word,
            "actual_phonetic": ipa_transcription,
            "reference_phonetic": reference_phonetic,
            "audio_url": audio_url,
            "score": score,
            "comparison": comparison
        })
    
    # Calculate average score
    average_score = total_score / scorable_words if scorable_words > 0 else 0
    
    return {
        "total_words": len(words),
        "scorable_words": scorable_words,
        "average_score": round(average_score, 2),
        "word_scores": word_scores
    }

def compare_phonetics(actual, reference):
    if not reference or not actual:
        return 0, []
    
    # Clean up the phonetic strings by removing slashes and unnecessary characters
    actual_cleaned = actual.replace('/', '').replace('(', '').replace(')', '')
    reference_cleaned = reference.replace('/', '').replace('(', '').replace(')', '')
    
    # Use sequence matcher to get similarity ratio
    matcher = difflib.SequenceMatcher(None, actual_cleaned, reference_cleaned)
    similarity = matcher.ratio()
    
    # Get detailed comparison
    comparison = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            status = 'correct'
        else:
            status = 'incorrect'
            
        comparison.append({
            'type': tag,
            'actual': actual_cleaned[i1:i2],
            'reference': reference_cleaned[j1:j2],
            'status': status
        })
    
    # Convert to percentage score
    score = int(similarity * 100)
    return score, comparison

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)