use crate::api::create_client;
use crate::config::AppState;
use serde_json::Value;
use urlencoding;

// Logic functions
pub async fn fetch_plex_sessions_logic(state: &AppState) -> Result<Value, String> {
    let url = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        if config.plex_token.is_empty() { return Ok(Value::Null); }
        format!("http://{}:{}/status/sessions?X-Plex-Token={}", config.ip, config.plex_port, config.plex_token)
    };
    let client = create_client();
    let response = client.get(&url).header("Accept", "application/json").send().await.map_err(|e| format!("Connection failed: {}", e))?;
    if !response.status().is_success() { return Err(format!("HTTP error: {}", response.status())); }
    response.json::<Value>().await.map_err(|e| format!("Parse error: {}", e))
}

pub async fn fetch_plex_recent_logic(state: &AppState) -> Result<Value, String> {
    let url = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        if config.plex_token.is_empty() { return Ok(Value::Null); }
        format!("http://{}:{}/library/recentlyAdded?X-Plex-Token={}&limit=10", config.ip, config.plex_port, config.plex_token)
    };
    let client = create_client();
    let response = client.get(&url).header("Accept", "application/json").send().await.map_err(|e| format!("Connection failed: {}", e))?;
    if !response.status().is_success() { return Err(format!("HTTP error: {}", response.status())); }
    response.json::<Value>().await.map_err(|e| format!("Parse error: {}", e))
}

pub async fn fetch_plex_watchlist_logic(state: &AppState) -> Result<Value, String> {
    let token = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        if config.plex_token.is_empty() { return Ok(Value::Null); }
        config.plex_token.clone()
    };
    let client = create_client();
    let response = client.get("https://metadata.provider.plex.tv/library/sections/watchlist/all").header("Accept", "application/json").header("X-Plex-Token", &token).send().await.map_err(|e| format!("Watchlist fetch failed: {}", e))?;
    if !response.status().is_success() { return Err(format!("HTTP error: {}", response.status())); }
    response.json::<Value>().await.map_err(|e| format!("Parse error: {}", e))
}

pub async fn plex_remove_from_watchlist_logic(state: &AppState, rating_key: String) -> Result<Value, String> {
    let token = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        config.plex_token.clone()
    };
    let client = create_client();
    let response = client.put(&format!("https://metadata.provider.plex.tv/actions/removeFromWatchlist?ratingKey={}", rating_key)).header("X-Plex-Token", &token).send().await.map_err(|e| format!("Remove failed: {}", e))?;
    if !response.status().is_success() { return Err(format!("HTTP error: {}", response.status())); }
    Ok(serde_json::json!({"success": true}))
}

pub async fn plex_clear_watchlist_logic(state: &AppState) -> Result<Value, String> {
    let token = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        if config.plex_token.is_empty() { return Err("Missing Plex token".to_string()); }
        config.plex_token.clone()
    };
    let client = create_client();
    let response = client.get("https://metadata.provider.plex.tv/library/sections/watchlist/all").header("Accept", "application/json").header("X-Plex-Token", &token).send().await.map_err(|e| format!("Watchlist fetch failed: {}", e))?;
    if !response.status().is_success() { return Err(format!("HTTP error: {}", response.status())); }
    let data: Value = response.json().await.map_err(|e| format!("Parse error: {}", e))?;
    let items = data.get("MediaContainer").and_then(|mc| mc.get("Metadata")).and_then(|m| m.as_array()).cloned().unwrap_or_default();
    let count = items.len();
    for item in &items {
        if let Some(key) = item.get("ratingKey").and_then(|k| k.as_str()) {
            let _ = client.put(&format!("https://metadata.provider.plex.tv/actions/removeFromWatchlist?ratingKey={}", key)).header("X-Plex-Token", &token).send().await;
        }
    }
    Ok(serde_json::json!({"removed": count}))
}

pub async fn fetch_disk_space_logic(state: &AppState) -> Result<Value, String> {
    let (sonarr_url, radarr_url) = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        let s = if !config.sonarr_key.is_empty() { Some(format!("http://{}:{}/api/v3/rootfolder?apikey={}", config.ip, config.sonarr_port, config.sonarr_key)) } else { None };
        let r = if !config.radarr_key.is_empty() { Some(format!("http://{}:{}/api/v3/rootfolder?apikey={}", config.ip, config.radarr_port, config.radarr_key)) } else { None };
        (s, r)
    };
    let client = create_client();
    let mut folders = Vec::new();
    if let Some(url) = sonarr_url {
        if let Ok(data) = crate::api::api_fetch(&client, &url).await {
            if let Some(arr) = data.as_array() {
                for f in arr {
                    folders.push(serde_json::json!({ "path": f.get("path").and_then(|v| v.as_str()).unwrap_or("-"), "freeSpace": f.get("freeSpace").and_then(|v| v.as_u64()).unwrap_or(0), "totalSpace": f.get("totalSpace").and_then(|v| v.as_u64()), "source": "Sonarr" }));
                }
            }
        }
    }
    if let Some(url) = radarr_url {
        if let Ok(data) = crate::api::api_fetch(&client, &url).await {
            if let Some(arr) = data.as_array() {
                for f in arr {
                    folders.push(serde_json::json!({ "path": f.get("path").and_then(|v| v.as_str()).unwrap_or("-"), "freeSpace": f.get("freeSpace").and_then(|v| v.as_u64()).unwrap_or(0), "totalSpace": f.get("totalSpace").and_then(|v| v.as_u64()), "source": "Radarr" }));
                }
            }
        }
    }
    Ok(Value::Array(folders))
}

pub async fn fetch_system_health_logic(state: &AppState) -> Result<Value, String> {
    let (sonarr_url, radarr_url) = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        let s = if !config.sonarr_key.is_empty() && config.enabled.sonarr { Some(format!("http://{}:{}/api/v3/health?apikey={}", config.ip, config.sonarr_port, config.sonarr_key)) } else { None };
        let r = if !config.radarr_key.is_empty() && config.enabled.radarr { Some(format!("http://{}:{}/api/v3/health?apikey={}", config.ip, config.radarr_port, config.radarr_key)) } else { None };
        (s, r)
    };
    let client = create_client();
    let mut health = Vec::new();
    if let Some(url) = sonarr_url {
        if let Ok(data) = crate::api::api_fetch(&client, &url).await {
            if let Some(arr) = data.as_array() {
                for h in arr {
                    health.push(serde_json::json!({ "source": "Sonarr", "type": h.get("type").and_then(|v| v.as_str()).unwrap_or("unknown"), "message": h.get("message").and_then(|v| v.as_str()).unwrap_or(""), "wikiUrl": h.get("wikiUrl").and_then(|v| v.as_str()).unwrap_or("") }));
                }
            }
        }
    }
    if let Some(url) = radarr_url {
        if let Ok(data) = crate::api::api_fetch(&client, &url).await {
            if let Some(arr) = data.as_array() {
                for h in arr {
                    health.push(serde_json::json!({ "source": "Radarr", "type": h.get("type").and_then(|v| v.as_str()).unwrap_or("unknown"), "message": h.get("message").and_then(|v| v.as_str()).unwrap_or(""), "wikiUrl": h.get("wikiUrl").and_then(|v| v.as_str()).unwrap_or("") }));
                }
            }
        }
    }
    Ok(Value::Array(health))
}

pub async fn plex_search_logic(state: &AppState, query: String) -> Result<Value, String> {
    let url = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        if config.plex_token.is_empty() { return Ok(Value::Null); }
        format!("http://{}:{}/hubs/search?query={}&limit=20&X-Plex-Token={}", config.ip, config.plex_port, urlencoding::encode(&query), config.plex_token)
    };
    let client = create_client();
    let response = client.get(&url).header("Accept", "application/json").send().await.map_err(|e| format!("Search failed: {}", e))?;
    if !response.status().is_success() { return Err(format!("HTTP {}", response.status())); }
    response.json::<Value>().await.map_err(|e| format!("Parse error: {}", e))
}

pub async fn fetch_plex_libraries_logic(state: &AppState) -> Result<Value, String> {
    let url = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        if config.plex_token.is_empty() { return Ok(Value::Null); }
        format!("http://{}:{}/library/sections?X-Plex-Token={}", config.ip, config.plex_port, config.plex_token)
    };
    let client = create_client();
    let response = client.get(&url).header("Accept", "application/json").send().await.map_err(|e| format!("Failed: {}", e))?;
    if !response.status().is_success() { return Err(format!("HTTP {}", response.status())); }
    response.json::<Value>().await.map_err(|e| format!("Parse: {}", e))
}

pub async fn fetch_plex_metadata_logic(state: &AppState, rating_key: String) -> Result<Value, String> {
    let url = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        if config.plex_token.is_empty() { return Ok(Value::Null); }
        format!("http://{}:{}/library/metadata/{}?X-Plex-Token={}", config.ip, config.plex_port, rating_key, config.plex_token)
    };
    let client = create_client();
    let response = client.get(&url).header("Accept", "application/json").send().await.map_err(|e| format!("Failed: {}", e))?;
    if !response.status().is_success() { return Err(format!("HTTP {}", response.status())); }
    response.json::<Value>().await.map_err(|e| format!("Parse: {}", e))
}

pub async fn fetch_plex_history_logic(state: &AppState, limit: Option<i64>) -> Result<Value, String> {
    let url = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        if config.plex_token.is_empty() { return Ok(Value::Null); }
        let lim = limit.unwrap_or(50);
        format!("http://{}:{}/status/sessions/history/all?X-Plex-Token={}&X-Plex-Container-Size={}", config.ip, config.plex_port, config.plex_token, lim)
    };
    let client = create_client();
    let response = client.get(&url).header("Accept", "application/json").send().await.map_err(|e| format!("Failed: {}", e))?;
    if !response.status().is_success() { return Err(format!("HTTP {}", response.status())); }
    response.json::<Value>().await.map_err(|e| format!("Parse: {}", e))
}

pub async fn fetch_plex_library_items_logic(state: &AppState, section_id: String, start: Option<i64>, size: Option<i64>) -> Result<Value, String> {
    let url = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        if config.plex_token.is_empty() { return Ok(Value::Null); }
        let s = start.unwrap_or(0);
        let sz = size.unwrap_or(50);
        format!("http://{}:{}/library/sections/{}/all?X-Plex-Token={}&X-Plex-Container-Start={}&X-Plex-Container-Size={}", config.ip, config.plex_port, section_id, config.plex_token, s, sz)
    };
    let client = create_client();
    let response = client.get(&url).header("Accept", "application/json").send().await.map_err(|e| format!("Failed: {}", e))?;
    if !response.status().is_success() { return Err(format!("HTTP {}", response.status())); }
    response.json::<Value>().await.map_err(|e| format!("Parse: {}", e))
}

// Tauri commands (wrappers)
#[tauri::command] pub async fn fetch_plex_sessions(state: tauri::State<'_, AppState>) -> Result<Value, String> { fetch_plex_sessions_logic(&state).await }
#[tauri::command] pub async fn fetch_plex_recent(state: tauri::State<'_, AppState>) -> Result<Value, String> { fetch_plex_recent_logic(&state).await }
#[tauri::command] pub async fn fetch_plex_watchlist(state: tauri::State<'_, AppState>) -> Result<Value, String> { fetch_plex_watchlist_logic(&state).await }
#[tauri::command] pub async fn plex_remove_from_watchlist(state: tauri::State<'_, AppState>, rating_key: String) -> Result<Value, String> { plex_remove_from_watchlist_logic(&state, rating_key).await }
#[tauri::command] pub async fn plex_clear_watchlist(state: tauri::State<'_, AppState>) -> Result<Value, String> { plex_clear_watchlist_logic(&state).await }
#[tauri::command] pub async fn fetch_disk_space(state: tauri::State<'_, AppState>) -> Result<Value, String> { fetch_disk_space_logic(&state).await }
#[tauri::command] pub async fn fetch_system_health(state: tauri::State<'_, AppState>) -> Result<Value, String> { fetch_system_health_logic(&state).await }
#[tauri::command] pub async fn plex_search(state: tauri::State<'_, AppState>, query: String) -> Result<Value, String> { plex_search_logic(&state, query).await }
#[tauri::command] pub async fn fetch_plex_libraries(state: tauri::State<'_, AppState>) -> Result<Value, String> { fetch_plex_libraries_logic(&state).await }
#[tauri::command] pub async fn fetch_plex_metadata(state: tauri::State<'_, AppState>, rating_key: String) -> Result<Value, String> { fetch_plex_metadata_logic(&state, rating_key).await }
#[tauri::command] pub async fn fetch_plex_history(state: tauri::State<'_, AppState>, limit: Option<i64>) -> Result<Value, String> { fetch_plex_history_logic(&state, limit).await }
#[tauri::command] pub async fn fetch_plex_library_items(state: tauri::State<'_, AppState>, section_id: String, start: Option<i64>, size: Option<i64>) -> Result<Value, String> { fetch_plex_library_items_logic(&state, section_id, start, size).await }
