import uuid
from datetime import datetime


class Connection:
    def __init__(self, from_node_id, to_node_id, label="related to"):
        self.id = str(uuid.uuid4())
        self.from_node_id = from_node_id
        self.to_node_id = to_node_id
        self.label = label
        self.created_at = datetime.now().isoformat()

    def to_dict(self):
        return {
            "id": self.id,
            "from_node_id": self.from_node_id,
            "to_node_id": self.to_node_id,
            "label": self.label,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, data):
        conn = cls(
            from_node_id=data["from_node_id"],
            to_node_id=data["to_node_id"],
            label=data.get("label", "related to"),
        )
        conn.id = data["id"]
        conn.created_at = data["created_at"]
        return conn

    def __repr__(self):
        return f"<Connection {self.from_node_id} --[{self.label}]--> {self.to_node_id}>"
    