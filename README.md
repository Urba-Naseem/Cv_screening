# 📄 AI-Powered CV Screening System

A web application that screens candidate CVs (PDFs) using **Google Gemini LLM** with **real‑time streaming results**, **certainty scoring**, and **three‑category routing** (Accepted / Doubtful / Rejected). Built with Flask, it provides a clean interface for recruiters to upload a ZIP of CVs, set criteria, and download filtered results.

---

## ✨ Features

- 🤖 **LLM‑powered evaluation** – Gemini analyzes each CV holistically (degree, qualification, experience).
- 📊 **Certainty scoring** – Each CV receives a 0‑100 score:
  - **≥ 80** → Accepted
  - **50 – 79** → Doubtful (needs human review)
  - **< 50** → Rejected
- 🔄 **Real‑time streaming** – Results appear in the UI as soon as each CV is processed (not after all are done).
- 📈 **Live progress** – Progress bar and summary cards update incrementally.
- 📦 **ZIP handling** – Upload a ZIP of PDFs, download filtered results as separate ZIPs (Accepted, Doubtful, Rejected).
- 🎨 **Clean, responsive UI** – Built with Bootstrap 5 and custom CSS.

---

## 🧰 Tech Stack

| Component       | Technology                           |
|-----------------|--------------------------------------|
| Backend         | Python 3.8+ / Flask                  |
| PDF parsing     | pdfplumber                           |
| LLM             | Google Gemini (`gemini-3.1-flash-lite`) |
| Validation      | Pydantic                             |
| Frontend        | Bootstrap 5, Font Awesome, custom CSS|
| Streaming       | Server‑Sent Events (SSE)             |

---

## 📁 Project Structure

```
cv_screening/
├── app.py                 # Flask web application
├── screening.py           # Core logic (LLM, generator, routing)
├── requirements.txt
├── static/
│   └── style.css          # Custom CSS
├── templates/
│   ├── index.html         # Upload form
│   └── results.html       # Live streaming results page
├── uploads/               # Temporary uploads (auto‑created)
├── accepted/              # Accepted CVs (created after run)
├── doubtful/              # Doubtful CVs (created after run)
└── rejected/              # Rejected CVs (created after run)
```

---

## 🚀 Installation

### 1. Clone or download the project

```bash
git clone https://github.com/yourusername/cv-screening.git
cd cv-screening
```

### 2. Create a virtual environment (recommended)

```bash
python -m venv venv
source venv/bin/activate      # On Windows: venv\Scripts\activate
```

### 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

**requirements.txt** content:
```
Flask
pdfplumber
pydantic
google-genai
```

### 4. Set your Gemini API key

Edit `screening.py` and replace:

```python
API_KEY = "YOUR_GEMINI_API_KEY"
```

Alternatively, use environment variables (recommended for production):
```bash
export GEMINI_API_KEY="your-key-here"
```

---

## ⚙️ Configuration

### Model name

The default model is `gemini-3.1-flash-lite`. If that is not available, change it to `gemini-2.0-flash-lite` in `screening.py`:

```python
model='gemini-3.1-flash-lite',   # or 'gemini-2.0-flash-lite'
```

### Rate‑limit tuning

The system is tuned for Gemini’s free tier. You can adjust these in `screening.py`:

- `time.sleep(6)` – delay between requests.
- `idx % 5 == 0` – batch size before a long pause.
- `time.sleep(30)` – long pause duration.

---

## 📖 Usage

### Web interface (recommended)

```bash
python app.py
```

Then open `http://127.0.0.1:5000` in your browser.

1. **Fill in the criteria** – degree level, qualification, and minimum experience.
2. **Upload a ZIP file** containing CVs (PDF format, subfolders allowed).
3. Click **“Start Screening”**.
4. Watch results appear **in real time** – the table updates as each CV is processed.
5. Once complete, download the accepted, doubtful, and rejected CVs as separate ZIP files.

---

## 🧠 How It Works

1. **PDF extraction** – `pdfplumber` extracts text from each PDF.
2. **LLM evaluation** – For each CV (processed sequentially), Gemini:
   - Extracts the candidate's degree, qualification, and experience.
   - Computes a **certainty score (0‑100)** based on how well the CV matches the criteria.
   - Provides a reason for the score.
3. **Decision mapping** – Based on the certainty score:
   - **≥ 80** → Accepted
   - **50 – 79** → Doubtful
   - **< 50** → Rejected
4. **Real‑time streaming** – Results are sent to the frontend via Server‑Sent Events (SSE) as soon as each CV finishes.
5. **ZIP generation** – After all CVs are processed, you can download three separate ZIPs: Accepted, Doubtful, and Rejected.

---

## 🔒 Rate‑Limit Safety

The system is designed to stay within Gemini’s free‑tier quotas (≈10‑15 requests per minute):

- **6‑second baseline delay** between LLM calls.
- **30‑second pause** after every 5 files.
- **Exponential backoff** (15s → 30s → 60s…) on 429 errors.

If you have a higher tier, you can reduce these delays.

---

## 📝 License

This project is open‑source and available under the [MIT License](LICENSE).

---

## 🙏 Acknowledgements

- Google Gemini for the LLM API
- pdfplumber for PDF text extraction
- Flask, Bootstrap, and Font Awesome for the web interface

**Happy screening!** 🚀