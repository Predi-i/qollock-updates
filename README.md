# QOLLOCK update markers

This public repository tells installed copies of QOLLOCK that a newer release
exists. It deliberately contains **no QOLLOCK source code**: the main mod
repository stays private.

## Normal release workflow

Do this whenever you are preparing a QOLLOCK release for GitHub, Discord, or
another distribution channel — even if the Settings version is still `3.1.9`.

1. Open the repository's **Actions** tab.
2. Select **Publish QOLLOCK update marker**.
3. Click **Run workflow**.
4. Enter the next whole number shown below plus one, then run it.
5. Wait for the green checkmark. Publish the QOLLOCK build as normal.

The workflow creates the new marker, retires every previous marker, updates
this README and commits/pushes the result. No image editing, source editing or
manual file upload is needed.

`Dry run` is only for maintainers who want to test the workflow: leave it off
for a real release. It validates the transition but deliberately does not push.

The same number must be placed in `QOL_UPDATE_MARKER` in QOLLOCK before that
build is packed. The build's first Settings open then checks exactly its own
`markers/<number>.png`: a square image means current; a wide image means an
update is available.

## Current release marker

<!-- current-marker:start -->2<!-- current-marker:end -->

## How it works

Panorama cannot reliably fetch text/JSON, but it can load an image and inspect
its dimensions. The marker image carries no user data and is served directly
from GitHub. The game classifies only two intentional shapes:

- `64×64` (square): this release is current.
- `64×8` (wide): this release has been superseded.

Keep this repository public. Making it private prevents `raw.githubusercontent.com`
from serving the marker to players who do not have GitHub credentials.

## Permissions

This repository is already configured with the `GITHUB_TOKEN` write permission
needed by the publish workflow. If the workflow is copied into a fork, set
**Settings → Actions → General → Workflow permissions** to **Read and write
permissions**. It can update this public repository only; it cannot access the
private QOLLOCK repository.
