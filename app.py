import os
import shutil
import zipfile
import json
from flask import Flask, request, render_template, send_file, Response, stream_with_context, session, jsonify
from werkzeug.utils import secure_filename
from screening import main_generator, extract_criteria_from_docx, RoleCriteria, client, types

app = Flask(__name__)
app.secret_key = 'supersecretkey'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 200 * 1024 * 1024
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

_roles = []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/process', methods=['POST'])
def process():
    global _roles
    if 'criteria_file' not in request.files:
        return "No criteria file uploaded", 400
    criteria_file = request.files['criteria_file']
    if criteria_file.filename == '':
        return "No criteria file selected", 400
    if not criteria_file.filename.lower().endswith('.docx'):
        return "Criteria file must be a .docx document", 400

    criteria_filename = secure_filename(criteria_file.filename)
    criteria_path = os.path.join(app.config['UPLOAD_FOLDER'], criteria_filename)
    criteria_file.save(criteria_path)

    roles = extract_criteria_from_docx(criteria_path)
    os.remove(criteria_path)

    if not roles:
        return "Failed to extract any roles from the document. Please ensure it contains clear role descriptions.", 400

    session['roles'] = roles
    _roles = roles

    if 'zip_file' not in request.files:
        return "No CV zip file uploaded", 400
    zip_file = request.files['zip_file']
    if zip_file.filename == '':
        return "No CV zip file selected", 400
    if not zip_file.filename.lower().endswith('.zip'):
        return "CV file must be a ZIP archive", 400

    zip_filename = secure_filename(zip_file.filename)
    zip_path = os.path.join(app.config['UPLOAD_FOLDER'], zip_filename)
    zip_file.save(zip_path)

    session['zip_path'] = zip_path
    return render_template('select_roles.html', roles=roles)

@app.route('/start_screening', methods=['POST'])
def start_screening():
    selected_indices = request.form.getlist('role_indices')
    if not selected_indices:
        return "No roles selected", 400
    selected_indices = [int(i) for i in selected_indices]

    roles_dicts = session.get('roles')
    if not roles_dicts:
        return "No roles found. Please upload criteria again.", 400

    all_roles = [RoleCriteria(**r) for r in roles_dicts]
    selected_roles = [all_roles[i] for i in selected_indices]

    zip_path = session.get('zip_path')
    if not zip_path or not os.path.exists(zip_path):
        return "CV zip file not found. Please upload again.", 400

    if os.path.exists("cvs"):
        shutil.rmtree("cvs")
    os.makedirs("cvs")
    with zipfile.ZipFile(zip_path, 'r') as z:
        z.extractall("cvs")
    os.remove(zip_path)

    selected_roles_dicts = [role.dict() for role in selected_roles]
    session['selected_roles'] = selected_roles_dicts

    return render_template('results.html', roles=selected_roles_dicts)

@app.route('/stream')
def stream():
    roles_dicts = session.get('selected_roles')
    if not roles_dicts:
        return "No roles selected", 400
    roles = [RoleCriteria(**r) for r in roles_dicts]

    def generate():
        for event in main_generator(roles):
            data = json.dumps(event)
            yield f"data: {data}\n\n"

    return Response(stream_with_context(generate()),
                    mimetype="text/event-stream")

@app.route('/download/<role_name>/<category>')
def download_folder(role_name, category):
    """Download a ZIP of a specific category for a given role (or 'Other')."""
    # Map role_name to folder name
    if role_name == "Other":
        base = "other"
    else:
        safe = role_name.replace(" ", "_").replace("/", "_")
        base = f"role_{safe}"
    folder = os.path.join(base, category)
    if not os.path.exists(folder):
        return "Folder not found", 404

    zip_filename = f"{role_name}_{category}.zip"
    zip_path = os.path.join(app.config['UPLOAD_FOLDER'], zip_filename)
    with zipfile.ZipFile(zip_path, 'w') as z:
        for root, _, files in os.walk(folder):
            for f in files:
                z.write(os.path.join(root, f), arcname=f)
    return send_file(zip_path, as_attachment=True)

@app.route('/translate', methods=['POST'])
def translate():
    data = request.json
    text = data.get('text', '')
    target = data.get('target', 'en-US')

    if not text:
        return jsonify({'translated': ''})
    if target.lower().startswith('en'):
        return jsonify({'translated': text})

    prompt = f"Translate the following text to {target} language. Only output the translated text, nothing else.\n\n{text}"
    try:
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite',
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.0)
        )
        translated = response.text.strip()
        return jsonify({'translated': translated})
    except Exception as e:
        print(f"Translation error: {e}")
        return jsonify({'translated': text})

if __name__ == '__main__':
    app.run(debug=True)