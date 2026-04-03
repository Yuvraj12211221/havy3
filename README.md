**terminal 1 commands (for rendering frontend)**

cd havyfourthdraft
npm install
npm fix
npm run dev

**terminal 2 commands (for installing rasa ka backend)**


python -m venv venv
venv\Scripts\activate
pip install rasa

rasa --version
rasa run --enable-api --cors "*"

*(might give an error if tensorflow module is absent on machine, resolve with chatgpt)
(npm install tensorflow==2.10.0)*

rasa run --enable-api --cors "*"

**Once setup is completed run**
cd havyfourthdraft
npm run dev
