@echo off
echo Installing Memoire dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt
echo.
echo Done! Now run: uvicorn app.main:app --reload --port 8000
pause