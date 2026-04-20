from __future__ import annotations

import html

def render_trust_badge_svg(name: str, status: str, tone: str) -> str:
    """Renders a sleek, compact capsule-style SVG badge."""
    
    colors = {
        "clear": {"bg": "#10b981", "accent": "#059669", "icon": "S"}, # Shield
        "warning": {"bg": "#f59e0b", "accent": "#d97706", "icon": "!"},
        "critical": {"bg": "#ef4444", "accent": "#dc2626", "icon": "X"},
        "neutral": {"bg": "#64748b", "accent": "#475569", "icon": "?"},
    }.get(tone, {"bg": "#64748b", "accent": "#475569", "icon": "?"})

    safe_name = html.escape(name)
    
    return f"""<svg width="240" height="48" viewBox="0 0 240 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Capsule Shape -->
        <rect x="0.5" y="0.5" width="239" height="47" rx="23.5" fill="#050B10" stroke="{colors['bg']}" stroke-opacity="0.4"/>
        <rect width="240" height="48" rx="24" fill="{colors['bg']}" fill-opacity="0.15"/>
        
        <!-- Icon Circle -->
        <circle cx="24" cy="24" r="16" fill="{colors['bg']}" fill-opacity="0.15"/>
        
        <!-- Shield Icon Path -->
        <path d="M24 14C24 14 21 14.5 19 16C17 17.5 16.5 19 16.5 22C16.5 26.5 19.5 29.5 24 32C28.5 29.5 31.5 26.5 31.5 22C31.5 19 31 17.5 29 16C27 14.5 24 14 24 14Z" 
              fill="{colors['bg']}" fill-opacity="0.8" />
        
        <!-- Checkmask symbol (inner) -->
        <path d="M20.5 23.5L23 26L28 21" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        
        <!-- Labels -->
        <text x="52" y="18" fill="white" fill-opacity="0.4" font-family="sans-serif" font-size="8" font-weight="600" style="text-transform: uppercase; letter-spacing: 0.2em;">VOTO VERIFIED</text>
        <text x="52" y="34" fill="white" font-family="sans-serif" font-size="13" font-weight="700">{safe_name}</text>
        
        <!-- Pulse Indicator -->
        <circle cx="220" cy="24" r="3" fill="{colors['bg']}">
            <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
        </circle>
        
        <!-- Subtle Gloss -->
        <defs>
            <linearGradient id="gloss" x1="0" y1="0" x2="240" y2="48" gradientUnits="userSpaceOnUse">
                <stop stop-color="white" stop-opacity="0.05"/>
                <stop offset="1" stop-color="white" stop-opacity="0"/>
            </linearGradient>
        </defs>
        <rect width="240" height="48" rx="24" fill="url(#gloss)"/>
    </svg>"""
