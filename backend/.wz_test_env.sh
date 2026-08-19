DEV_URL=$(grep '^DATABASE_URL=' .env | cut -d= -f2-)
export TEST_DATABASE_URL=$(echo "$DEV_URL" | sed 's#/worldzero$#/wz2280_test#')
export PY="C:/Users/pixie/OneDrive/Documents/codeprojects/worldzero-playground/backend/.venv/Scripts/python.exe"
