
import xml.etree.ElementTree as ET
import sys

try:
    tree = ET.parse('temp_instruction.xml')
    root = tree.getroot()
    
    # Define namespaces (ODT uses namespaced tags)
    namespaces = {
        'text': 'urn:oasis:names:tc:opendocument:xmlns:text:1.0'
    }
    
    # Find all text paragraphs
    for p in root.findall('.//text:p', namespaces):
        text = "".join(p.itertext())
        if text.strip():
            print(text)
            print("-" * 20)
            
except Exception as e:
    print(f"Error: {e}")
