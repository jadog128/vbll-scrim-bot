import shutil
import os

src = r"C:\Users\jamie\.gemini\antigravity\brain\449fb10d-93ed-4a7d-b3cf-31d74f74833c\media__1777132522392.jpg"
dst1 = r"c:\Users\jamie\OneDrive\Desktop\Vrdl scrim bot\dashboard\public\giveaway-banner.jpg"
dst2 = r"c:\Users\jamie\OneDrive\Desktop\Vrdl scrim bot\vcc-dashboard\public\giveaway-banner.jpg"

try:
    shutil.copy(src, dst1)
    shutil.copy(src, dst2)
    print("Successfully copied to both")
except Exception as e:
    print(f"Error: {e}")
