use crate::api::create_client;
use crate::config::AppState;
use serde_json::Value;

pub async fn fetch_flaresolverr_status_logic(state: &AppState) -> Result<Value, String> {
    let url = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        format!("http://{}:{}", config.ip, config.flaresolverr_port)
    };
    let client = create_client();
    let response = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if response.status().is_success() {
        Ok(serde_json::json!({ "status": "online" }))
    } else {
        Err("Offline".to_string())
    }
}

#[tauri::command]
pub async fn fetch_flaresolverr_status(state: tauri::State<'_, AppState>) -> Result<Value, String> {
    fetch_flaresolverr_status_logic(&state).await
}
