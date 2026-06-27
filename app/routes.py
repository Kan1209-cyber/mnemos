from flask import Blueprint, jsonify, request
from . import storage, habit_tracker
from flask import render_template

main = Blueprint("main", __name__)
@main.route("/")
def index():
    return render_template("index.html")

graph = storage.load()


# ─── NODE ROUTES ───────────────────────────────────────────

@main.route("/api/nodes", methods=["GET"])
def get_nodes():
    domain = request.args.get("domain")
    if domain:
        nodes = graph.filter_by_domain(domain)
    else:
        nodes = list(graph.nodes.values())
    return jsonify([n.to_dict() for n in nodes])


@main.route("/api/nodes", methods=["POST"])
def create_node():
    data = request.json
    node = graph.add_node(
        title=data["title"],
        domain=data["domain"],
        content=data.get("content", ""),
        tags=data.get("tags", []),
        sources=data.get("sources", []),
    )
    storage.save(graph)
    return jsonify(node.to_dict()), 201


@main.route("/api/nodes/<node_id>", methods=["GET"])
def get_node(node_id):
    node = graph.get_node(node_id)
    if not node:
        return jsonify({"error": "Node not found"}), 404
    node.mark_visited()
    storage.save(graph)
    return jsonify(node.to_dict())


@main.route("/api/nodes/<node_id>", methods=["PUT"])
def update_node(node_id):
    node = graph.get_node(node_id)
    if not node:
        return jsonify({"error": "Node not found"}), 404
    data = request.json
    node.title = data.get("title", node.title)
    node.domain = data.get("domain", node.domain)
    node.content = data.get("content", node.content)
    node.tags = data.get("tags", node.tags)
    node.sources = data.get("sources", node.sources)
    storage.save(graph)
    return jsonify(node.to_dict())


@main.route("/api/nodes/<node_id>", methods=["DELETE"])
def delete_node(node_id):
    success = graph.delete_node(node_id)
    if not success:
        return jsonify({"error": "Node not found"}), 404
    storage.save(graph)
    return jsonify({"message": "Node deleted"})


# ─── CONNECTION ROUTES ─────────────────────────────────────

@main.route("/api/connections", methods=["GET"])
def get_connections():
    return jsonify([c.to_dict() for c in graph.connections.values()])


@main.route("/api/connections", methods=["POST"])
def create_connection():
    data = request.json
    conn = graph.connect_nodes(
        from_node_id=data["from_node_id"],
        to_node_id=data["to_node_id"],
        label=data.get("label", "related to"),
    )
    if not conn:
        return jsonify({"error": "One or both nodes not found"}), 404
    storage.save(graph)
    return jsonify(conn.to_dict()), 201


@main.route("/api/connections/<conn_id>", methods=["DELETE"])
def delete_connection(conn_id):
    if conn_id not in graph.connections:
        return jsonify({"error": "Connection not found"}), 404
    del graph.connections[conn_id]
    storage.save(graph)
    return jsonify({"message": "Connection deleted"})


# ─── GRAPH ROUTES ──────────────────────────────────────────

@main.route("/api/graph", methods=["GET"])
def get_graph():
    nodes = [n.to_dict() for n in graph.nodes.values()]
    connections = [c.to_dict() for c in graph.connections.values()]
    for n in nodes:
        n["strength"] = graph.get_node_strength(n["id"])
        n["decayed"] = graph.get_node(n["id"]).is_decayed()
    return jsonify({"nodes": nodes, "connections": connections})


@main.route("/api/graph/random", methods=["GET"])
def random_node():
    node = graph.random_node()
    if not node:
        return jsonify({"error": "No nodes exist"}), 404
    return jsonify(node.to_dict())


@main.route("/api/graph/search", methods=["GET"])
def search():
    query = request.args.get("q", "")
    results = graph.search(query)
    return jsonify([n.to_dict() for n in results])


@main.route("/api/graph/domains", methods=["GET"])
def get_domains():
    return jsonify(graph.get_all_domains())


@main.route("/api/graph/heatmap", methods=["GET"])
def get_heatmap():
    heatmap = {}
    for node in graph.nodes.values():
        heatmap[node.domain] = heatmap.get(node.domain, 0) + 1
    return jsonify(heatmap)


# ─── HABIT ROUTES ──────────────────────────────────────────

@main.route("/api/habits", methods=["GET"])
def get_habits():
    return jsonify([h.to_dict() for h in habit_tracker.habits.values()])


@main.route("/api/habits", methods=["POST"])
def create_habit():
    data = request.json
    habit = habit_tracker.add_habit(data["name"])
    habit_tracker.save()
    return jsonify(habit.to_dict()), 201


@main.route("/api/habits/<habit_id>", methods=["DELETE"])
def delete_habit(habit_id):
    success = habit_tracker.delete_habit(habit_id)
    if not success:
        return jsonify({"error": "Habit not found"}), 404
    habit_tracker.save()
    return jsonify({"message": "Habit deleted"})


@main.route("/api/habits/log", methods=["POST"])
def log_habits():
    data = request.json
    log = habit_tracker.log_today(
        completed_habit_ids=data["completed_habit_ids"],
        summary=data.get("summary", ""),
    )
    habit_tracker.save()
    return jsonify(log.to_dict())


@main.route("/api/habits/today", methods=["GET"])
def get_today():
    log = habit_tracker.get_today_log()
    if not log:
        return jsonify({"message": "No log for today"})
    return jsonify(log.to_dict())


@main.route("/api/habits/streaks", methods=["GET"])
def get_streaks():
    streaks = {
        hid: habit_tracker.get_streak(hid)
        for hid in habit_tracker.habits
    }
    return jsonify(streaks)
