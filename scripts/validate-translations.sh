#!/bin/bash
set -e

LANG1=${1:-"es"}  # Reference language
LANG2=${2:-"nl"}  # Language to validate

echo "=== Validating Translation Completeness: $LANG2 vs $LANG1 ==="

# Find all translation files for reference language
find components -name "*.json" -path "*/i18n/$LANG1/*" | while read REF_FILE; do
    # Convert reference path to target path
    TARGET_FILE=$(echo "$REF_FILE" | sed "s|/i18n/$LANG1/|/i18n/$LANG2/|")

    # Extract display name from path
    DISPLAY_NAME=$(echo "$REF_FILE" | sed 's|components/||' | sed 's|/i18n/.*||' | sed 's|/|:|')
    NAMESPACE=$(basename "$REF_FILE" .json)

    if [[ ! -f "$TARGET_FILE" ]]; then
        echo "❌ Missing translation file: $DISPLAY_NAME:$NAMESPACE"
        continue
    fi

    REF_COUNT=$(jq 'paths(scalars) as $p | $p | join(".")' "$REF_FILE" | wc -l)
    TARGET_COUNT=$(jq 'paths(scalars) as $p | $p | join(".")' "$TARGET_FILE" | wc -l)

    if [[ $REF_COUNT -eq $TARGET_COUNT ]]; then
        echo "✅ $DISPLAY_NAME:$NAMESPACE: $TARGET_COUNT keys"
    else
        echo "❌ $DISPLAY_NAME:$NAMESPACE: $TARGET_COUNT keys (expected $REF_COUNT)"
    fi
done

# Total counts
TOTAL_REF=$(find components -name "*.json" -path "*/i18n/$LANG1/*" -exec jq 'paths(scalars) as $p | $p | join(".")' {} \; 2>/dev/null | wc -l)
TOTAL_TARGET=$(find components -name "*.json" -path "*/i18n/$LANG2/*" -exec jq 'paths(scalars) as $p | $p | join(".")' {} \; 2>/dev/null | wc -l)

echo "=== Summary ==="
echo "Reference ($LANG1): $TOTAL_REF keys"
echo "Target ($LANG2): $TOTAL_TARGET keys"

if [[ $TOTAL_REF -eq $TOTAL_TARGET ]]; then
    echo "✅ Translation completeness: PASSED"
    exit 0
else
    echo "❌ Translation completeness: FAILED"
    exit 1
fi