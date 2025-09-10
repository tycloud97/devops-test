import json
import os
from datetime import datetime

from flask import Flask, Response

# Create the Flask application instance
flask_app = Flask(__name__)


@flask_app.route("/healthcheck", methods=["GET"])
def health_check():
    """Return basic status information for uptime monitoring."""
    return Response(
        status=200,
        response=json.dumps(
            {
                "status": "ok",
                "app_env": os.getenv("APP_ENV"),
                # Use ISO format for easier parsing by log systems
                "timestamp": datetime.now().isoformat(),
                "version": "1.0.5",
            }
        ),
    )


if __name__ == "__main__":
    # Listen on all interfaces so Docker containers can reach the service
    flask_app.run(port=3000, debug=True, host="0.0.0.0")
