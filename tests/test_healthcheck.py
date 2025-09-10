import unittest
import json
from flask import Flask

# Add current directory to the path
import sys
sys.path.append('.')

from main import flask_app  # Flask application instance

class HealthcheckTestCase(unittest.TestCase):
    def setUp(self):
        """Create a test client for the Flask application."""
        self.client = flask_app.test_client()
        self.client.testing = True

    def test_healthcheck(self):
        # Call the healthcheck endpoint and verify its response
        health_response = self.client.get('/healthcheck')
        self.assertEqual(health_response.status_code, 200)

        response_data = json.loads(health_response.data)
        self.assertEqual(response_data['status'], 'ok')
        self.assertIn('app_env', response_data)
        self.assertIn('timestamp', response_data)

if __name__ == '__main__':
    unittest.main()