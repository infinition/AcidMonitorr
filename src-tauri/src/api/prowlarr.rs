use crate::api::api_fetch;
use crate::api::create_client;
use crate::config::AppState;
use serde_json::Value;

pub async fn fetch_prowlarr_indexers_logic(state: &AppState) -> Result<Value, String> {
    let (url, key) = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        if config.prowlarr_key.is_empty() { return Ok(Value::Null); }
        let url = format!("http://{}:{}/api/v1/indexer?apikey={}", config.ip, config.prowlarr_port, config.prowlarr_key);
        (url, config.prowlarr_key.clone())
    };
    if key.is_empty() { return Ok(Value::Null); }
    let client = create_client();
    api_fetch(&client, &url).await
}

#[tauri::command]
pub async fn fetch_prowlarr_indexers(state: tauri::State<'_, AppState>) -> Result<Value, String> {
    fetch_prowlarr_indexers_logic(&state).await
}
