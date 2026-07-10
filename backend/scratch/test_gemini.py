import os
import requests
import json

from app.core.config import settings

api_key = settings.GEMINI_API_KEY
print(f"Loaded key: {api_key}")

prompt = "Hello! Say hello back."
payload = {
    "contents": [{
        "parts": [{"text": prompt}]
    }]
}

models = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-2.5-flash",
    "gemini-2.0-flash-exp",
    "gemini-pro"
]

for model in models:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    try:
        res = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        print(f"Model {model} v1beta status: {res.status_code}")
        if res.status_code == 200:
            print("Success!")
            print(res.json()["candidates"][0]["content"]["parts"][0]["text"])
            break
        else:
            print(res.text[:200])
    except Exception as e:
        print(f"Failed for {model}: {e}")
