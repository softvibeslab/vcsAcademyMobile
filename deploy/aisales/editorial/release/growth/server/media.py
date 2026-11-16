"""Persistent editorial media; private originals, reviewed immutable derivatives.

This module never decides HTTP authorization. Callers must authorize every read;
public access is limited to references in the active published document.
"""
from __future__ import annotations

import fcntl
import hashlib
import io
import json
import os
import re
import sqlite3
import unicodedata
import uuid
import warnings
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, DictionaryObject, IndirectObject, NameObject


class MediaError(ValueError):
    def __init__(self, message, status=400, code='invalid_media'):
        super().__init__(message)
        self.message, self.status, self.code = message, status, code


def _now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def _fold(value):
    return ''.join(c for c in unicodedata.normalize('NFKD', str(value)).casefold() if not unicodedata.combining(c))


def _safe_pdf(data):
    """Parse structural objects and emit a new page-only PDF, not the raw upload."""
    try:
        if not data.startswith(b'%PDF-'):
            raise ValueError('not PDF')
        reader = PdfReader(io.BytesIO(data), strict=True)
        if reader.is_encrypted:
            raise ValueError('encrypted')
        if not 1 <= len(reader.pages) <= 200:
            raise ValueError('page limit')
        forbidden_keys = {'/OpenAction', '/AA', '/A', '/JavaScript', '/JS', '/EmbeddedFiles', '/EmbeddedFile', '/AcroForm', '/XFA', '/RichMediaContent', '/RichMediaSettings', '/Collection', '/AF', '/Launch', '/SubmitForm', '/ImportData'}
        forbidden_names = {'/JavaScript', '/Launch', '/GoToR', '/GoToE', '/SubmitForm', '/ImportData', '/URI', '/Sound', '/Movie', '/Rendition', '/RichMedia', '/FileAttachment', '/Filespec', '/EmbeddedFile'}
        seen = set()
        count = 0
        def inspect(obj, depth=0):
            nonlocal count
            if depth > 80:
                raise ValueError('object depth')
            if isinstance(obj, IndirectObject):
                key = (obj.idnum, obj.generation)
                if key in seen:
                    return
                seen.add(key)
                obj = obj.get_object()
            count += 1
            if count > 50000:
                raise ValueError('object limit')
            if isinstance(obj, DictionaryObject):
                if any(str(key) in forbidden_keys for key in obj):
                    raise ValueError('active PDF')
                for key, value in obj.items():
                    if isinstance(value, NameObject) and str(value) in forbidden_names:
                        raise ValueError('active PDF name')
                    inspect(value, depth+1)
            elif isinstance(obj, ArrayObject):
                for value in obj:
                    inspect(value, depth+1)
        inspect(reader.trailer)
        writer = PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        # Do not preserve source metadata, JavaScript, attachments or root actions.
        writer.add_metadata({'/Producer': 'Sales Academy editorial library'})
        result = io.BytesIO()
        writer.write(result)
        if result.tell() > MediaStore.MAX_BYTES:
            raise ValueError('derived PDF exceeds limit')
        return result.getvalue()
    except MediaError:
        raise
    except Exception as exc:
        raise MediaError('El PDF no es válido o contiene elementos activos no admitidos.', 415, 'unsafe_pdf') from exc


class MediaStore:
    MAX_BYTES = 10 * 1024 * 1024
    MAX_PIXELS = 25_000_000
    QUOTA_BYTES = 2 * 1024 * 1024 * 1024
    ID_PATTERN = re.compile(r'^m_[0-9a-f]{32}$')
    TEXT_LIMITS = {'title': 300, 'alt': 500, 'origin': 1000}
    FIELDS = set(TEXT_LIMITS) | {'rightsStatus', 'reviewStatus', 'archived'}

    def __init__(self, root):
        root = Path(root)
        if root.is_symlink():
            raise MediaError('La biblioteca requiere un directorio propio.', 400, 'unsafe_path')
        self.root = root.resolve()
        self.root.mkdir(parents=True, exist_ok=True, mode=0o700)
        for directory in ('originals', 'derived'):
            path = self.root/directory
            if path.is_symlink():
                raise MediaError('Ruta multimedia no válida.', 400, 'unsafe_path')
            path.mkdir(mode=0o700, exist_ok=True)
        self.dbpath = self.root/'media.sqlite'
        if self.dbpath.is_symlink():
            raise MediaError('Índice multimedia no válido.', 400, 'unsafe_path')
        with self._db() as con:
            con.execute('''create table if not exists media (
                id text primary key, checksum text not null unique,
                filename text not null, mime text not null, bytes integer not null,
                stored_bytes integer not null, metadata text not null,
                files text not null, created_at text not null
            )''')
        os.chmod(self.dbpath, 0o600)

    @contextmanager
    def _db(self):
        con = sqlite3.connect(self.dbpath, timeout=20)
        con.row_factory = sqlite3.Row
        try:
            yield con
            con.commit()
        except Exception:
            con.rollback()
            raise
        finally:
            con.close()

    @contextmanager
    def _lock(self):
        path = self.root/'.media.lock'
        if path.is_symlink():
            raise MediaError('Bloqueo multimedia inválido.', 400, 'unsafe_path')
        with path.open('a+b') as handle:
            os.chmod(path, 0o600)
            fcntl.flock(handle, fcntl.LOCK_EX)
            try:
                yield
            finally:
                fcntl.flock(handle, fcntl.LOCK_UN)

    def _metadata(self, data, initial=False):
        if not isinstance(data, dict) or set(data)-self.FIELDS:
            raise MediaError('Los metadatos contienen campos no admitidos.')
        result = {'title': '', 'alt': '', 'origin': '', 'rightsStatus': 'pending', 'reviewStatus': 'pending', 'archived': False} if initial else {}
        for key, value in data.items():
            if key in self.TEXT_LIMITS:
                if not isinstance(value, str) or len(value) > self.TEXT_LIMITS[key] or '\x00' in value:
                    raise MediaError('Un texto de la ficha excede el límite o no es válido.')
                result[key] = value.strip()
            elif key in ('rightsStatus', 'reviewStatus'):
                if value not in ('pending', 'approved'):
                    raise MediaError('El estado de revisión no es válido.')
                result[key] = value
            elif key == 'archived':
                if not isinstance(value, bool):
                    raise MediaError('El estado de archivo debe ser verdadero o falso.')
                result[key] = value
        return result

    def _item(self, row):
        if row is None:
            return None
        result = dict(id=row['id'], checksum=row['checksum'], filename=row['filename'], mime=row['mime'], bytes=row['bytes'], storedBytes=row['stored_bytes'], createdAt=row['created_at'])
        result.update(json.loads(row['metadata']))
        result['variants'] = list(json.loads(row['files']).keys())
        return result

    def _valid_id(self, id):
        return isinstance(id, str) and bool(self.ID_PATTERN.fullmatch(id))

    def get(self, id):
        if not self._valid_id(id):
            return None
        with self._db() as con:
            return self._item(con.execute('select * from media where id=?', (id,)).fetchone())

    def upload(self, stream, filename, metadata):
        meta = self._metadata(metadata, initial=True)
        if not isinstance(filename, str) or not filename or len(filename) > 240 or '\x00' in filename:
            raise MediaError('Nombre de archivo no válido.')
        filename = filename.replace('\\', '/').rsplit('/', 1)[-1]
        filename = ''.join(c for c in filename if ord(c) >= 32)
        extension = Path(filename).suffix.lower()
        allowed = {'.jpg': ('JPEG', 'image/jpeg'), '.jpeg': ('JPEG', 'image/jpeg'), '.png': ('PNG', 'image/png'), '.webp': ('WEBP', 'image/webp'), '.pdf': ('PDF', 'application/pdf')}
        if extension not in allowed:
            raise MediaError('Solo se admiten JPG, PNG, WebP y PDF. Audio y video se enlazan.', 415, 'unsupported_type')
        data = stream.read(self.MAX_BYTES + 1)
        if not isinstance(data, bytes) or not data:
            raise MediaError('El archivo está vacío o no es válido.', 415, 'invalid_file')
        if len(data) > self.MAX_BYTES:
            raise MediaError('El archivo supera 10 MB.', 413, 'file_too_large')
        checksum = hashlib.sha256(data).hexdigest()
        expected, mime = allowed[extension]
        derivatives = {}
        if expected == 'PDF':
            derivatives['download'] = (_safe_pdf(data), '.pdf')
        else:
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter('error', Image.DecompressionBombWarning)
                    with Image.open(io.BytesIO(data)) as probe:
                        if probe.format != expected:
                            raise MediaError('El formato real no coincide con la extensión.', 415, 'type_mismatch')
                        if probe.width*probe.height > self.MAX_PIXELS:
                            raise MediaError('La imagen supera 25 megapíxeles.', 413, 'pixel_limit')
                        if getattr(probe, 'n_frames', 1) != 1:
                            raise MediaError('Las imágenes animadas no están admitidas.', 415, 'animated_image')
                        probe.verify()
                    with Image.open(io.BytesIO(data)) as opened:
                        opened.load()
                        clean = ImageOps.exif_transpose(opened).convert('RGBA' if 'A' in opened.getbands() else 'RGB')
                        # Recreate pixels so no EXIF/ICC/text metadata survives in derivatives.
                        clean = Image.frombytes(clean.mode, clean.size, clean.tobytes())
                        for variant, edge, quality in (('web', 2400, 86), ('thumbnail', 480, 80)):
                            scaled = clean.copy(); scaled.thumbnail((edge, edge))
                            buf = io.BytesIO(); scaled.save(buf, format='WEBP', quality=quality, method=4)
                            derivatives[variant] = (buf.getvalue(), '.webp')
            except MediaError:
                raise
            except (Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
                raise MediaError('La imagen excede el límite de píxeles.', 413, 'pixel_limit') from exc
            except (UnidentifiedImageError, OSError, ValueError, SyntaxError) as exc:
                raise MediaError('No se pudo validar el contenido de la imagen.', 415, 'invalid_image') from exc
        needed = len(data) + sum(len(payload) for payload, _ in derivatives.values())
        with self._lock(), self._db() as con:
            previous = con.execute('select * from media where checksum=?', (checksum,)).fetchone()
            if previous:
                return {**self._item(previous), 'deduplicated': True}
            used = con.execute('select coalesce(sum(stored_bytes),0) from media').fetchone()[0]
            if used+needed > self.QUOTA_BYTES:
                raise MediaError('La biblioteca alcanzó su cuota de almacenamiento.', 413, 'quota_exceeded')
            mid = 'm_'+uuid.uuid4().hex
            files = {'original': f'originals/{mid}{extension}'}
            files.update({name: f'derived/{mid}.{name}{suffix}' for name, (_, suffix) in derivatives.items()})
            payloads = {'original': data, **{key: value[0] for key, value in derivatives.items()}}
            created = []
            try:
                for name, rel in files.items():
                    path = self.root/rel
                    # Exclusive creation and fixed server filenames prevent overwrite and traversal.
                    fd = os.open(path, os.O_WRONLY|os.O_CREAT|os.O_EXCL, 0o600)
                    with os.fdopen(fd, 'wb') as handle:
                        handle.write(payloads[name]); handle.flush(); os.fsync(handle.fileno())
                    created.append(path)
                con.execute('insert into media values(?,?,?,?,?,?,?,?,?)', (mid, checksum, filename, mime, len(data), needed, json.dumps(meta, ensure_ascii=False), json.dumps(files), _now()))
                result = self._item(con.execute('select * from media where id=?', (mid,)).fetchone())
                con.commit()
                return result
            except Exception:
                for path in created:
                    path.unlink(missing_ok=True)
                raise

    def list(self, query='', cursor=0, limit=24):
        if not isinstance(query, str) or len(query) > 200:
            raise MediaError('Búsqueda no válida.')
        try:
            cursor, limit = int(cursor), int(limit)
            if cursor < 0 or limit < 1:
                raise ValueError()
            limit = min(limit, 50)
        except (ValueError, TypeError) as exc:
            raise MediaError('Paginación no válida.') from exc
        with self._db() as con:
            items = [self._item(row) for row in con.execute('select * from media order by created_at desc, id desc')]
        term = _fold(query.strip())
        if term:
            items = [item for item in items if term in _fold(' '.join(str(item[key]) for key in ('title','alt','origin','filename')))]
        return {'items': items[cursor:cursor+limit], 'nextCursor': cursor+limit if cursor+limit < len(items) else None}

    def update(self, id, metadata):
        changes = self._metadata(metadata)
        with self._lock(), self._db() as con:
            row = con.execute('select * from media where id=?', (id,)).fetchone() if self._valid_id(id) else None
            if not row:
                raise MediaError('No se encontró el archivo.', 404, 'not_found')
            values = json.loads(row['metadata']); values.update(changes)
            con.execute('update media set metadata=? where id=?', (json.dumps(values, ensure_ascii=False), id))
            return self._item(con.execute('select * from media where id=?', (id,)).fetchone())

    def path(self, id, variant):
        if not self._valid_id(id):
            raise MediaError('No se encontró el archivo.', 404, 'not_found')
        with self._db() as con:
            row = con.execute('select files from media where id=?', (id,)).fetchone()
        rel = json.loads(row['files']).get(variant) if row and isinstance(variant, str) else None
        if not rel:
            raise MediaError('Esta versión del archivo no existe.', 404, 'not_found')
        path = self.root/rel
        if path.is_symlink() or not path.is_file() or not path.resolve().is_relative_to(self.root):
            raise MediaError('El archivo no está disponible.', 404, 'not_found')
        return path

    def usage(self):
        with self._db() as con:
            row = con.execute('select coalesce(sum(stored_bytes),0) as bytes,count(*) as count from media').fetchone()
        return {'bytes': row['bytes'], 'quotaBytes': self.QUOTA_BYTES, 'count': row['count']}

    def references(self, document):
        result = set()
        for resource in document.get('resources', []):
            if resource.get('status') != 'published':
                continue
            cover = resource.get('coverId')
            if isinstance(cover, str) and cover:
                result.add(cover)
            for attachment in resource.get('attachments', []):
                if isinstance(attachment, str) and attachment:
                    result.add(attachment)
        return result

    def verify_publish(self, document):
        covers = {resource.get('coverId') for resource in document.get('resources', []) if resource.get('status') == 'published' and resource.get('coverId')}
        for mid in self.references(document):
            asset = self.get(mid)
            if not asset:
                raise MediaError('Una publicación hace referencia a un medio inexistente.', 400, 'missing_media')
            if asset['archived'] or asset['reviewStatus'] != 'approved' or asset['rightsStatus'] != 'approved':
                raise MediaError('Revisa y autoriza los medios antes de publicar; los archivados no se pueden publicar de nuevo.', 400, 'media_not_approved')
            if mid in covers and not asset['mime'].startswith('image/'):
                raise MediaError('La portada debe ser una imagen.', 400, 'invalid_cover')
            if asset['mime'].startswith('image/') and not asset['alt'].strip():
                raise MediaError('Las imágenes publicadas requieren texto alternativo.', 400, 'missing_alt')
            for variant in asset['variants']:
                self.path(mid, variant)
