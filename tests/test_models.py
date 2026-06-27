from app.models.knowledge_graph import KnowledgeGraph
from app.models.storage_manager import StorageManager
from app.models.habit_tracker import HabitTracker


def test_basic():
    # Create graph
    graph = KnowledgeGraph()

    # Add nodes
    n1 = graph.add_node("Ancient Rome", "History", content="The Roman Empire...", tags=["rome", "empire"])
    n2 = graph.add_node("Political Systems", "Political Science", tags=["politics"])
    n3 = graph.add_node("UPSC", "Exam Prep", tags=["upsc"])

    # Connect them
    graph.connect_nodes(n1.id, n2.id, "influenced")
    graph.connect_nodes(n2.id, n3.id, "is part of")

    # Test search
    results = graph.search("rome")
    assert len(results) == 1
    assert results[0].title == "Ancient Rome"

    # Test domain filter
    history = graph.filter_by_domain("History")
    assert len(history) == 1

    # Test connection count
    assert graph.get_node_strength(n2.id) == 2

    # Test random node
    r = graph.random_node()
    assert r is not None

    # Save and reload
    storage = StorageManager(filepath="app/data/test_graph.json")
    storage.save(graph)
    loaded = storage.load()
    assert len(loaded.nodes) == 3
    assert len(loaded.connections) == 2

    print("✅ Graph tests passed")


def test_habits():
    tracker = HabitTracker(filepath="app/data/test_habits.json")

    h1 = tracker.add_habit("Read 30 mins")
    h2 = tracker.add_habit("Revise notes")

    tracker.log_today([h1.id, h2.id], summary="Good day today")

    log = tracker.get_today_log()
    assert log is not None
    assert len(log.completed_habits) == 2

    streak = tracker.get_streak(h1.id)
    assert streak == 1

    tracker.save()
    
    tracker2 = HabitTracker(filepath="app/data/test_habits.json")
    tracker2.load()
    assert len(tracker2.habits) == 2

    print("✅ Habit tracker tests passed")


if __name__ == "__main__":
    test_basic()
    test_habits()
    