import json
import os
from .knowledge_graph import KnowledgeGraph


class StorageManager:
    def __init__(self, filepath="app/data/graph.json"):
        self.filepath = filepath

    def save(self, graph):
        os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
        with open(self.filepath, "w") as f:
            json.dump(graph.to_dict(), f, indent=2)

    def load(self):
        graph = KnowledgeGraph()
        if not os.path.exists(self.filepath):
            return graph
        with open(self.filepath, "r") as f:
            data = json.load(f)
        graph.from_dict(data)
        return graph
    