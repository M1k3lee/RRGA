from __future__ import annotations

import html

def render_trust_badge_svg(name: str, status: str, tone: str) -> str:
    """Renders a stunning, glassmorphism-style SVG badge."""
    
    colors = {
        "clear": {"bg": "#06b6d4", "text": "#e0f7fa", "icon": "✓"},
        "warning": {"bg": "#f59e0b", "text": "#fef3c7", "icon": "⚠"},
        "critical": {"bg": "#ef4444", "text": "#fee2e2", "icon": "!"},
        "neutral": {"bg": "#64748b", "text": "#f1f5f9", "icon": "i"},
    }.get(tone, {"bg": "#64748b", "text": "#f1f5f9", "icon": "i"})

    safe_name = html.escape(name)
    safe_status = html.escape(status)
    
    return f"""<svg width="280" height="90" viewBox="0 0 280 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="280" height="90" rx="16" fill="#050B10" />
        <rect width="280" height="90" rx="16" fill="{colors['bg']}" fill-opacity="0.1" stroke="{colors['bg']}" stroke-opacity="0.3" />
        
        <!-- Header -->
        <text x="52" y="32" fill="{colors['bg']}" font-family="sans-serif" font-size="9" font-weight="600" style="text-transform: uppercase; letter-spacing: 0.15em;">VOTO VERIFIED</text>
        <text x="52" y="52" fill="white" font-family="sans-serif" font-size="14" font-weight="700">{safe_name}</text>
        
        <!-- Status -->
        <text x="264" y="52" text-anchor="end" fill="{colors['bg']}" font-family="sans-serif" font-size="12" font-weight="600">{safe_status}</text>
        
        <!-- Icon Container -->
        <rect x="16" y="22" width="24" height="24" rx="6" fill="{colors['bg']}" fill-opacity="0.2" />
        <text x="28" y="40" text-anchor="middle" fill="{colors['bg']}" font-family="sans-serif" font-size="16" font-weight="bold">{colors['icon']}</text>
        
        <!-- Footer -->
        <line x1="16" y1="70" x2="264" y2="70" stroke="white" stroke-opacity="0.05" />
        <text x="264" y="80" text-anchor="end" fill="white" fill-opacity="0.2" font-family="sans-serif" font-size="7" style="text-transform: uppercase; letter-spacing: 0.3em;">Oversight &amp; Trust Oracle</text>
        
        <!-- Pulse reflection -->
        <defs>
            <linearGradient id="paint0_linear" x1="0" y1="0" x2="280" y2="90" gradientUnits="userSpaceOnUse">
                <stop stop-color="white" stop-opacity="0.05"/>
                <stop offset="1" stop-color="white" stop-opacity="0"/>
            </linearGradient>
        </defs>
        <rect width="280" height="90" rx="16" fill="url(#paint0_linear)"/>
    </svg>"""
