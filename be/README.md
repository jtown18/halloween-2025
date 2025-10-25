# Create and setup virtual environment

python3 -m venv venv
venv\Scripts\Activate.ps1
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

# Start server (after activating venv)

venv\Scripts\Activate.ps1
python main.py

# Just activate environment

venv\Scripts\Activate.ps1
