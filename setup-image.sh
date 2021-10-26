#!/bin/bash
set -euo pipefail

apk update
apk upgrade
apk install imagemagick graphicsmagick