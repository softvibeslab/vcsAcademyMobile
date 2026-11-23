"""Read-only public release verification. Run only after V1 activation.

Usage: python3 verify-public-artifacts.py --after-activation
Uses certificate-verified HTTPS GETs only; no cookies, credentials, accounts,
SSH, private records, redirects, or remote writes. Evidence contains hashes,
sizes, HTTP statuses and readiness booleans, never downloaded response bodies.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path, PurePosixPath
import re
import ssl
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, HTTPSHandler, ProxyHandler, Request, build_opener

FEATURE = Path(__file__).resolve().parent
ROOT = FEATURE.parents[2]
DIST = ROOT / "frontend" / "dist-v1"
EVIDENCE = FEATURE / "evidence"
ORIGINS = {"v1": "https://aisalesv1.softvibes.pro", "v5": "https://aisales.softvibes.pro"}
MAX_BYTES = 8 * 1024 * 1024
SHA256 = re.compile(r"^[a-f0-9]{64}$")


class VerificationError(Exception):
    """Only static error codes are exported to evidence."""


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class AssetLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        source = attrs.get("src") if tag == "script" else attrs.get("href") if tag == "link" else None
        if not source:
            return
        parsed = urlsplit(source)
        if parsed.path.endswith((".js", ".css")):
            if parsed.scheme or parsed.netloc or parsed.query or parsed.fragment or not parsed.path.startswith("/assets/"):
                raise VerificationError("unexpected_asset_reference")
            relative = PurePosixPath(parsed.path.lstrip("/"))
            if ".." in relative.parts:
                raise VerificationError("invalid_asset_path")
            self.paths.add("web/" + relative.as_posix())


def digest(body: bytes) -> str:
    return hashlib.sha256(body).hexdigest()


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def check_hash(value):
    if not isinstance(value, str) or not SHA256.fullmatch(value):
        raise VerificationError("invalid_expected_sha256")
    return value


def download(opener, site: str, relative: str):
    if site not in ORIGINS or not relative.startswith("/") or relative.startswith("//"):
        raise VerificationError("invalid_public_target")
    request = Request(
        ORIGINS[site] + relative,
        headers={"Accept-Encoding": "identity", "Cache-Control": "no-cache", "Pragma": "no-cache", "User-Agent": "SalesAcademy-PublicArtifactVerifier/1.0"},
        method="GET",
    )
    with opener.open(request, timeout=30) as response:
        if response.status != 200:
            raise VerificationError("unexpected_http_status")
        if response.headers.get("Content-Encoding", "identity").lower() != "identity":
            raise VerificationError("unexpected_content_encoding")
        body = response.read(MAX_BYTES + 1)
        if len(body) > MAX_BYTES:
            raise VerificationError("response_too_large")
        return response.status, body


def verify(report, manifest_path: Path):
    manifest = load_json(manifest_path)
    baseline = load_json(EVIDENCE / "deployment-before.json")
    files = manifest["files"]
    expected_html = check_hash(files["web/v1.html"])
    v5_html = check_hash(baseline["aisales"]["htmlSha256"])
    local_html = (DIST / "v1.html").read_bytes()
    report["release_manifest_sha256"] = digest(manifest_path.read_bytes())
    report["checks"].append({"name": "local_html_matches_manifest", "passed": digest(local_html) == expected_html, "expected_sha256": expected_html, "actual_sha256": digest(local_html)})
    parser = AssetLinks()
    parser.feed(local_html.decode("utf-8"))
    assets = {name for name in files if name.startswith("web/assets/") and name.endswith((".js", ".css"))}
    local_assets = {"web/" + path.relative_to(DIST).as_posix() for path in (DIST / "assets").rglob("*") if path.is_file() and path.suffix in {".js", ".css"}}
    report["checks"].append({"name": "local_asset_inventory_matches_manifest", "passed": bool(assets) and assets == local_assets and bool(parser.paths) and parser.paths <= assets, "manifest_assets": len(assets), "local_assets": len(local_assets), "html_asset_references": len(parser.paths)})

    # Standard system CA trust, hostname verification and TLS verification are
    # intentionally mandatory. No environment proxy or redirect can change host.
    context = ssl.create_default_context()
    opener = build_opener(ProxyHandler({}), NoRedirect(), HTTPSHandler(context=context))

    def public_hash(name, site, relative, expected, local_sha=None):
        try:
            status, body = download(opener, site, relative)
            actual = digest(body)
            result = {"name": name, "path": relative, "passed": actual == expected and (local_sha is None or actual == local_sha), "http_status": status, "expected_sha256": expected, "actual_sha256": actual, "bytes": len(body)}
            if local_sha is not None:
                result["local_sha256"] = local_sha
            report["checks"].append(result)
        except Exception as error:
            report["checks"].append(failed_check(name, error))

    public_hash("v1_public_html", "v1", "/", expected_html, digest(local_html))
    for name in sorted(assets):
        relative = PurePosixPath(name.removeprefix("web/"))
        if relative.is_absolute() or ".." in relative.parts or relative.parts[0] != "assets":
            raise VerificationError("invalid_manifest_asset_path")
        expected = check_hash(files[name])
        local_sha = digest((DIST / relative).read_bytes())
        report["checks"].append({"name": "local_asset_matches_manifest", "path": "/" + relative.as_posix(), "passed": local_sha == expected, "expected_sha256": expected, "actual_sha256": local_sha})
        public_hash("v1_public_asset", "v1", "/" + relative.as_posix(), expected, local_sha)
    try:
        status, body = download(opener, "v1", "/api/ready")
        ready = json.loads(body)
        checks = ready.get("data", {}).get("checks", {})
        flags = {name: checks.get(name) is True for name in ("database", "seed_users", "seed_resources")}
        report["checks"].append({"name": "v1_public_ready", "passed": ready.get("success") is True and ready.get("data", {}).get("status") == "ready" and all(flags.values()), "http_status": status, "checks": flags})
    except Exception as error:
        report["checks"].append(failed_check("v1_public_ready", error))
    public_hash("v5_public_html_unchanged", "v5", "/", v5_html)


def failed_check(name, error):
    result = {"name": name, "passed": False, "error": str(error) if isinstance(error, VerificationError) else type(error).__name__}
    if isinstance(error, HTTPError):
        result["http_status"] = error.code
        error.close()
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--after-activation", action="store_true", required=True, help="Confirm the deployment operator has finished V1 activation.")
    parser.add_argument("--manifest", type=Path, default=EVIDENCE / "release-manifest.json", help="Local release manifest with files keyed as web/v1.html and web/assets/…")
    parser.add_argument("--output", type=Path, default=EVIDENCE / "public-artifacts.json", help="Local path for sanitized verification evidence.")
    args = parser.parse_args()
    report = {"passed": False, "checked_at": datetime.now(timezone.utc).isoformat(), "scope": "public_artifacts_only", "https_certificate_verification": True, "checks": []}
    try:
        verify(report, args.manifest)
    except Exception as error:
        report["checks"].append(failed_check("verifier_inputs", error))
    report["passed"] = bool(report["checks"]) and all(check["passed"] for check in report["checks"])
    # This is the only write, and only occurs when explicitly run after activation.
    target = args.output
    target.write_text(json.dumps(report, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"passed": report["passed"], "checks": len(report["checks"]), "evidence": target.name}))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
