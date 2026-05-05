use crate::api::{api_fetch, api_post, api_delete, create_client};
use crate::config::AppState;
use serde_json::Value;

fn base_url(state: &AppState) -> Result<(String, String), String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;
    let base = format!("http://{}:{}/api/v3", config.ip, config.radarr_port);
    let key = config.radarr_key.clone();
    Ok((base, key))
}

// Logic functions
pub async fn fetch_radarr_queue_logic(state: &AppState) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    if key.is_empty() { return Ok(Value::Null); }
    let client = create_client();
    api_fetch(&client, &format!("{}/queue?apikey={}&pageSize=50", base, key)).await
}

pub async fn fetch_radarr_movies_logic(state: &AppState) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    if key.is_empty() { return Ok(Value::Null); }
    let client = create_client();
    api_fetch(&client, &format!("{}/movie?apikey={}", base, key)).await
}

pub async fn fetch_radarr_history_logic(state: &AppState) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    if key.is_empty() { return Ok(Value::Null); }
    let client = create_client();
    api_fetch(&client, &format!("{}/history?pageSize=20&apikey={}", base, key)).await
}

pub async fn fetch_radarr_calendar_logic(state: &AppState, start: String, end: String) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    if key.is_empty() { return Ok(Value::Null); }
    let client = create_client();
    api_fetch(&client, &format!("{}/calendar?start={}&end={}&apikey={}", base, start, end, key)).await
}

pub async fn radarr_command_logic(state: &AppState, command_name: String, id: Option<i64>) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    if key.is_empty() { return Err("Missing Radarr API key".to_string()); }
    let client = create_client();
    let mut payload = serde_json::json!({ "name": command_name });
    if let Some(movie_id) = id { payload["movieId"] = serde_json::json!(movie_id); }
    api_post(&client, &format!("{}/command?apikey={}", base, key), payload).await
}

pub async fn search_radarr_movies_logic(state: &AppState, term: String) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    if key.is_empty() { return Err("Missing Radarr API key".to_string()); }
    let client = create_client();
    api_fetch(&client, &format!("{}/movie/lookup?term={}&apikey={}", base, urlencoding::encode(&term), key)).await
}

pub async fn add_radarr_movie_logic(state: &AppState, payload: Value) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    if key.is_empty() { return Err("Missing Radarr API key".to_string()); }
    let client = create_client();
    api_post(&client, &format!("{}/movie?apikey={}", base, key), payload).await
}

pub async fn fetch_radarr_rootfolder_logic(state: &AppState) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    if key.is_empty() { return Ok(Value::Null); }
    let client = create_client();
    api_fetch(&client, &format!("{}/rootfolder?apikey={}", base, key)).await
}

pub async fn fetch_radarr_qualityprofile_logic(state: &AppState) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    if key.is_empty() { return Ok(Value::Null); }
    let client = create_client();
    api_fetch(&client, &format!("{}/qualityprofile?apikey={}", base, key)).await
}

pub async fn fetch_radarr_movie_detail_logic(state: &AppState, id: i64) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    if key.is_empty() { return Ok(Value::Null); }
    let client = create_client();
    api_fetch(&client, &format!("{}/movie/{}?apikey={}", base, id, key)).await
}

pub async fn delete_radarr_movie_logic(state: &AppState, id: i64, delete_files: bool) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    let client = create_client();
    api_delete(&client, &format!("{}/movie/{}?deleteFiles={}&apikey={}", base, id, delete_files, key)).await
}

pub async fn delete_radarr_queue_item_logic(state: &AppState, id: i64, remove_from_client: bool, blocklist: bool) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    let client = create_client();
    api_delete(&client, &format!("{}/queue/{}?removeFromClient={}&blocklist={}&apikey={}", base, id, remove_from_client, blocklist, key)).await
}

pub async fn radarr_interactive_search_logic(state: &AppState, movie_id: i64) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    let client = create_client();
    api_fetch(&client, &format!("{}/release?movieId={}&apikey={}", base, movie_id, key)).await
}

pub async fn radarr_grab_release_logic(state: &AppState, guid: String, indexer_id: i64) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    let client = create_client();
    api_post(&client, &format!("{}/release?apikey={}", base, key), serde_json::json!({ "guid": guid, "indexerId": indexer_id })).await
}

pub async fn delete_radarr_movie_file_logic(state: &AppState, id: i64) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    let client = create_client();
    api_delete(&client, &format!("{}/moviefile/{}?apikey={}", base, id, key)).await
}

// Tauri commands
#[tauri::command] pub async fn fetch_radarr_queue(state: tauri::State<'_, AppState>) -> Result<Value, String> { fetch_radarr_queue_logic(&state).await }
#[tauri::command] pub async fn fetch_radarr_movies(state: tauri::State<'_, AppState>) -> Result<Value, String> { fetch_radarr_movies_logic(&state).await }
#[tauri::command] pub async fn fetch_radarr_history(state: tauri::State<'_, AppState>) -> Result<Value, String> { fetch_radarr_history_logic(&state).await }
#[tauri::command] pub async fn fetch_radarr_calendar(state: tauri::State<'_, AppState>, start: String, end: String) -> Result<Value, String> { fetch_radarr_calendar_logic(&state, start, end).await }
#[tauri::command] pub async fn radarr_command(state: tauri::State<'_, AppState>, command_name: String, id: Option<i64>) -> Result<Value, String> { radarr_command_logic(&state, command_name, id).await }
#[tauri::command] pub async fn search_radarr_movies(state: tauri::State<'_, AppState>, term: String) -> Result<Value, String> { search_radarr_movies_logic(&state, term).await }
#[tauri::command] pub async fn add_radarr_movie(state: tauri::State<'_, AppState>, payload: Value) -> Result<Value, String> { add_radarr_movie_logic(&state, payload).await }
#[tauri::command] pub async fn fetch_radarr_rootfolder(state: tauri::State<'_, AppState>) -> Result<Value, String> { fetch_radarr_rootfolder_logic(&state).await }
#[tauri::command] pub async fn fetch_radarr_qualityprofile(state: tauri::State<'_, AppState>) -> Result<Value, String> { fetch_radarr_qualityprofile_logic(&state).await }
#[tauri::command] pub async fn fetch_radarr_movie_detail(state: tauri::State<'_, AppState>, id: i64) -> Result<Value, String> { fetch_radarr_movie_detail_logic(&state, id).await }
#[tauri::command] pub async fn delete_radarr_movie(state: tauri::State<'_, AppState>, id: i64, delete_files: bool) -> Result<Value, String> { delete_radarr_movie_logic(&state, id, delete_files).await }
#[tauri::command] pub async fn delete_radarr_queue_item(state: tauri::State<'_, AppState>, id: i64, remove_from_client: bool, blocklist: bool) -> Result<Value, String> { delete_radarr_queue_item_logic(&state, id, remove_from_client, blocklist).await }
#[tauri::command] pub async fn radarr_interactive_search(state: tauri::State<'_, AppState>, movie_id: i64) -> Result<Value, String> { radarr_interactive_search_logic(&state, movie_id).await }
#[tauri::command] pub async fn radarr_grab_release(state: tauri::State<'_, AppState>, guid: String, indexer_id: i64) -> Result<Value, String> { radarr_grab_release_logic(&state, guid, indexer_id).await }
#[tauri::command] pub async fn delete_radarr_movie_file(state: tauri::State<'_, AppState>, id: i64) -> Result<Value, String> { delete_radarr_movie_file_logic(&state, id).await }
