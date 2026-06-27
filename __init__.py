from flask import Flask
from .models.storage_manager import StorageManager
from .models.habit_tracker import HabitTracker

storage = StorageManager()
habit_tracker = HabitTracker()

def create_app():
    app = Flask(__name__)
    habit_tracker.load()
    from .routes import main
    app.register_blueprint(main)
    return app
