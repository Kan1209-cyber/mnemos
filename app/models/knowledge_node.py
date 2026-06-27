import uuid
from datetime import datetime


class KnowledgeNode:
    def __init__(self, title, domain, content="", tags=None, sources=None):
        self.id = str(uuid.uuid4())
        self.title = title
        self.domain = domain
        self.content = content
        self.tags = tags if tags is not None else []
        self.sources = sources if sources is not None else []
        self.created_at = datetime.now().isoformat()
        self.last_visited = datetime.now().isoformat()

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "domain": self.domain,
            "content": self.content,
            "tags": self.tags,
            "sources": self.sources,
            "created_at": self.created_at,
            "last_visited": self.last_visited,
        }

    @classmethod
    def from_dict(cls, data):
        node = cls(
            title=data["title"],
            domain=data["domain"],
            content=data.get("content", ""),
            tags=data.get("tags", []),
            sources=data.get("sources", []),
        )
        node.id = data["id"]
        node.created_at = data["created_at"]
        node.last_visited = data.get("last_visited", node.created_at)
        return node

    def mark_visited(self):
        self.last_visited = datetime.now().isoformat()

    def is_decayed(self):
        last = datetime.fromisoformat(self.last_visited)
        diff = datetime.now() - last
        return diff.days >= 30

    def __repr__(self):
        return f"<KnowledgeNode {self.title} ({self.domain})>"
    