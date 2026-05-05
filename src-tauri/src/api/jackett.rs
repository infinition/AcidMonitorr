use crate::api::create_client;
use crate::config::AppState;
use serde_json::Value;

pub async fn fetch_jackett_indexers_logic(state: &AppState) -> Result<Value, String> {
    let (url, is_torznab) = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        if config.jackett_key.is_empty() { return Ok(Value::Null); }
        let url = format!("http://{}:{}/api/v2.0/indexers/all/results/torznab/api?apikey={}&t=indexers", config.ip, config.jackett_port, config.jackett_key);
        (url, true)
    };
    let client = create_client();
    if is_torznab {
        let response = client.get(&url).send().await.map_err(|e| format!("Connection failed: {}", e))?;
        if !response.status().is_success() { return Err(format!("HTTP error: {}", response.status())); }
        let xml_text = response.text().await.map_err(|e| format!("Read error: {}", e))?;
        let mut indexers = Vec::new();
        for segment in xml_text.split("<indexer ") {
            if !segment.contains("configured=") { continue; }
            let title = extract_xml_value(segment, "title");
            let id = extract_xml_attr(segment, "id");
            let configured = extract_xml_attr(segment, "configured").map(|c| c == "true").unwrap_or(false);
            if let Some(name) = title {
                indexers.push(serde_json::json!({ "name": name, "id": id.unwrap_or_default(), "enable": configured, "protocol": "Torznab", "source": "Jackett" }));
            }
        }
        Ok(Value::Array(indexers))
    } else { Ok(Value::Null) }
}

#[tauri::command]
pub async fn fetch_jackett_indexers(state: tauri::State<'_, AppState>) -> Result<Value, String> {
    fetch_jackett_indexers_logic(&state).await
}

fn extract_xml_value(segment: &str, tag: &str) -> Option<String> {
    let open = format!("<{}>", tag);
    let close = format!("</{}>", tag);
    if let Some(start) = segment.find(&open) {
        let start = start + open.len();
        if let Some(end) = segment[start..].find(&close) { return Some(segment[start..start + end].to_string()); }
    }
    None
}

fn extract_xml_attr(segment: &str, attr: &str) -> Option<String> {
    let pattern = format!("{}=\"", attr);
    if let Some(start) = segment.find(&pattern) {
        let start = start + pattern.len();
        if let Some(end) = segment[start..].find('"') { return Some(segment[start..start + end].to_string()); }
    }
    None
}
