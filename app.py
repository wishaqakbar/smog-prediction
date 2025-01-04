import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
import pickle
from flask import Flask, jsonify, request
import requests
from flask_cors import CORS

# Load and preprocess dataset
def load_and_preprocess(file_path):
    data = pd.read_csv(file_path)[['parameter', 'value', 'datetimeLocal', 'unit']]
    data = data[data['parameter'] == 'pm25']
    
    # Convert datetime and aggregate data by date
    data['datetimeLocal'] = pd.to_datetime(data['datetimeLocal'])
    daily_pm25 = data.groupby(data['datetimeLocal'].dt.date)['value'].mean().reset_index()
    daily_pm25.rename(columns={'value': 'avg_pm25'}, inplace=True)
    
    # Create lag feature
    daily_pm25['prev_day_pm25'] = daily_pm25['avg_pm25'].shift(1).dropna()
    return daily_pm25.dropna()

# Train model
def train_model(data):
    X = data[['prev_day_pm25']]
    y = data['avg_pm25']
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, shuffle=False)

    model = LinearRegression()
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print(f"Mean Squared Error: {mse}")
    print(f"R² Score: {r2}")
    print(f"Model Coefficient: {model.coef_[0]}")
    print(f"Model Intercept: {model.intercept_}")

    return model

# Save and load model
def save_model(model, filename='smog_prediction_model.pkl'):
    with open(filename, 'wb') as f:
        pickle.dump(model, f)

def load_model(filename='smog_prediction_model.pkl'):
    with open(filename, 'rb') as f:
        return pickle.load(f)

# IQAir API details
IQAIR_API_KEY = "afc95baa-be4d-43d7-a5f5-fe22ac1b1531"

# Fetch live PM2.5 data for a specific city
def fetch_live_pm25(city, state="Punjab", country="Pakistan"):
    api_url = f"http://api.airvisual.com/v2/city?city={city}&state={state}&country={country}&key={IQAIR_API_KEY}"
    response = requests.get(api_url)
    response.raise_for_status()
    
    data = response.json()
    aqi = data.get('data', {}).get('current', {}).get('pollution', {}).get('aqius')
    if aqi is None:
        raise ValueError(f"AQI data not found for city: {city}")
    return aqi

# Classify PM2.5 levels
def classify_pm25(value):
    if value <= 50: return "Good"
    elif 51 <= value <= 100: return "Moderate"
    elif 101 <= value <= 150: return "Unhealthy for Sensitive Groups"
    elif 151 <= value <= 200: return "Unhealthy"
    elif 201 <= value <= 300: return "Very Unhealthy"
    return "Hazardous"

# Flask app
app = Flask(__name__)
CORS(app)

# Load the trained model
model = load_model()

@app.route('/predict', methods=['GET'])
def predict():
    try:
        # Get city parameter from request
        city = request.args.get('city')
        if not city:
            return jsonify({"error": "City parameter is required"}), 400
        
        # Fetch live PM2.5 data
        current_pm25 = fetch_live_pm25(city)
        
        # Predict next day's PM2.5 using the model
        predicted_pm25 = model.predict([[current_pm25]])[0]
        
        # Classify the prediction
        classification = classify_pm25(predicted_pm25)
        
        return jsonify({
            "City": city,
            "Current AQI": current_pm25,
            "Predicted AQI": predicted_pm25,
            "Category": classification
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=False)
