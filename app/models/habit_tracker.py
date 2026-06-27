import uuid
from datetime import datetime


class Habit:
    def __init__(self, name):
        self.id = str(uuid.uuid4())
        self.name = name
        self.created_at = datetime.now().isoformat()

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, data):
        habit = cls(name=data["name"])
        habit.id = data["id"]
        habit.created_at = data["created_at"]
        return habit


class DailyLog:
    def __init__(self, date=None):
        self.date = date or datetime.now().strftime("%Y-%m-%d")
        self.completed_habits = []
        self.summary = ""

    def to_dict(self):
        return {
            "date": self.date,
            "completed_habits": self.completed_habits,
            "summary": self.summary,
        }

    @classmethod
    def from_dict(cls, data):
        log = cls(date=data["date"])
        log.completed_habits = data.get("completed_habits", [])
        log.summary = data.get("summary", "")
        return log


class HabitTracker:
    def __init__(self, filepath="app/data/habits.json"):
        self.filepath = filepath
        self.habits = {}
        self.logs = {}

    def add_habit(self, name):
        habit = Habit(name)
        self.habits[habit.id] = habit
        return habit

    def delete_habit(self, habit_id):
        if habit_id in self.habits:
            del self.habits[habit_id]
            return True
        return False

    def log_today(self, completed_habit_ids, summary=""):
        today = datetime.now().strftime("%Y-%m-%d")
        log = DailyLog(date=today)
        log.completed_habits = completed_habit_ids
        log.summary = summary
        self.logs[today] = log
        return log

    def get_streak(self, habit_id):
        streak = 0
        today = datetime.now().date()
        for i in range(365):
            from datetime import timedelta
            check_date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
            log = self.logs.get(check_date)
            if log and habit_id in log.completed_habits:
                streak += 1
            else:
                break
        return streak

    def get_today_log(self):
        today = datetime.now().strftime("%Y-%m-%d")
        return self.logs.get(today)

    def to_dict(self):
        return {
            "habits": {hid: h.to_dict() for hid, h in self.habits.items()},
            "logs": {date: log.to_dict() for date, log in self.logs.items()},
        }

    def from_dict(self, data):
        self.habits = {
            hid: Habit.from_dict(hdata)
            for hid, hdata in data.get("habits", {}).items()
        }
        self.logs = {
            date: DailyLog.from_dict(ldata)
            for date, ldata in data.get("logs", {}).items()
        }

    def save(self):
        import json, os
        os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
        with open(self.filepath, "w") as f:
            json.dump(self.to_dict(), f, indent=2)

    def load(self):
        import json, os
        if not os.path.exists(self.filepath):
            return
        with open(self.filepath, "r") as f:
            data = json.load(f)
        self.from_dict(data)
        