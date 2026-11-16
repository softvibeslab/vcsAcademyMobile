"""Consistent local snapshots; restoration always targets a new empty directory.

An editorial version restore is a separate operation. These full disaster-recovery
snapshots include persistent data and must never replace a running server's root.
"""
from __future__ import annotations

import fcntl
import hashlib
import json
import os
import shutil
import sqlite3
import tempfile
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from urllib.parse import quote


class BackupError(ValueError):
    pass


def _hash(path):
    hasher = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024*1024), b''):
            hasher.update(chunk)
    return hasher.hexdigest()


def _sqlite(path):
    with path.open('rb') as handle:
        return handle.read(16) == b'SQLite format 3\x00'


def _sqlite_check(path):
    uri = 'file:'+quote(str(path.resolve()), safe='/')+'?mode=ro&immutable=1'
    try:
        con = sqlite3.connect(uri, uri=True)
        try:
            rows = con.execute('pragma quick_check').fetchall()
        finally:
            con.close()
        if rows != [('ok',)]:
            raise BackupError('El respaldo SQLite no pasó la comprobación de integridad.')
    except sqlite3.Error as exc:
        raise BackupError('No se pudo verificar SQLite.') from exc


def _relative(value):
    if not isinstance(value, str) or not value or '\\' in value:
        raise BackupError('Ruta de manifiesto inválida.')
    path = PurePosixPath(value)
    if path.is_absolute() or any(part in ('..', '.') for part in path.parts) or str(path) != value:
        raise BackupError('Ruta de manifiesto fuera del respaldo.')
    return path


def _inventory(root, *, manifest=False):
    result = []
    for path in sorted(root.rglob('*')):
        if path.is_symlink():
            raise BackupError('Los respaldos no admiten enlaces simbólicos.')
        if path.is_dir():
            continue
        if not path.is_file():
            raise BackupError('Los respaldos solo admiten archivos regulares.')
        relative = path.relative_to(root).as_posix()
        if manifest and relative == 'manifest.json':
            continue
        result.append((path, relative))
    return result


@contextmanager
def _media_lock(root):
    lock = root/'media'/'.media.lock'
    if lock.is_symlink():
        raise BackupError('Bloqueo multimedia no válido.')
    if not lock.exists():
        yield
        return
    with lock.open('rb') as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def _verify_media_references(root, manifest):
    index = root/'media'/'media.sqlite'
    if not index.is_file():
        return
    uri = 'file:'+quote(str(index.resolve()), safe='/')+'?mode=ro&immutable=1'
    con = sqlite3.connect(uri, uri=True)
    try:
        if not con.execute("select 1 from sqlite_master where type='table' and name='media'").fetchone():
            return
        for checksum, stored_bytes, mapping in con.execute('select checksum,stored_bytes,files from media'):
            try:
                references = json.loads(mapping)
                if not isinstance(references, dict) or 'original' not in references:
                    raise ValueError('missing original')
                actual_bytes = 0
                for variant, relative in references.items():
                    rel = _relative(relative)
                    key = 'media/'+str(rel)
                    entry = manifest['files'].get(key)
                    if not entry or not (root/key).is_file():
                        raise BackupError('Falta un archivo referenciado por la biblioteca.')
                    if variant == 'original' and entry['sha256'] != checksum:
                        raise BackupError('El original no coincide con el índice multimedia.')
                    actual_bytes += entry['bytes']
                if actual_bytes != stored_bytes:
                    raise BackupError('El tamaño de la biblioteca no coincide con sus referencias.')
            except (ValueError, TypeError, KeyError) as exc:
                if isinstance(exc, BackupError):
                    raise
                raise BackupError('Una referencia de la biblioteca no es válida.') from exc
    except sqlite3.Error as exc:
        raise BackupError('El índice multimedia no se pudo verificar.') from exc
    finally:
        con.close()


def create_backup(data_root, destination):
    source_input, target_input = Path(data_root), Path(destination)
    if source_input.is_symlink() or target_input.is_symlink():
        raise BackupError('El origen y destino deben ser directorios propios.')
    source, target = source_input.resolve(), target_input.resolve()
    if not source.is_dir():
        raise BackupError('No existe el directorio de datos.')
    if target == source or target.is_relative_to(source) or source.is_relative_to(target):
        raise BackupError('El respaldo debe guardarse fuera del árbol de datos.')
    if target.exists():
        raise BackupError('El destino ya existe; los respaldos son inmutables.')
    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    stage = Path(tempfile.mkdtemp(prefix='.salesacademy-snapshot-', dir=target.parent))
    try:
        files = {}
        with _media_lock(source):
            for path, relative in _inventory(source):
                if relative.endswith(('-wal', '-shm', '-journal')) or path.name in ('.media.lock', '.backup.lock'):
                    continue
                destination_path = stage/relative
                destination_path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
                database = _sqlite(path)
                if database:
                    uri = 'file:'+quote(str(path), safe='/')+'?mode=ro'
                    src = sqlite3.connect(uri, uri=True, timeout=20)
                    dst = sqlite3.connect(destination_path)
                    try:
                        src.backup(dst)
                    finally:
                        dst.close(); src.close()
                    _sqlite_check(destination_path)
                else:
                    shutil.copyfile(path, destination_path)
                os.chmod(destination_path, 0o600)
                files[relative] = {'sha256': _hash(destination_path), 'bytes': destination_path.stat().st_size, 'sqlite': database}
        if not files:
            raise BackupError('No hay datos para respaldar.')
        manifest = {'version': 1, 'createdAt': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'files': files}
        (stage/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        os.chmod(stage/'manifest.json', 0o600)
        verify_backup(stage)
        if target.exists():
            raise BackupError('El destino ya existe; no se reemplazó.')
        stage.rename(target)
        return target
    except Exception as exc:
        shutil.rmtree(stage, ignore_errors=True)
        if isinstance(exc, BackupError):
            raise
        raise BackupError('No se pudo crear un respaldo completo.') from exc


def verify_backup(snapshot):
    given = Path(snapshot)
    if given.is_symlink():
        raise BackupError('La ruta del respaldo no puede ser un enlace.')
    root = given.resolve()
    manifest_path = root/'manifest.json'
    if not root.is_dir() or manifest_path.is_symlink() or not manifest_path.is_file() or manifest_path.stat().st_size > 16*1024*1024:
        raise BackupError('No se encontró un manifiesto válido.')
    try:
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    except (OSError, ValueError) as exc:
        raise BackupError('El manifiesto no es JSON válido.') from exc
    if not isinstance(manifest, dict) or manifest.get('version') != 1 or not isinstance(manifest.get('files'), dict) or not manifest['files']:
        raise BackupError('El manifiesto no tiene un formato admitido.')
    present = {relative for _, relative in _inventory(root, manifest=True)}
    expected = set(manifest['files'])
    if present != expected:
        raise BackupError('El respaldo tiene archivos faltantes o no inventariados.')
    byte_count = 0
    for relative, entry in manifest['files'].items():
        rel = _relative(relative)
        path = root/rel
        if not path.resolve().is_relative_to(root) or path.is_symlink():
            raise BackupError('Un archivo sale del directorio del respaldo.')
        if not isinstance(entry, dict) or not isinstance(entry.get('bytes'), int) or entry['bytes'] < 0 or not isinstance(entry.get('sha256'), str):
            raise BackupError('La ficha de un archivo no es válida.')
        if path.stat().st_size != entry['bytes'] or _hash(path) != entry['sha256']:
            raise BackupError('Un archivo no coincide con el hash o tamaño respaldado.')
        is_database = _sqlite(path)
        if bool(entry.get('sqlite')) != is_database:
            raise BackupError('La clasificación de un archivo del respaldo cambió.')
        if is_database:
            _sqlite_check(path)
        byte_count += entry['bytes']
    _verify_media_references(root, manifest)
    return {'ok': True, 'files': len(expected), 'bytes': byte_count, 'createdAt': manifest.get('createdAt')}


def restore_backup(snapshot, new_empty_destination):
    source = Path(snapshot).resolve()
    target_input = Path(new_empty_destination)
    if target_input.is_symlink():
        raise BackupError('El destino no puede ser un enlace simbólico.')
    target = target_input.resolve()
    if target == source or target.is_relative_to(source) or source.is_relative_to(target):
        raise BackupError('La restauración requiere un directorio separado del respaldo.')
    if target.exists() and (not target.is_dir() or any(target.iterdir())):
        raise BackupError('La restauración no sobrescribe directorios con datos.')
    verify_backup(snapshot)
    manifest = json.loads((source/'manifest.json').read_text(encoding='utf-8'))
    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    stage = Path(tempfile.mkdtemp(prefix='.salesacademy-restore-', dir=target.parent))
    try:
        for relative, entry in manifest['files'].items():
            rel = _relative(relative)
            destination = stage/rel
            destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            shutil.copyfile(source/rel, destination)
            os.chmod(destination, 0o600)
            if _hash(destination) != entry['sha256']:
                raise BackupError('El respaldo cambió durante la restauración.')
            if entry.get('sqlite'):
                _sqlite_check(destination)
        if target.exists():
            if any(target.iterdir()):
                raise BackupError('El destino recibió datos; no se reemplazó.')
            target.rmdir()
        stage.rename(target)
        return target
    except Exception as exc:
        shutil.rmtree(stage, ignore_errors=True)
        if isinstance(exc, BackupError):
            raise
        raise BackupError('La restauración no se completó; el destino no se reemplazó.') from exc
