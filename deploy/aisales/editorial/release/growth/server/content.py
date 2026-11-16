"""Validated structured editorial content; never accepts executable markup blocks."""

from __future__ import annotations
import copy
import re
from urllib.parse import urlparse, parse_qs
from .videos import load_video_catalog


class ContentError(ValueError):
    def __init__(self, message, status=400, code="invalid_content"):
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code


RESOURCE_KEYS = {
    "id",
    "slug",
    "title",
    "excerpt",
    "body",
    "type",
    "role",
    "topic",
    "level",
    "coverId",
    "attachments",
    "externalMediaUrl",
    "duration",
    "status",
    "evidenceLabel",
    "sourceNote",
    "reviewedAt",
}
OPTIONAL_RESOURCE_KEYS = {"videoId"}
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SECTION_KEYS = {
    "problemTitle",
    "problemBody",
    "practiceTitle",
    "practiceBody",
    "stagesTitle",
    "stagesBody",
    "ctaTitle",
    "ctaBody",
}


def string(value, label, maximum, required=True):
    if (
        not isinstance(value, str)
        or len(value) > maximum
        or (required and not value.strip())
        or "\x00" in value
    ):
        raise ContentError(f"{label}: texto inválido o demasiado largo.")
    return value


def obj(value, keys, label, required=None):
    if (
        not isinstance(value, dict)
        or set(value) - keys
        or (required and not set(required) <= set(value))
    ):
        raise ContentError(f"{label}: estructura inválida.")


def external_media_url(value):
    string(value, "Enlace multimedia", 500, False)
    if not value:
        return
    try:
        u = urlparse(value)
        port = u.port
    except ValueError:
        raise ContentError("Enlace multimedia inválido.") from None
    if u.scheme != "https" or u.username or u.password or port or u.fragment:
        raise ContentError("Usa un enlace HTTPS autorizado de YouTube o Vimeo.")
    host = (u.hostname or "").lower()
    params = parse_qs(u.query)
    valid = False
    if host in {"youtube.com", "www.youtube.com"} and u.path == "/watch":
        valid = (
            set(params) == {"v"}
            and len(params["v"]) == 1
            and bool(re.fullmatch(r"[A-Za-z0-9_-]{11}", params["v"][0]))
        )
    elif host == "youtu.be":
        valid = not u.query and bool(re.fullmatch(r"/[A-Za-z0-9_-]{11}", u.path))
    elif host in {"vimeo.com", "www.vimeo.com"}:
        valid = not u.query and bool(re.fullmatch(r"/[0-9]{3,12}", u.path))
    if not valid:
        raise ContentError("El proveedor o la ruta multimedia no están permitidos.")


def validate_resource(r):
    obj(r, RESOURCE_KEYS | OPTIONAL_RESOURCE_KEYS, "Recurso", RESOURCE_KEYS)
    for key, maximum in [
        ("id", 80),
        ("slug", 100),
        ("title", 180),
        ("excerpt", 500),
        ("level", 40),
        ("duration", 80),
        ("evidenceLabel", 140),
        ("sourceNote", 600),
        ("reviewedAt", 10),
    ]:
        string(
            r[key], key, maximum, key not in {"duration", "sourceNote", "reviewedAt"}
        )
    if not SLUG.fullmatch(r["id"]) or not SLUG.fullmatch(r["slug"]):
        raise ContentError("Identificador o slug inválido.")
    if r["reviewedAt"] and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", r["reviewedAt"]):
        raise ContentError("Fecha de revisión inválida.")
    for key, choices in [
        ("type", {"guide", "template", "matrix", "video", "audio"}),
        ("role", {"rep", "leader", "director"}),
        ("topic", {"coordination", "practice", "evidence"}),
        ("status", {"draft", "review", "published", "archived"}),
    ]:
        if not isinstance(r[key], str) or r[key] not in choices:
            raise ContentError(f"{key}: opción inválida.")
    external_media_url(r["externalMediaUrl"])
    video_id = r.get("videoId")
    if video_id is not None:
        if not isinstance(video_id, str) or video_id not in load_video_catalog():
            raise ContentError("Elige un video de la colección disponible.")
        if r["type"] != "video":
            raise ContentError("Selecciona el formato Video o retira el video de la colección.")
        if r["externalMediaUrl"]:
            raise ContentError("Elige una sola fuente: video de la colección o enlace externo.")
    if r["coverId"] is not None:
        string(r["coverId"], "Portada", 120)
    if not isinstance(r["attachments"], list) or len(r["attachments"]) > 12:
        raise ContentError("Adjuntos inválidos.")
    for item in r["attachments"]:
        string(item, "Adjunto", 120)
    if len(set(r["attachments"])) != len(r["attachments"]):
        raise ContentError("Hay adjuntos duplicados.")
    blocks = r["body"]
    if not isinstance(blocks, list) or not 1 <= len(blocks) <= 100:
        raise ContentError("El recurso necesita contenido y admite hasta 100 bloques.")
    for b in blocks:
        if not isinstance(b, dict):
            raise ContentError("Bloque inválido.")
        kind = b.get("type")
        if not isinstance(kind, str):
            raise ContentError("Tipo de bloque inválido.")
        if kind in {"heading", "paragraph"}:
            obj(b, {"type", "text"}, "Bloque", {"type", "text"})
            string(b["text"], "Texto", 10000)
        elif kind == "list":
            obj(b, {"type", "items"}, "Lista", {"type", "items"})
            if not isinstance(b["items"], list) or not 1 <= len(b["items"]) <= 50:
                raise ContentError("Lista inválida.")
            for item in b["items"]:
                string(item, "Elemento", 3000)
        elif kind == "table":
            obj(b, {"type", "headers", "rows"}, "Tabla", {"type", "headers", "rows"})
            if (
                not isinstance(b["headers"], list)
                or not 1 <= len(b["headers"]) <= 8
                or not isinstance(b["rows"], list)
                or not 1 <= len(b["rows"]) <= 100
            ):
                raise ContentError("Tabla inválida.")
            for h in b["headers"]:
                string(h, "Columna", 200)
            for row in b["rows"]:
                if not isinstance(row, list) or len(row) != len(b["headers"]):
                    raise ContentError("Fila inválida.")
                for cell in row:
                    string(cell, "Celda", 2000, False)
        else:
            raise ContentError("Solo se admiten títulos, párrafos, listas y tablas.")
    if (
        r["status"] == "published"
        and r["type"] in {"video", "audio"}
        and not r["externalMediaUrl"]
        and not video_id
    ):
        raise ContentError(
            "Un recurso audiovisual publicado necesita una fuente autorizada y contenido equivalente."
        )


def validate_document(doc):
    obj(
        doc,
        {"hero", "seo", "sections", "faqs", "resources"},
        "Documento",
        {"hero", "seo", "sections", "faqs", "resources"},
    )
    obj(
        doc["hero"],
        {"eyebrow", "title", "description", "primaryLabel"},
        "Portada",
        {"eyebrow", "title", "description", "primaryLabel"},
    )
    for k, m in [
        ("eyebrow", 140),
        ("title", 200),
        ("description", 1000),
        ("primaryLabel", 70),
    ]:
        string(doc["hero"][k], k, m)
    obj(doc["seo"], {"title", "description"}, "SEO", {"title", "description"})
    string(doc["seo"]["title"], "Título SEO", 100)
    string(doc["seo"]["description"], "Descripción SEO", 300)
    obj(doc["sections"], SECTION_KEYS, "Secciones", SECTION_KEYS)
    for k, v in doc["sections"].items():
        string(v, k, 400 if k.endswith("Title") else 2000)
    if not isinstance(doc["faqs"], list) or not 1 <= len(doc["faqs"]) <= 20:
        raise ContentError("Se requieren entre 1 y 20 preguntas frecuentes.")
    for faq in doc["faqs"]:
        obj(faq, {"question", "answer"}, "Pregunta", {"question", "answer"})
        string(faq["question"], "Pregunta", 300)
        string(faq["answer"], "Respuesta", 2000)
    if not isinstance(doc["resources"], list) or len(doc["resources"]) > 500:
        raise ContentError("Catálogo inválido o demasiado grande.")
    ids = set()
    slugs = set()
    for r in doc["resources"]:
        validate_resource(r)
        if r["id"] in ids or r["slug"] in slugs:
            raise ContentError(
                "El catálogo contiene identificadores o slugs duplicados."
            )
        ids.add(r["id"])
        slugs.add(r["slug"])
    return doc


def public_document(doc):
    result = copy.deepcopy(doc)
    result["resources"] = [r for r in result["resources"] if r["status"] == "published"]
    return result


def markdown(resource):
    lines = ["# " + resource["title"], "", resource["excerpt"], ""]
    for block in resource["body"]:
        kind = block["type"]
        if kind == "heading":
            lines.append("## " + block["text"])
        elif kind == "paragraph":
            lines.append(block["text"])
        elif kind == "list":
            lines.extend("- " + x for x in block["items"])
        elif kind == "table":
            clean = lambda v: v.replace("|", "\\|").replace("\n", " ")
            lines.append("| " + " | ".join(map(clean, block["headers"])) + " |")
            lines.append("| " + " | ".join("---" for _ in block["headers"]) + " |")
            lines.extend(
                "| " + " | ".join(map(clean, row)) + " |" for row in block["rows"]
            )
        lines.append("")
    lines.extend([resource["sourceNote"], resource["evidenceLabel"]])
    return "\n".join(lines) + "\n"
