# Models Folder Migration Instructions

## Overview
This branch renames the `frontend/public/1998193939030491136` folder to `frontend/public/models` for better clarity.

## Manual Steps Required

Since binary files (`.glb`, `.bin`) cannot be directly moved via GitHub API, you need to manually rename the folder:

### Option 1: Using Git Locally

```bash
# Pull the branch
git checkout feature/rename-models-folder
git pull origin feature/rename-models-folder

# Navigate to the public folder
cd frontend/public

# Rename the folder
mv 1998193939030491136 models

# Stage the changes
git add .

# Commit the changes
git commit -m "Move 3D model files to models folder"

# Push to the branch
git push origin feature/rename-models-folder
```

### Option 2: Using GitHub Web Interface

1. Download all files from `frontend/public/1998193939030491136/`:
   - house.glb
   - kape_tagpuan.bin
   - kape_tagpuan.glb
   - kape_tagpuan.gltf
   - light.glb

2. Create new folder structure by uploading these files to:
   - `frontend/public/models/`

3. Delete the old `frontend/public/1998193939030491136/` folder

## Files to Move

- `house.glb` (3.4 MB)
- `kape_tagpuan.bin` (38 KB)
- `kape_tagpuan.glb` (51 KB)
- `kape_tagpuan.gltf` (13 KB)
- `light.glb` (221 KB)

## Configuration Updated

The following file has already been updated in this branch:
- ✅ `frontend/src/config/touristSpots.ts` - Changed path from `/1998193939030491136/light.glb` to `/models/light.glb`

## Verification

After moving the files, verify that:
1. All model files are in `frontend/public/models/`
2. The old `frontend/public/1998193939030491136/` folder is deleted
3. The app runs correctly with `npm run dev`
4. 3D models load properly on the map
