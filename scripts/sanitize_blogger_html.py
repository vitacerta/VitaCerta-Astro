#!/usr/bin/env python3
"""Limpeza de HTML legado do Blogger antes da importacao para Astro."""

from __future__ import annotations

import re
from urllib.parse import urlparse

BLOGGER_HOSTS = {"vitacerta.blogspot.com", "www.vitacerta.blogspot.com"}

STYLE_ATTR_RE = re.compile(r'\sstyle=("[^"]*"|\'[^\']*\')', re.I)
HREF_RE = re.compile(r'href=("|\')(https?://[^"\']+)\1', re.I)

REMOVE_STYLE_PROPERTIES = {
    "color",
    "background",
    "background-color",
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "line-height",
    "-webkit-text-stroke-color",
    "-webkit-text-stroke-width",
    "-webkit-text-size-adjust",
    "font-feature-settings",
    "font-kerning",
    "font-optical-sizing",
    "font-size-adjust",
    "font-width",
    "font-variation-settings",
    "font-variant",
}

REMOVE_STYLE_PREFIXES = (
    "font-variant-",
)


def _clean_style_value(style: str) -> str:
    kept: list[str] = []
    for declaration in style.split(";"):
        if ":" not in declaration:
            continue
        prop, value = declaration.split(":", 1)
        prop = prop.strip().lower()
        value = value.strip()
        if (
            not prop
            or not value
            or prop in REMOVE_STYLE_PROPERTIES
            or any(prop.startswith(prefix) for prefix in REMOVE_STYLE_PREFIXES)
        ):
            continue
        kept.append(f"{prop}: {value}")
    return "; ".join(kept)


def strip_legacy_styles(html: str) -> str:
    def repl(match: re.Match[str]) -> str:
        quoted = match.group(1)
        quote = quoted[0]
        style = quoted[1:-1]
        cleaned = _clean_style_value(style)
        return f" style={quote}{cleaned}{quote}" if cleaned else ""

    return STYLE_ATTR_RE.sub(repl, html)


def blogger_url_to_vitacerta(url: str) -> str:
    parsed = urlparse(url)
    if parsed.netloc.lower() not in BLOGGER_HOSTS:
        return url

    path = parsed.path.rstrip("/")
    if not path:
        return "/"

    # URLs de posts do Blogger normalmente terminam em /slug.html.
    slug = path.rsplit("/", 1)[-1]
    if slug.endswith(".html"):
        slug = slug[:-5]
    if not slug:
        return "/"

    return f"/conteudos/{slug}/"


def rewrite_internal_links(html: str) -> str:
    def repl(match: re.Match[str]) -> str:
        quote = match.group(1)
        original = match.group(2)
        rewritten = blogger_url_to_vitacerta(original)
        return f"href={quote}{rewritten}{quote}"

    return HREF_RE.sub(repl, html)


def sanitize_blogger_html(html: str) -> str:
    html = strip_legacy_styles(html)
    html = rewrite_internal_links(html)
    return html


if __name__ == "__main__":
    import sys

    source = sys.stdin.read()
    sys.stdout.write(sanitize_blogger_html(source))
