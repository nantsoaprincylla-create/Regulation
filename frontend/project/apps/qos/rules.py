"""Règles de validation des indicateurs : unités admises par métrique."""

METRICS = {
    "download_speed": {"Mbps", "kbps"},
    "upload_speed": {"Mbps", "kbps"},
    "latency": {"ms"},
    "jitter": {"ms"},
    "packet_loss": {"%"},
    "availability": {"%"},
    "call_success_rate": {"%"},
    "drop_rate": {"%"},
    "satisfaction": {"score"},
}
PERCENT_METRICS = {"packet_loss", "availability", "call_success_rate", "drop_rate"}
NON_NEGATIVE = set(METRICS) - {"satisfaction"}


def validate_metric(name, value, unit):
    """Retourne None si valide, sinon un message d'erreur."""
    if name not in METRICS:
        return f"Indicateur inconnu : {name}."
    if unit not in METRICS[name]:
        return f"Unité « {unit} » non admise pour {name} (attendu : {', '.join(sorted(METRICS[name]))})."
    if name in NON_NEGATIVE and value < 0:
        return "Valeur négative impossible."
    if name in PERCENT_METRICS and value > 100:
        return "Pourcentage supérieur à 100."
    if name == "satisfaction" and not 1 <= value <= 5:
        return "Score de satisfaction hors de l'échelle 1–5."
    return None
