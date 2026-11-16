"""Versioned campaign destination. Preparing a URL never contacts WhatsApp."""
from urllib.parse import quote

WHATSAPP_NUMBER = '529843163268'
DEMO_MESSAGE = 'Hola, quiero conocer los agentes de IA de Sales Academy y agendar una demo para mi sala de ventas.'
WHATSAPP_DEMO_URL = f'https://wa.me/{WHATSAPP_NUMBER}?text={quote(DEMO_MESSAGE, safe="")}'
