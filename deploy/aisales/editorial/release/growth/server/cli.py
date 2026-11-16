"""Local administration. Never expose bootstrap or recovery as public endpoints."""
import argparse
import getpass
import json
from pathlib import Path


def validate_data_root(value):
    path = Path(value).expanduser().resolve()
    source = Path(__file__).resolve().parents[1]
    if path == source or source in path.parents:
        raise ValueError('Los datos privados deben vivir fuera de growth/ y su raíz pública.')
    return path


def validate_binding(host, production=False):
    if host not in ('127.0.0.1', 'localhost', '::1'):
        raise ValueError('La vista local solo permite loopback. Usa WSGI y proxy para un despliegue aprobado.')
    return host


def password_prompt():
    password = getpass.getpass('Contraseña (mínimo 12 caracteres): ')
    if len(password) < 12:
        raise ValueError('Usa al menos 12 caracteres.')
    if password != getpass.getpass('Repite la contraseña: '):
        raise ValueError('Las contraseñas no coinciden.')
    return password


def main(argv=None):
    parser = argparse.ArgumentParser(description='Sales Academy · administración local del CMS')
    parser.add_argument('--data-root', required=True, help='Directorio privado fuera de growth/')
    commands = parser.add_subparsers(dest='command', required=True)
    serve = commands.add_parser('serve')
    serve.add_argument('--host', default='127.0.0.1')
    serve.add_argument('--port', type=int, default=4186)
    serve.add_argument('--enable-local-contact', action='store_true', help='Solo pruebas locales con datos sintéticos')
    for command in ('bootstrap', 'recover'):
        sub = commands.add_parser(command)
        sub.add_argument('--username', required=True)
    backup = commands.add_parser('backup')
    backup.add_argument('--destination', required=True)
    verify = commands.add_parser('verify-backup')
    verify.add_argument('--snapshot', required=True)
    restore = commands.add_parser('restore-backup')
    restore.add_argument('--snapshot', required=True)
    commands.add_parser('purge-expired', help='Eliminar solicitudes inactivas >90 días y eventos/auditoría >30 días')
    args = parser.parse_args(argv)
    try:
        root = validate_data_root(args.data_root)
        if args.command == 'serve':
            from .app import create_app
            host = validate_binding(args.host)
            app = create_app({'DATA_ROOT': str(root), 'COOKIE_SECURE': False,
                              'PUBLIC_CONTACT_ENABLED': args.enable_local_contact})
            print(f'Landing: http://127.0.0.1:{args.port}/descubre/')
            print(f'Mediahub: http://127.0.0.1:{args.port}/mediahub/')
            print(f'CMS: http://127.0.0.1:{args.port}/cms/')
            app.run(host=host, port=args.port, debug=False, use_reloader=False)
        elif args.command in ('bootstrap', 'recover'):
            from .app import create_app, create_staff, reset_staff_password
            create_app({'DATA_ROOT': str(root)})
            password = password_prompt()
            action = create_staff if args.command == 'bootstrap' else reset_staff_password
            action(root, args.username, password)
            print('Cuenta configurada. Las credenciales no se guardaron en archivos del proyecto.')
        elif args.command == 'backup':
            from .backup import create_backup
            print(create_backup(root, Path(args.destination).expanduser().resolve()))
        elif args.command == 'verify-backup':
            from .backup import verify_backup
            print(json.dumps(verify_backup(Path(args.snapshot).resolve()), ensure_ascii=False, default=str))
        elif args.command == 'restore-backup':
            from .backup import restore_backup
            restore_backup(Path(args.snapshot).resolve(), root)
            print('Copia restaurada en un destino aislado. No se cambió el servidor activo.')
        elif args.command == 'purge-expired':
            from .store import purge_expired_data
            print(json.dumps(purge_expired_data(root), ensure_ascii=False))
    except (ValueError, FileExistsError, FileNotFoundError) as error:
        parser.error(str(error))


if __name__ == '__main__':
    main()
