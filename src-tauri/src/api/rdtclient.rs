use crate::api::api_fetch;
use crate::api::create_client;
use crate::config::AppState;
use serde_json::Value;

pub async fn fetch_rdtclient_torrents_logic(state: &AppState) -> Result<Value, String> {
    let url = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        format!("http://{}:{}/api/torrents", config.ip, config.rdtclient_port)
    };
    let client = create_client();
    api_fetch(&client, &url).await
}

#[tauri::command]
pub async fn fetch_rdtclient_torrents(state: tauri::State<'_, AppState>) -> Result<Value, String> {
    fetch_rdtclient_torrents_logic(&state).await
}
