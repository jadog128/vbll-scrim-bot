import shutil
import os

base_src = r"c:\Users\jamie\OneDrive\Desktop\Vrdl scrim bot\dashboard"
base_dst = r"c:\Users\jamie\OneDrive\Desktop\Vrdl scrim bot\vcc-dashboard"

# Define the relative paths from the base directory
# Format: (source_rel_path, destination_rel_path)
sync_map = [
    (r"src\app\admin\page.tsx", r"src\app\admin\page.tsx"),
    (r"src\app\admin\designer\page.tsx", r"src\app\admin\designer\page.tsx"),
    (r"src\app\api\admin\commands\route.ts", r"src\app\api\admin\commands\route.ts"),
    (r"src\components\NavBar.tsx", r"src\components\NavBar.tsx")
]

# Ensure we remove the old directory in the destination if it exists
old_dir = os.path.join(base_dst, r"src\app\admin\commands")
if os.path.exists(old_dir):
    shutil.rmtree(old_dir)
    print("Cleaned up old commands directory in vcc-dashboard")

for s_rel, d_rel in sync_map:
    s = os.path.join(base_src, s_rel)
    d = os.path.join(base_dst, d_rel)
    
    if os.path.exists(s):
        os.makedirs(os.path.dirname(d), exist_ok=True)
        shutil.copy(s, d)
        print(f"Copied {s_rel}")
    else:
        print(f"Warning: Source not found {s}")
