#!/bin/bash
LOG_FILE="logs/monitor.log"
AI_FIX_FILE="logs/ai_fixes.md"
echo "--- Smart Monitor Started ---" >> "$LOG_FILE"

# Track seen errors to avoid spamming the AI
LAST_ERROR_HASH=""

while true; do
  echo "[$(date)] Running health check..." >> "$LOG_FILE"
  
  CURRENT_ERRORS=""
  
  # 1. Check container logs for errors
  for container in stairs-api stairs-web stairs-docs; do
    ERR=$(docker logs --tail 20 "$container" 2>&1 | grep -iE "error|failure|traceback|exception|unable to load")
    if [ ! -z "$ERR" ]; then
      CURRENT_ERRORS+="\nContainer $container Error:\n$ERR"
    fi
  done
  
  # 2. Check connectivity
  API_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/docs)
  if [ "$API_CODE" != "200" ]; then
    CURRENT_ERRORS+="\nAPI Connectivity Error: Status $API_CODE"
  fi
  
  DOCS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/stairs-docs/)
  if [ "$DOCS_CODE" != "200" ]; then
    CURRENT_ERRORS+="\nDocs Connectivity Error: Status $DOCS_CODE"
  fi

  # 3. If new errors are found, ask Gemini for help
  if [ ! -z "$CURRENT_ERRORS" ]; then
    ERROR_HASH=$(echo "$CURRENT_ERRORS" | md5sum | cut -d' ' -f1)
    
    if [ "$ERROR_HASH" != "$LAST_ERROR_HASH" ]; then
      echo "[$(date)] New error detected. Consulting Gemini..." >> "$LOG_FILE"
      echo -e "### New Error Detected at $(date)\n\n$CURRENT_ERRORS\n" >> "$AI_FIX_FILE"
      
      # Invoke Gemini CLI to analyze
      # Using --non-interactive or similar if supported, otherwise just a standard prompt
      gemini "I am an automated monitor. I detected these errors in the STAIRS project. Please analyze them and write a concise diagnosis and a suggested fix to this message. Errors: $CURRENT_ERRORS" >> "$AI_FIX_FILE" 2>&1
      
      echo -e "\n---\n" >> "$AI_FIX_FILE"
      LAST_ERROR_HASH="$ERROR_HASH"
    fi
  fi
  
  sleep 900
done
