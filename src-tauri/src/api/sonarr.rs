use crate::api::{api_fetch, api_post, api_delete, api_put, create_client};
use crate::config::AppState;
use serde_json::Value;

fn base_url(state: &AppState) -> Result<(String, String), String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;
    let base = format!("http://{}:{}/api/v3", config.ip, config.sonarr_port);
    let key = config.sonarr_key.clone();
    Ok((base, key))
}

// Logic functions (shared between Tauri and Web)
pub async fn fetch_sonarr_queue_logic(state: &AppState) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    if key.is_empty() { return Ok(Value::Null); }
    let client = create_client();
    api_fetch(&client, &format!("{}/queue?apikey={}&pageSize=50", base, key)).await
}

pub async fn fetch_sonarr_series_logic(state: &AppState) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    if key.is_empty() { return Ok(Value::Null); }
    let client = create_client();
    api_fetch(&client, &format!("{}/series?apikey={}", base, key)).await
}

pub async fn fetch_sonarr_history_logic(state: &AppState) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    if key.is_empty() { return Ok(Value::Null); }
    let client = create_client();
    api_fetch(&client, &format!("{}/history?pageSize=20&apikey={}", base, key)).await
}

pub async fn fetch_sonarr_calendar_logic(state: &AppState, start: String, end: String) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    if key.is_empty() { return Ok(Value::Null); }
    let client = create_client();
    api_fetch(&client, &format!("{}/calendar?start={}&end={}&apikey={}", base, start, end, key)).await
}

pub async fn sonarr_command_logic(state: &AppState, command_name: String, id: Option<i64>) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    if key.is_empty() { return Err("Missing Sonarr API key".to_string()); }
    let client = create_client();
    let mut payload = serde_json::json!({ "name": command_name });
    if let Some(series_id) = id { payload["seriesId"] = serde_json::json!(series_id); }
    api_post(&client, &format!("{}/command?apikey={}", base, key), payload).await
}

pub async fn search_sonarr_series_logic(state: &AppState, term: String) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    if key.is_empty() { return Err("Missing Sonarr API key".to_string()); }
    let client = create_client();
    api_fetch(&client, &format!("{}/series/lookup?term={}&apikey={}", base, urlencoding::encode(&term), key)).await
}

pub async fn add_sonarr_series_logic(state: &AppState, payload: Value) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    if key.is_empty() { return Err("Missing Sonarr API key".to_string()); }
    let client = create_client();
    api_post(&client, &format!("{}/series?apikey={}", base, key), payload).await
}

pub async fn fetch_sonarr_rootfolder_logic(state: &AppState) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    if key.is_empty() { return Ok(Value::Null); }
    let client = create_client();
    api_fetch(&client, &format!("{}/rootfolder?apikey={}", base, key)).await
}

pub async fn fetch_sonarr_qualityprofile_logic(state: &AppState) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    if key.is_empty() { return Ok(Value::Null); }
    let client = create_client();
    api_fetch(&client, &format!("{}/qualityprofile?apikey={}", base, key)).await
}

pub async fn fetch_sonarr_series_detail_logic(state: &AppState, id: i64) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    if key.is_empty() { return Ok(Value::Null); }
    let client = create_client();
    let series = api_fetch(&client, &format!("{}/series/{}?apikey={}", base, id, key)).await?;
    let episodes = api_fetch(&client, &format!("{}/episode?seriesId={}&apikey={}", base, id, key)).await.unwrap_or(Value::Array(vec![]));
    let episode_files = api_fetch(&client, &format!("{}/episodefile?seriesId={}&apikey={}", base, id, key)).await.unwrap_or(Value::Array(vec![]));
    Ok(serde_json::json!({ "series": series, "episodes": episodes, "episodeFiles": episode_files }))
}

pub async fn fetch_sonarr_episode_files_logic(state: &AppState, series_id: i64) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    if key.is_empty() { return Ok(Value::Null); }
    let client = create_client();
    api_fetch(&client, &format!("{}/episodefile?seriesId={}&apikey={}", base, series_id, key)).await
}

pub async fn sonarr_episode_search_logic(state: &AppState, episode_ids: Vec<i64>) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    let client = create_client();
    api_post(&client, &format!("{}/command?apikey={}", base, key), serde_json::json!({ "name": "EpisodeSearch", "episodeIds": episode_ids })).await
}

pub async fn sonarr_season_search_logic(state: &AppState, series_id: i64, season_number: i64) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    let client = create_client();
    api_post(&client, &format!("{}/command?apikey={}", base, key), serde_json::json!({ "name": "SeasonSearch", "seriesId": series_id, "seasonNumber": season_number })).await
}

pub async fn delete_sonarr_series_logic(state: &AppState, id: i64, delete_files: bool) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    let client = create_client();
    api_delete(&client, &format!("{}/series/{}?deleteFiles={}&apikey={}", base, id, delete_files, key)).await
}

pub async fn delete_sonarr_queue_item_logic(state: &AppState, id: i64, remove_from_client: bool, blocklist: bool) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    let client = create_client();
    api_delete(&client, &format!("{}/queue/{}?removeFromClient={}&blocklist={}&apikey={}", base, id, remove_from_client, blocklist, key)).await
}

pub async fn sonarr_toggle_episode_monitored_logic(state: &AppState, episode_id: i64, monitored: bool) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    let client = create_client();
    api_put(&client, &format!("{}/episode/{}?apikey={}", base, episode_id, key), serde_json::json!({ "monitored": monitored })).await
}

pub async fn sonarr_interactive_search_logic(state: &AppState, episode_id: Option<i64>, series_id: Option<i64>, season_number: Option<i64>) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    let client = create_client();
    let mut url = format!("{}/release?apikey={}", base, key);
    if let Some(eid) = episode_id { url = format!("{}&episodeId={}", url, eid); }
    if let Some(sid) = series_id { url = format!("{}&seriesId={}", url, sid); }
    if let Some(sn) = season_number { url = format!("{}&seasonNumber={}", url, sn); }
    api_fetch(&client, &url).await
}

pub async fn sonarr_grab_release_logic(state: &AppState, guid: String, indexer_id: i64) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    let client = create_client();
    api_post(&client, &format!("{}/release?apikey={}", base, key), serde_json::json!({ "guid": guid, "indexerId": indexer_id })).await
}

pub async fn delete_sonarr_episode_file_logic(state: &AppState, id: i64) -> Result<Value, String> {
    let (base, key) = base_url(state)?;
    let client = create_client();
    api_delete(&client, &format!("{}/episodefile/{}?apikey={}", base, id, key)).await
}

// Tauri commands (wrappers)
#[tauri::command] pub async fn fetch_sonarr_queue(state: tauri::State<'_, AppState>) -> Result<Value, String> { fetch_sonarr_queue_logic(&state).await }
#[tauri::command] pub async fn fetch_sonarr_series(state: tauri::State<'_, AppState>) -> Result<Value, String> { fetch_sonarr_series_logic(&state).await }
#[tauri::command] pub async fn fetch_sonarr_history(state: tauri::State<'_, AppState>) -> Result<Value, String> { fetch_sonarr_history_logic(&state).await }
#[tauri::command] pub async fn fetch_sonarr_calendar(state: tauri::State<'_, AppState>, start: String, end: String) -> Result<Value, String> { fetch_sonarr_calendar_logic(&state, start, end).await }
#[tauri::command] pub async fn sonarr_command(state: tauri::State<'_, AppState>, command_name: String, id: Option<i64>) -> Result<Value, String> { sonarr_command_logic(&state, command_name, id).await }
#[tauri::command] pub async fn search_sonarr_series(state: tauri::State<'_, AppState>, term: String) -> Result<Value, String> { search_sonarr_series_logic(&state, term).await }
#[tauri::command] pub async fn add_sonarr_series(state: tauri::State<'_, AppState>, payload: Value) -> Result<Value, String> { add_sonarr_series_logic(&state, payload).await }
#[tauri::command] pub async fn fetch_sonarr_rootfolder(state: tauri::State<'_, AppState>) -> Result<Value, String> { fetch_sonarr_rootfolder_logic(&state).await }
#[tauri::command] pub async fn fetch_sonarr_qualityprofile(state: tauri::State<'_, AppState>) -> Result<Value, String> { fetch_sonarr_qualityprofile_logic(&state).await }
#[tauri::command] pub async fn fetch_sonarr_series_detail(state: tauri::State<'_, AppState>, id: i64) -> Result<Value, String> { fetch_sonarr_series_detail_logic(&state, id).await }
#[tauri::command] pub async fn fetch_sonarr_episode_files(state: tauri::State<'_, AppState>, series_id: i64) -> Result<Value, String> { fetch_sonarr_episode_files_logic(&state, series_id).await }
#[tauri::command] pub async fn sonarr_episode_search(state: tauri::State<'_, AppState>, episode_ids: Vec<i64>) -> Result<Value, String> { sonarr_episode_search_logic(&state, episode_ids).await }
#[tauri::command] pub async fn sonarr_season_search(state: tauri::State<'_, AppState>, series_id: i64, season_number: i64) -> Result<Value, String> { sonarr_season_search_logic(&state, series_id, season_number).await }
#[tauri::command] pub async fn delete_sonarr_series(state: tauri::State<'_, AppState>, id: i64, delete_files: bool) -> Result<Value, String> { delete_sonarr_series_logic(&state, id, delete_files).await }
#[tauri::command] pub async fn delete_sonarr_queue_item(state: tauri::State<'_, AppState>, id: i64, remove_from_client: bool, blocklist: bool) -> Result<Value, String> { delete_sonarr_queue_item_logic(&state, id, remove_from_client, blocklist).await }
#[tauri::command] pub async fn sonarr_toggle_episode_monitored(state: tauri::State<'_, AppState>, episode_id: i64, monitored: bool) -> Result<Value, String> { sonarr_toggle_episode_monitored_logic(&state, episode_id, monitored).await }
#[tauri::command] pub async fn sonarr_interactive_search(state: tauri::State<'_, AppState>, episode_id: Option<i64>, series_id: Option<i64>, season_number: Option<i64>) -> Result<Value, String> { sonarr_interactive_search_logic(&state, episode_id, series_id, season_number).await }
#[tauri::command] pub async fn sonarr_grab_release(state: tauri::State<'_, AppState>, guid: String, indexer_id: i64) -> Result<Value, String> { sonarr_grab_release_logic(&state, guid, indexer_id).await }
#[tauri::command] pub async fn delete_sonarr_episode_file(state: tauri::State<'_, AppState>, id: i64) -> Result<Value, String> { delete_sonarr_episode_file_logic(&state, id).await }
