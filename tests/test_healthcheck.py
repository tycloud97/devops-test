import unittest
import json
from flask import Flask

# Add current directory to the path
import sys
sys.path.append('.')

from main import app  # Assuming the Flask app is defined in main.py

class HealthcheckTestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_healthcheck(self):
        response = self.app.get('/healthcheck')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'ok')
        self.assertIn('app_env', data)
        self.assertIn('timestamp', data)

if __name__ == '__main__':
    unittest.main()