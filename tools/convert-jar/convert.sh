#!/usr/bin/env bash
set -euo pipefail

# Usage: ./convert.sh /path/to/your.jar com.example.Main out/app.js
# - Installs the JAR into the local maven repo
# - Creates a temporary Maven project using the provided pom-template.xml
# - Runs mvn package and teavm:build to produce a JavaScript file

if [ "$#" -lt 3 ]; then
  echo "Usage: $0 /path/to/your.jar <main-class> <out-js>"
  exit 2
fi

JAR_PATH="$1"
MAIN_CLASS="$2"
OUT_JS="$3"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMP_DIR="${SCRIPT_DIR}/tmp-convert-$$"
POM_TEMPLATE="${SCRIPT_DIR}/pom-template.xml"

mkdir -p "$TMP_DIR"
cp "$POM_TEMPLATE" "$TMP_DIR/pom.xml"

# Install jar into local maven repo under groupId=local.convert:input-jar:1.0
mvn install:install-file -Dfile="$JAR_PATH" -DgroupId=local.convert -DartifactId=input-jar -Dversion=1.0 -Dpackaging=jar

# Run Maven in the temp dir with teavm.mainClass overridden
pushd "$TMP_DIR" >/dev/null
mvn -Dteavm.mainClass="$MAIN_CLASS" package org.teavm:teavm-maven-plugin:build

# teavm by default writes to target/classes/app.js per template
JS_SRC="target/classes/app.js"
if [ ! -f "$JS_SRC" ]; then
  echo "TeaVM output not found at $JS_SRC"
  echo "Check Maven build logs for errors"
  popd >/dev/null
  exit 3
fi

mkdir -p "$(dirname "$OUT_JS")"
cp "$JS_SRC" "$OUT_JS"
popd >/dev/null

# Clean up temp dir
rm -rf "$TMP_DIR"

echo "Converted $JAR_PATH -> $OUT_JS (main: $MAIN_CLASS)"
