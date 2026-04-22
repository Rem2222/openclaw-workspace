@echo off
set VERSION=v2.3
set TOKEN=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
set REPO=Rem2222/openclaw-workspace
set BRANCH=master
set BASE=https://%TOKEN%@raw.githubusercontent.com/%REPO%/%BRANCH%/projects/CodexBar-Win-Enhance
echo CodexBar %VERSION% — updating...

curl -sL "%BASE%/codexbar.py" -o codexbar.py
curl -sL "%BASE%/premium_widget.py" -o premium_widget.py
curl -sL "%BASE%/bar_widget.py" -o bar_widget.py
curl -sL "%BASE%/floating_widget.py" -o floating_widget.py

echo Done! Version %VERSION%
