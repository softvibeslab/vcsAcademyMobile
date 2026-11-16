"""Trusted, bundled film metadata. Editorial input selects IDs, never paths."""
from functools import lru_cache
import json
import math
from pathlib import Path


CATALOG_PATH = Path(__file__).resolve().parents[1] / 'content/video-catalog.json'
VIDEO_IDS = frozenset({'smart-agent', 'menos-caos', 'sistema-conectado',
                       'infraestructura-comercial', 'conocimiento-en-practica'})
FIELDS = frozenset({'id', 'title', 'src', 'poster', 'width', 'height',
                    'durationSeconds', 'captions', 'audioKind'})


class VideoCatalogError(ValueError):
    """A deployment catalog is missing or malformed; never silently ignore it."""


@lru_cache(maxsize=8)
def load_video_catalog(path: Path = CATALOG_PATH) -> dict:
    try:
        catalog = json.loads(Path(path).read_text(encoding='utf-8'))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise VideoCatalogError('No se pudo leer el catálogo audiovisual del paquete.') from error
    if not isinstance(catalog, dict) or set(catalog) != VIDEO_IDS:
        raise VideoCatalogError('El catálogo debe incluir exactamente los cinco clips acordados.')
    for identifier, clip in catalog.items():
        if not isinstance(clip, dict) or set(clip) != FIELDS or clip['id'] != identifier:
            raise VideoCatalogError('La estructura de un clip es inválida.')
        if not isinstance(clip['title'], str) or not 1 <= len(clip['title'].strip()) <= 180 or '\x00' in clip['title']:
            raise VideoCatalogError('El título de un clip es inválido.')
        for key in ('width', 'height'):
            if type(clip[key]) is not int or not 1 <= clip[key] <= 4096:
                raise VideoCatalogError('Las dimensiones de un clip son inválidas.')
        duration = clip['durationSeconds']
        if type(duration) not in (int, float) or not math.isfinite(duration) or not 0 < duration <= 600:
            raise VideoCatalogError('La duración de un clip es inválida.')
        for key, extension in [('src', '.mp4'), ('poster', '.webp'), ('captions', '.es.vtt')]:
            if clip[key] != f'/growth-assets/films/{identifier}{extension}':
                raise VideoCatalogError('Las rutas de los clips deben coincidir con los activos locales curados.')
        if clip['audioKind'] != 'speech':
            raise VideoCatalogError('La colección requiere voz revisada y subtítulos en español.')
    return catalog
