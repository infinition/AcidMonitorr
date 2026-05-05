pub mod sonarr;
pub mod radarr;
pub mod plex;
pub mod prowlarr;
pub mod jackett;
pub mod rdtclient;
pub mod flaresolverr;

use reqwest::Client;
use std::time::Duration;

pub fn create_client() -> Client {
    Client::builder()
        .timeout(Duration::from_secs(10))
        .danger_accept_invalid_certs(true)
        .build()
        .unwrap_or_default()
}

pub async fn api_fetch(client: &Client, url: &str) -> Result<serde_json::Value, String> {
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }

    response
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("Parse error: {}", e))
}

pub async fn api_post(
    client: &Client,
    url: &str,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let response = client
        .post(url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body_text = response.text().await.unwrap_or_default();
        return Err(format!("HTTP error {}: {}", status, body_text));
    }

    response
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("Parse error: {}", e))
}

pub async fn api_delete(client: &Client, url: &str) -> Result<serde_json::Value, String> {
    let response = client
        .delete(url)
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body_text = response.text().await.unwrap_or_default();
        return Err(format!("HTTP error {}: {}", status, body_text));
    }

    // DELETE often returns empty body
    let text = response.text().await.unwrap_or_default();
    if text.is_empty() {
        Ok(serde_json::json!({"success": true}))
    } else {
        serde_json::from_str(&text).unwrap_or(Ok(serde_json::json!({"success": true})))
    }
}

pub async fn api_put(
    client: &Client,
    url: &str,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let response = client
        .put(url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body_text = response.text().await.unwrap_or_default();
        return Err(format!("HTTP error {}: {}", status, body_text));
    }

    response
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("Parse error: {}", e))
}

/// Proxy an image URL: fetches raw bytes and returns base64 data URI.
/// This avoids CORS/CSP issues in the Tauri webview.
#[tauri::command]
pub async fn proxy_image(url: String) -> Result<String, String> {
    if url.is_empty() {
        return Err("Empty URL".to_string());
    }
    let client = Client::builder()
        .timeout(Duration::from_secs(15))
        .danger_accept_invalid_certs(true)
        .build()
        .unwrap_or_default();

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Image fetch failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status()));
    }

    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Read error: {}", e))?;

    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", content_type, b64))
}
