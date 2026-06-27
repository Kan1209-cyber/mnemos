import random
from .knowledge_node import KnowledgeNode
from .connection import Connection


class KnowledgeGraph:
    def __init__(self):
        self.nodes = {}
        self.connections = {}

    def add_node(self, title, domain, content="", tags=None, sources=None):
        node = KnowledgeNode(title, domain, content, tags, sources)
        self.nodes[node.id] = node
        return node

    def get_node(self, node_id):
        return self.nodes.get(node_id)

    def delete_node(self, node_id):
        if node_id not in self.nodes:
            return False
        del self.nodes[node_id]
        to_delete = [
            cid for cid, conn in self.connections.items()
            if conn.from_node_id == node_id or conn.to_node_id == node_id
        ]
        for cid in to_delete:
            del self.connections[cid]
        return True

    def connect_nodes(self, from_node_id, to_node_id, label="related to"):
        if from_node_id not in self.nodes or to_node_id not in self.nodes:
            return None
        conn = Connection(from_node_id, to_node_id, label)
        self.connections[conn.id] = conn
        return conn

    def get_connections_for_node(self, node_id):
        return [
            conn for conn in self.connections.values()
            if conn.from_node_id == node_id or conn.to_node_id == node_id
        ]

    def get_connection_count(self, node_id):
        return len(self.get_connections_for_node(node_id))

    def search(self, query):
        query = query.lower()
        return [
            node for node in self.nodes.values()
            if query in node.title.lower()
            or query in node.content.lower()
            or any(query in tag.lower() for tag in node.tags)
        ]

    def filter_by_domain(self, domain):
        return [
            node for node in self.nodes.values()
            if node.domain.lower() == domain.lower()
        ]

    def get_all_domains(self):
        return list(set(node.domain for node in self.nodes.values()))

    def get_decayed_nodes(self):
        return [node for node in self.nodes.values() if node.is_decayed()]

    def get_node_strength(self, node_id):
        return self.get_connection_count(node_id)

    def random_node(self):
        if not self.nodes:
            return None
        return random.choice(list(self.nodes.values()))

    def to_dict(self):
        return {
            "nodes": {nid: node.to_dict() for nid, node in self.nodes.items()},
            "connections": {cid: conn.to_dict() for cid, conn in self.connections.items()},
        }

    def from_dict(self, data):
        self.nodes = {
            nid: KnowledgeNode.from_dict(ndata)
            for nid, ndata in data.get("nodes", {}).items()
        }
        self.connections = {
            cid: Connection.from_dict(cdata)
            for cid, cdata in data.get("connections", {}).items()
        }
        